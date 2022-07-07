// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();

// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;

// 암호화된 비밀번호를 검증하기 위해
const passwordCrypto = require('../util/passwordCrypto');

// jwt 사용하기 위해!
const jwt = require('jsonwebtoken');

// 설정파일
const config = require('../config/config');

// redis를 사용하기 위해
const redis = require('redis');

// redis 클라이언트
const client = redis.createClient(6379,'127.0.0.1');

// 설정파일
const jwtToken = require('../util/jwtToken');

// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

/* 
    역할: 로그인을 수행한다.
    input: req, res
    output: 없음
*/
router.post('/login', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 사용자가 보낸 로그인 아이디
    const login_id = hashmap.get("login_id");
    // 사용자가 보낸 비밀번호
    const password = hashmap.get("password");

    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'select login_pw, salt, user_id, nick_name from user_info where login_id = ?';
    let datas = [login_id];
    
    // 저장!
    await maria.query(queryStr, datas, async function(err, rows, fields){
        if(!err){
            // db에서 가져온 login_id
            const login_pw = rows[0].login_pw;
            
            // id가 존재하지 않는다면
            if(login_pw == null) {
                res.send("not exist");    
            } else {
                const salt = rows[0].salt;
                const result = passwordCrypto.verifyPassword(password, salt, login_pw);
                
                // 일치하는 비밀번호가 있다면 토큰 생성
                result.then(async (value) => {
                    const user_id = rows[0].user_id;
                    const nick_name = rows[0].nick_name;

                    // 1. refreshToken 토큰 생성
                    const refreshToken = await jwt.sign({},
                        config.jwt_secretKey, {
                        expiresIn: '14d',
                        issuer: 'bubbly'
                    });

                    // 2. redis에 refreshToken 저장
                    await client.connect();
                    const key = "refreshToken" + user_id;
             
                    await client.set(key, refreshToken);
                
                    //const savedToken = await client.get(key);
                    //console.log("refreshToken: " + savedToken);
            
                    // 14일 후에 자동삭제
                    await client.expire(key, 60 * 60 * 24 * 14);
            
                    await client.quit();

                    // 3. accessToken 생성
                    // 토큰 세팅
                    const accessToken = await jwt.sign({ user_id, nick_name },
                        config.jwt_secretKey, {
                        expiresIn: '1h',
                        issuer: 'bubbly'
                    });

                    const token = {"accessToken" : accessToken, "refreshToken" : refreshToken};

                    res.send(JSON.stringify(token));
                }).catch((error) => {
                    console.log(error);
                    res.send("fail");
                    throw error;
                });
            }
        } else {
            console.log(err);
            res.send("fail");
        }
    });
})

// 로그아웃
router.post('/logout', async function(req,res, next) {
    await parseFormData(req);
    const user_id = hashmap.get("user_id");

    // redis에서 refreshToken 삭제
    await client.connect();
    const key = "refreshToken" + user_id;

    await client.del(key);

    await client.quit();

    res.send("logout success")
});

// 인가 테스트
router.get('/authorization', async function(req,res, next) {
    jwtToken(req,res,next);
});

// 게시물번호로 댓글 정보를 조회한다.
router.get('/logout', async function(req,res) {
    // 쿼리문
    let sql = "   select  c.post_id "
             +"         , c.comment_writer_id "
             +"         , c.comment_depth "
             +"         , c.comment_contents "
             +"         , c.cre_datetime_comment "
             +"         , c.upd_datetime_comment "
             +"         , ui.nick_name "
             +"         , ui.profile_file_name "
             +"  from comment c "
             +"  inner join user_info ui on comment_writer_id = ui.user_id "
            + "  where c.post_id = " + req.param("post_id");

    console.log(sql);

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            console.log(result);
            res.send(result);
        }
    });
});

// 사용자 아이디로 댓글 정보를 조회한다.
router.get('/selectCommentUsingCommentWriterId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =        "   select  c.post_id "
                    +"         , c.comment_writer_id "
                    +"         , c.comment_depth "
                    +"         , c.comment_contents "
                    +"         , c.cre_datetime_comment "
                    +"         , c.upd_datetime_comment "
                    +"         , ui.nick_name "
                    +"         , ui.profile_file_name "
                    +"  from comment c "
                    +"  inner join user_info ui on comment_writer_id = ui.user_id "
                    +"  where c.comment_writer_id = " + req.param("comment_writer_id");
    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            console.log(result);
            res.send(result);
        }
    });
});

// 댓글을 수정한다.
router.post('/updateComment', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);
    
    let sqlUpdate = 'update comment SET comment_contents = ?, upd_datetime_comment = ? WHERE comment_id = ?';
            
    let datas = [hashmap.get("comment_contents"), time.timeToKr(), hashmap.get("comment_id")];

    maria.query(sqlUpdate, datas, function (err, result) {
        if (err) {
            console.log(sqlUpdate);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlUpdate);
            console.log(result);
            // 성공한 경우 
            res.send("success");
        }
    })
})

// 게시물 정보를 삭제한다.
router.post('/deleteComment', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 데이터베이스의 게시물 정보를 삭제한다.
    let sqlDelete = 'DELETE FROM comment WHERE comment_id = ' + hashmap.get("comment_id");
    maria.query(sqlDelete, function (err, result) {
        if (err) {
            console.log(sqlDelete);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlDelete);
            console.log(result);
            res.send("success");
        }
    });
});


/* form 데이터를 파싱한다(텍스트만 있다).
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseFormData(req){
    return new Promise( (resolve)=>{
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();

        // 데이터 스트림 만듬
        req.pipe(req.busboy);

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            hashmap.set(name, value);
            console.log("value: " + name , hashmap.get(name));
        });

        req.busboy.on("finish", function() {
            return resolve();            
        });
    })
  }