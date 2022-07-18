
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');

module.exports = async function(req,res) {
    // 게시물 내용, 게시물 아이디, 구분값(저장 or 수정)
    const postContents = res.locals.postContents;
    const postId = res.locals.postId;
    // 0: 저장 1: 수정
    const gubun = res.locals.gubun;

    console.log("gubun: " + gubun);
    
    // 해당 게시물의 좋아요 카운트를 0으로 바꿔준다.
    let queryStrDelete = 'delete from hashtag where post_id = ?';
    let datasDelete = [postId];
    if(gubun == 1){
        await maria.query(queryStrDelete, datasDelete, function(err, rows, fields){
            if(!err){
                console.log("삭제 성공");
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }

    /* 게시물 콘텐츠에서 해시태그를 파싱해서 json형태(mysql에서 말하는)로 만들어준다.*/
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
            hashTagJson += '"' + hashTagVal.substring(idx) + '"' + ",";
        }else {
            continue;
        }
    }

    hashTagJson = hashTagJson.substring(0, hashTagJson.length -1);
    hashTagJson += "]";

    // 프로시저를 호출해서 해당 해시태그를 저장한다.
    let queryStr = 'call insert_hashtag(?, ?)';
    let datas = [postId, hashTagJson];

    // 저장!
    maria.query(queryStr, datas, function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success")
        } else {
            console.log(err);
            res.send(err);
        }
    });
}