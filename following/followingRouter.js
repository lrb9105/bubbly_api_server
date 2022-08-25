const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

/* 
    역할: 팔로위를 팔로우 한다.
    input: req, res
    output: 없음
*/
router.post('/createFollowing', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);
    
    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'insert into following (followee_id, follower_id, cre_datetime_following) values (?)';
    let datas = [hashmap.get("followee_id"), hashmap.get("follower_id"), time.timeToKr()];
    
    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success");
        } else {
            console.log("실패");
            console.log(err);
            res.send("fail");
        }
    });
})

// 나를 팔로우한 사람들을 조회한다.
router.get('/selectFollowerList', async function(req,res) {
    // 쿼리문
    let sql = "   select  f.follower_id "
             +"         , ui.nick_name "
             +"         , ui.profile_file_name "
             +"         , ui.login_id "
             +"     from following f "
             +"     inner join user_info ui on f.follower_id= ui.user_id "
             +"     where f.followee_id = " + req.param("followee_id");

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

// 내가 팔로우한 사람들을 조회한다.
router.get('/selectFolloweeList', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =        "   select  f.followee_id "
                    +"         , ui.nick_name "
                    +"         , ui.profile_file_name "
                    +"         , ui.login_id "
                    +"     from following f "
                    +"     inner join user_info ui on f.followee_id= ui.user_id "
                    +"     where f.follower_id = " + req.param("follower_id");
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


// 팔로잉을 취소한다(팔로워가 팔로우를 삭제하는 것!!)
router.post('/deleteFollowing', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 데이터베이스의 게시물 정보를 삭제한다.
    let sqlDelete = 'delete FROM following where followee_id = ? and follower_id = ?';
    let datas = [hashmap.get("followee_id"), hashmap.get("follower_id")];
    maria.query(sqlDelete, datas, function (err, result) {
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