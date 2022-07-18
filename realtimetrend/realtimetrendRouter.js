const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');
const mention = require('../post/mention');

// redis를 사용하기 위해
const redis = require('redis');

// redis 클라이언트
const client = redis.createClient(6379,'127.0.0.1');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

// 멘션된 사용자 user_id를 저장하는 리스트
let arr;

/*
    역할: 검색어 저장
    input: req, res
    output: 없음
*/
router.post('/createSerarchText', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'insert into search_data_save (searcher_id, search_text, cre_datetime_search) values (?)';
    let datas = [hashmap.get("searcher_id"), hashmap.get("search_text"), time.timeToKr()];

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

// 실시간 트렌드 조회
router.get('/selectRealTimeTrends', async function(req,res) {
    // 사용자가 보낸 현재시간 'yyyy-MM-dd HH:mm 형태'
    let startTime = req.param("current_time");
    const idx = startTime.indexOf(":");
    const startHour = startTime.substring(idx - 2,idx);

    // 시작시간
    startTime = startTime.substring(0,idx + 1);
    startTime += "00";
    // 레디스에 저장할 키값
    let redisKey = startTime.replace(" ", "-");
    
    let tDate = new Date(startTime);

    // 한시간 더하기
    tDate.setHours(tDate.getHours() + 1)
    let year = tDate.getFullYear();
    let month = ('0' + (tDate.getMonth() + 1)).slice(-2);
    let day = ('0' + tDate.getDate()).slice(-2);
    let hours = ('0' + tDate.getHours()).slice(-2); 
    let minutes = ('0' + tDate.getMinutes()).slice(-2);
    
    let endTime = year + '-' + month  + '-' + day + " " +  hours + ':' + minutes;

    // 레디스에 저장할 데이터 만료시간
    var unixEndTimestamp = Math.floor(new Date(endTime + ":00.000").getTime()/1000);

    // 레디스 클라이언트 연결
    await client.connect();

    // 레디스에 실시간 트렌드 정보 저장되어있는지 확인
    const key = "realtimetrend" + redisKey;
                 
    let realTimeTrendInfo = await client.get(key);

    // 레디스에 저장되어있는 데이터가 없다면 db에서 조회
    if(realTimeTrendInfo == null) {
        // 쿼리문
        let sql = " select name, sum(cnt) cnt "
                + " from ( "
                        + " select hashtag_name name, count(*) cnt "
                        + " from hashtag "
                        + " where cre_datetime_hashtag >= ? and cre_datetime_hashtag < ? "
                        + " group by hashtag_name "
                        + " union all "
                        + " select search_text name, count(*) cnt "
                        + " from search_data_save "
                        + " where cre_datetime_search >= ? and cre_datetime_search < ? "
                        + " group by search_text "
                        + " ) as t1 "
            + " group by name "
            + " order by cnt desc "
            + " limit 10 ";

            const datas = [startTime, endTime, startTime, endTime];

            await maria.query(sql, datas, async function (err, result) {
                if (err) {
                    console.log(sql);
                    throw err;
                } else {
                    console.log(sql);
                    console.log(result);

                    // 레디스에 정보 저장 - 종료시간에 만료되도록
                    resultJson = JSON.stringify(result);

                    await client.set(key, resultJson,'EXAT',unixEndTimestamp);
                    await client.quit();

                    console.log("maria에서 조회");
                    res.send(result);
                }
            });
    } else {
        await client.quit();
        
        res.send(JSON.parse(realTimeTrendInfo));
        console.log("redis에서 조회");
    }
});

// 사용자 아이디로 댓글 정보를 조회한다.
router.get('/selectCommentUsingCommentWriterId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =        "   select  c.post_id "
                    +"         , c.comment_writer_id "
                    +"         , c.comment_depth "
                    +"         , c.comment_contents "
                    +"         , ui.nick_name "
                    +"         , ui.profile_file_name "
                    + "        , c.mentioned_user_list "
                    +"  from comment c "
                    +"  inner join user_info ui on comment_writer_id = ui.user_id "
                    +"  where c.comment_writer_id = " + req.param("comment_writer_id");
    await maria.query(sql, async function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            let newResult = await parseMentionedUserList(result);
            console.log(newResult);

            res.send(newResult);
        }
    });
});

// 댓글을 수정한다.
router.post('/updateComment', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 멘션(@사용자명 -> 사용자 아이디) 파싱
    let mentionedUserIdStr = await mention(arr);

    if(mentionedUserIdStr == "") {
        mentionedUserIdStr = null;
    }
    console.log("mentionedUserIdStr: " + mentionedUserIdStr);

    let sqlUpdate = 'update comment SET comment_contents = ?, upd_datetime_comment = ?, mentioned_user_list = ? WHERE comment_id = ?';

    let datas = [hashmap.get("comment_contents"), time.timeToKr(), mentionedUserIdStr, hashmap.get("comment_id")];

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
        arr = new Array();

        // 데이터 스트림 만듬
        req.pipe(req.busboy);

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            if(name.includes("mentioned_user_id_list[]")) {
                arr.push(value);
            } else {
                hashmap.set(name, value);
                console.log("value: " + name , hashmap.get(name));
            }
        });

        req.busboy.on("finish", function() {
            return resolve();
        });
    })
  }

  async function parseMentionedUserList(result) {
    for(let i = 0; i < result.length; i++ ){
        // ','로 구분된 유저 아이디 문자열
        let mentionedUserIdlist = result[i].mentioned_user_list

        if(mentionedUserIdlist != null){
            let arr = mentionedUserIdlist.split(",");

            for(let j = 0; j < arr.length; j++ ){
                arr[j] = Number(arr[j]);
            }

            result[i].mentioned_user_list = arr;
        }

    }

    return result;
}
