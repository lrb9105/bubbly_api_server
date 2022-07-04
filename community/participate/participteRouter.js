const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../../db/maria');
const time = require('../../util/time');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

/* 
    역할: 커뮤니티 참여자 정보를 저장한다.
    input: req, res
    output: 없음
*/
router.post('/createCommunityParticipant', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    await parseFormData(req);
    
    // 데이터베이스에 커뮤니티 정보를 저장한다.
    let queryStr = 'insert into participating_community (user_id, community_id, cre_datetime_pc) values (?)';
    let datas = [hashmap.get("user_id"), hashmap.get("community_id"), time.timeToKr()];
    
    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success");
        } else {
            console.log(err);
            console.log("실패");
            res.send("fail");
        }
    });
})

/* 
    역할: 커뮤니티 참여 요청정보를 저장한다..
    input: req, res
    output: 없음
*/
router.post('/createCommunityParticipationReq', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    await parseFormData(req);
    
    // 데이터베이스에 커뮤니티 정보를 저장한다.
    let queryStr = 'insert into community_participation_req (community_id, community_participation_req_id, cre_datetime_req, req_complete_yn) values (?)';
    let datas = [hashmap.get("community_id"), hashmap.get("community_participation_req_id"), time.timeToKr(), "x"];
    
    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success");
        } else {
            console.log(err);
            console.log("실패");
            res.send("fail");
        }
    });
})

// 커뮤니티 참여 요청자의 리스트를 조회한다.
router.get('/selectCommunityParticipantReqList', async function(req,res) {
    // 쿼리문
    let sql = "select cp.community_id "
            + "     , ui.user_id "
            + "     , ui.nick_name "
            + "     , ui.profile_file_name "
            + "from community_participation_req cp "
            + "inner join user_info ui on cp.community_participation_req_id = ui.user_id "
            + "where cp.community_id = " + req.param("community_id") + " and cp.req_complete_yn = 'x'";

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

// 커뮤니티 참여 요청을 승인한다.
router.post('/approveCommunityParticipation', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장
    await parseFormData(req);
    
    let sqlUpdate = "update community_participation_req "
                          + "set req_complete_yn = 'y' "
                          + "  , cre_datetime_req_complete = ? "
                          + "where community_id = ? and community_participation_req_id = ?"

    // undefined를 넣어도 null로 넣어짐!
    let datas = [time.timeToKr(), hashmap.get("community_id"), hashmap.get("community_participation_req_id")];

    maria.query(sqlUpdate, datas, function (err, result) {
        if (err) {
            console.log(err);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlUpdate);
            console.log(result);
            // 성공한 경우 
            // 데이터베이스에 커뮤니티 정보를 저장한다.
            let queryStr = 'insert into participating_community (user_id, community_id, cre_datetime_pc) values (?)';
            let datas = [hashmap.get("community_participation_req_id"), hashmap.get("community_id"), time.timeToKr()];
            
            // 저장!
            maria.query(queryStr, [datas], function(err, rows, fields){
                if(!err){
                    console.log("성공");
                    res.send("success");
                } else {
                    console.log(err);
                    console.log("실패");
                    res.send("fail");
                }
            });
        }
    });
})

// 커뮤니티 참여 요청을 거절한다.
router.post('/rejectCommunityParticipation', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장
    await parseFormData(req);
    
    let sqlUpdate = "update community_participation_req "
                          + "set req_complete_yn = 'n' "
                          + "  , cre_datetime_req_complete = ? "
                          + "where community_id = ? and community_participation_req_id = ?"

    // undefined를 넣어도 null로 넣어짐!
    let datas = [time.timeToKr(), hashmap.get("community_id"), hashmap.get("community_participation_req_id")];

    maria.query(sqlUpdate, datas, function (err, result) {
        if (err) {
            console.log(err);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlUpdate);
            console.log(result);
            // 성공한 경우 
            res.send("success");
        }
    });
})
/* 커뮤니티 참여자 정보를 삭제한다. */
router.post('/deleteCommunityParticipant', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    /* 커뮤니티 참여자 정보를 삭제한다. */
    let sqlDeletePc = 'delete from participating_community where community_id = ' + hashmap.get("community_id") + ' and user_id = ' + hashmap.get("user_id");

    maria.query(sqlDeletePc, function (err, result) {
        if (err) {
            console.log(err);
            res.send("fail");
            throw err;
        } else {
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