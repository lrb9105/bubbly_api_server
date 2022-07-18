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

// 특정 검색어의 해시태그를 검색한다.
router.get('/selectHashtagInfoList', async function(req,res) {
    // 쿼리문
    let sql = " select hashtag_name, count(*) cnt "
            + " from hashtag "
            + " where hashtag_name like '" + req.param("hashtag_name") + "%'"
            + " group by hashtag_name "
            + " limit 30 ";

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

router.get('/test', async function(req,res) {
    const postContents = req.param("post_contents");
    const postId = req.param("post_id");

    // hashTagJson
    let hashTagJson = "[";

    // 게시물 내용을 공백으로 스플릿해서 배열을 얻는다.
    const arr = await postContents.split(" ");
    
    // 배열의 갯수만큼 반복한다.
    for(let i = 0; i < arr.length; i++) {
        let hashTagVal = arr[i];

        // 배열값이 #을 포함했는지 확인한다.
        // serach함수는 특정 문자를 포함하고 있으면 인덱스를 아니면 -1을 반환!
        let idx = hashTagVal.search("#");
        if(idx != -1){
            console.log(hashTagVal.substring(idx));
            hashTagJson += '"' + hashTagVal.substring(idx) + '"' + ","
        }else {
            continue;
        }
    }

    hashTagJson = hashTagJson.substring(0, hashTagJson.length -1);
    hashTagJson += "]";

    // 프로시저를 호출해서 해당 해시태그를 저장한다.
    // 해당 게시물의 좋아요 카운트를 0으로 바꿔준다.
    let queryStr = 'call insert_hashtag(?, ?)';
    let datas = [postId, hashTagJson];

    // 저장!
    maria.query(queryStr, datas, function(err, rows, fields){
        if(!err){
            console.log("성공111");
            res.send("success")
        } else {
            console.log(err);
            res.send(err);
        }
    });
});