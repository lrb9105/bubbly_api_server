const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// s3버킷명
const BUCKET_NAME = 'bubbly-s3';
// aws-sdk를 사용하기 위해 가져 옴
const AWS = require('aws-sdk');
// 설정파일
const config = require('../config/config');
// s3에 접근하기 위해 accessKeyId와 secretAccessKey값을 넣어주고 s3객체를 생성한다.
const s3 = new AWS.S3({accessKeyId: config.s3_accessKeyId, secretAccessKey: config.s3_secretAccessKey});
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');
const hashtag = require('../hashtag/hashtag');
const mention = require('../post/mention');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;
// 멘션된 사용자 아디이리스트르 받을 배열 객체
let arr;

const tokenPayment = require('../backendForSmartContract/routes/token-payment');


// 파이썬 프로그램과 http통신을 하기 위해
const axios = require("axios");

router.get('/ipfs', async function(req,res) {
    let abd;
    await axios.get("https://ipfs.io/ipfs/bafyreidclco3yqjlzof2sqq5peqxrr7xbdexyfwkluy7psat7onjoyhdhy/metadata.json")
        .then((response) =>{
            let imageUrl = response.data["image"];
            abd = imageUrl.replace("ipfs://","https://ipfs.io/ipfs/");
            console.log(imageUrl);
        })
        .catch((err) => {
            console.log("Error!!",err);
        });

    res.send(abd);

});

/* 
    역할: 게시물 정보를 저장한다.
    input: req, res
    output: 없음
*/
router.post('/createPost', async function(req, res, next) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    let saveFileNames = await parseMultiParts(req);

    // 멘션(@사용자명 -> 사용자 아이디) 파싱
    let mentionedUserIdStr = await mention(arr);

    if(mentionedUserIdStr == "") {
        mentionedUserIdStr = null;
    }
    console.log("mentionedUserIdStr: " + mentionedUserIdStr);

    // 저장한 파일명
    console.log(saveFileNames);
    
    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'INSERT INTO post (post_writer_id, post_contents, file_save_names, cre_datetime_post, share_post_yn, community_id, mentioned_user_list) VALUES (?)';
    let datas = [hashmap.get("post_writer_id"), hashmap.get("post_contents"), saveFileNames, time.timeToKr(), hashmap.get("share_post_yn"), hashmap.get("community_id"), mentionedUserIdStr];
    
    console.log("현재시간: " + time.timeToKr());

    // 저장!
    await maria.query(queryStr, [datas], async function(err, rows, fields){
        if(!err) {
            console.log("성공");
            // post_id를 가져온다.
            // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
            let queryStr = 'select max(post_id) post_id from post where post_writer_id = ?';
            let datas = [hashmap.get("post_writer_id")];
            
            // 저장!
            await maria.query(queryStr, [datas], function(err, rows, fields){
                if(!err){
                    console.log("성공");
                    // 해시태그 객체에게 게시물 아이디와 내용을 넘겨준다.
                    res.locals.postContents = hashmap.get("post_contents");
                    res.locals.postId = rows[0].post_id;
                    res.locals.gubun = 0;
                    next();
                } else {
                    console.log(err);
                    console.log("실패");
                    res.send("fail");
                }
            }); 
        }else {
            console.log(err);
            console.log("실패");
            res.send("fail");
        }
    });
}, hashtag);

// 게시물id로 게시물 정보를 조회한다.
router.get('/selectPostUsingPostId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql = " SELECT p.post_id "
            + "     , p.post_writer_id "
            + "     , ui.nick_name "
            + "     , p.post_contents "
            + "     , p.file_save_names "
            + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
            + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
            + "     , share_post_yn "
            + "     , nft_post_yn "
            + "     , profile_file_name "
            + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime "
            + "     , p.mentioned_user_list "
            + "     , ui.login_id "
            + "     , p.community_id "
            + " from post p "
            + " inner join user_info ui on p.post_writer_id = ui.user_id "
            + " left join (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") +") pl on p.post_id = pl.post_id "
            + " WHERE p.post_id = " + req.param("post_id")
            + " order by p.cre_datetime_post desc";

    console.log(sql);

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

// 사용자id로 게시물 정보를 조회한다.
// 사용자가 작성한 모든 글 => 일반, 커뮤니티 상관없이
router.get('/selectPostUsingPostWriterId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "select p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (select * from post_like where user_id = " + req.param("post_writer_id") +") pl on p.post_id = pl.post_id " 
                + " where post_writer_id = " + req.param("post_writer_id")
                + " order by p.cre_datetime_post desc";

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

// 검색어로 게시물 정보를 조회한다.
// 일반글 + 내가 속한 커뮤니티글만 나오도록 해야 함(팔로워는 상관없음)
router.get('/selectPostUsingPostContents', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =   "SELECT p.post_id "
                    + "     , p.post_writer_id "
                    + "     , p.post_contents "
                    + "     , p.file_save_names "
                    + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                    + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                    + "     , share_post_yn "
                    + "     , nft_post_yn "
                    + "     , ui.nick_name "
                    + "     , profile_file_name "
                    + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                    + "     , p.mentioned_user_list "
                    + "     , ui.login_id "
                    + "     , p.community_id "
                    + " from post p "
                    + " inner join user_info ui on p.post_writer_id = ui.user_id "
                    + " left JOIN (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") +") pl on p.post_id = pl.post_id "
                    + " WHERE post_contents like '%" + req.param("post_contents") + "%'"
                    + " or (p.post_contents like '%" + req.param("post_contents") + "%'" +  " and community_id in (select community_id from participating_community where user_id = "+ req.param("user_id") + "))"
                    + " order by p.cre_datetime_post desc";
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

// 검색어로 게시물 정보를 조회하고 좋아요 순으로 정렬한다.
// 일반글 + 내가 속한 커뮤니티글만 나오도록 해야 함(팔로워는 상관없음)
router.get('/selectPostUsingPostContentsOrderBylike', async function(req,res) {
    const searchText = req.param("search_text");
    const userId =  req.param("user_id");

    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =   " select * from ( "
                        + " select p.post_id "
                        + "     , p.post_writer_id "
                        + "     , p.post_contents "
                        + "     , p.file_save_names "
                        + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                        + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                        + "     , share_post_yn "
                        + "     , nft_post_yn "
                        + "     , ui.nick_name "
                        + "     , profile_file_name "
                        + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                        + "     , p.mentioned_user_list "
                        + "     , ui.login_id "
                        + "     , p.community_id "
                        + " from post p "
                        + " inner join user_info ui on p.post_writer_id = ui.user_id "
                        + " left JOIN (SELECT * FROM post_like WHERE user_id = " + userId +") pl on p.post_id = pl.post_id "
                        + " WHERE post_contents like '%" + searchText + "%'"
                        + " or (p.post_contents like '%" + searchText + "%'" +  " and community_id in (select community_id from participating_community where user_id = "+ userId + "))"
                + ") aa"
                + " order by aa.like_count";
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

// 나와 팔로위, 커뮤니티의 게시물을 조회한다(홈 타임라인)
router.get('/selectPostMeAndFolloweeAndCommunity', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "SELECT p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left JOIN (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") +") pl on p.post_id = pl.post_id " 
                + " WHERE post_writer_id = " + req.param("user_id") + " and community_id = 0 "
                + " or (post_writer_id in (select followee_id from following where follower_id =" + req.param("user_id") + ") and community_id = 0)"
                + " or (community_id in (select community_id from participating_community where user_id = "+ req.param("user_id") + "))"
                + " order by p.cre_datetime_post desc";
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

// 공유한 게시물만 조회한다.
router.get('/selectSharedPostUsingPostWriterId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "select p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (select * from post_like where user_id = " + req.param("post_writer_id") +") pl on p.post_id = pl.post_id " 
                + " where post_writer_id = " + req.param("post_writer_id")
                + " and p.share_post_yn = 'y'"
                + " order by p.cre_datetime_post desc";
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

// 댓글단 모든 게시물 조회한다.
router.get('/selectCommentedPostUsingUserId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "select p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (select * from post_like where user_id = " + req.param("user_id") + ") pl on p.post_id = pl.post_id " 
                + " inner join (select distinct post_id from comment where comment_writer_id =" +  req.param("user_id") + ") pi on p.post_id = pi.post_id "
                + " order by p.cre_datetime_post desc";
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

// 내가 작성한 게시물 중 nft화한 게시물만 조회한다.
router.get('/selectNftPostUsingPostWriterId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "select p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (select * from post_like where user_id = "+ req.param("post_writer_id") +" ) pl on p.post_id = pl.post_id " 
                + " where post_writer_id = " + req.param("post_writer_id")
                + " and p.nft_post_yn  = 'y'"
                + " order by p.cre_datetime_post desc";
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

// 좋아요한 게시물 정보를 조회한다.
router.get('/selectLikedPostUsingUserId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "SELECT p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + "     , p.community_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " inner join (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") + ") pl on p.post_id = pl.post_id "
                + " order by p.cre_datetime_post desc";
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

// 특정 커뮤니티의 모든 게시글 조회
router.get('/selectCommunityPost', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "SELECT p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.community_id"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") + ") pl on p.post_id = pl.post_id "
                + " where community_id = " + req.param("community_id")
                + " order by p.cre_datetime_post desc";
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

// 내가 속한 모든 커뮤니티의 게시글 조회
router.get('/selectAllCommunityPost', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql =     "SELECT p.post_id "
                + "     , p.post_writer_id "
                + "     , ui.nick_name "
                + "     , p.post_contents "
                + "     , p.file_save_names "
                + "     , (select COUNT(*) from post_like where post_id = p.post_id) like_count "
                + "     , case when pl.user_id is not null then 'y' else 'n' end like_yn "
                + "     , share_post_yn "
                + "     , nft_post_yn "
                + "     , ui.nick_name "
                + "     , profile_file_name "
                + "     , date_format(cre_datetime_post, '%Y-%m-%d %H:%i') cre_datetime"
                + "     , p.community_id"
                + "     , p.mentioned_user_list "
                + "     , ui.login_id "
                + " from post p "
                + " inner join user_info ui on p.post_writer_id = ui.user_id "
                + " left join (SELECT * FROM post_like WHERE user_id = " + req.param("user_id") + ") pl on p.post_id = pl.post_id "
                + " where community_id in (select community_id from participating_community where user_id = " + req.param("user_id") + ")"
                + " order by p.cre_datetime_post desc";
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

// 게시물 정보를 수정한다.
router.post('/updatePost', async function(req,res, next) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);

    // 멘션(@사용자명 -> 사용자 아이디) 파싱
    let mentionedUserIdStr = await mention(arr);

    if(mentionedUserIdStr == "") {
        mentionedUserIdStr = null;
    }
    console.log("mentionedUserIdStr: " + mentionedUserIdStr);
    
    // 해당 게시물 id의 기존 파일저장 경로를 가져온다.
    //let sql = 'SELECT file_save_names FROM post WHERE post_id = ' + hashmap.get("post_id");
    let sql = 'SELECT file_save_names FROM post WHERE post_id = ' + Number(hashmap.get("post_id"));

    await maria.query(sql, function (err, result, fields) {
        if (err) {
            console.log(sql);
            console.log(2222);
            throw err;
        } else {
            // 저장된 파일명(있을수도 없을수도 있음)
            // 있으면 파일명리스트(,로 구분), 없으면 null나옴
            let file_save_names = result[0].file_save_names
            
            console.log("게시물 수정 - file_save_names: " + file_save_names);

            // s3에서 해당 파일 삭제
            // 파일명이 있다면 삭제!
            if(file_save_names != null) {
                s3delete(file_save_names);
            }

            let sqlUpdate = 'UPDATE post SET post_contents = ?, file_save_names = ?, upd_datetime_post = ?, mentioned_user_list =? WHERE post_id = ?';
            // undefined를 넣어도 null로 넣어짐!
            let datas = [hashmap.get("post_contents"), saveFileNames, time.timeToKr(), mentionedUserIdStr, hashmap.get("post_id")];

            console.log("22")
            maria.query(sqlUpdate, datas, function (err, result) {
                if (err) {
                    console.log(sqlUpdate);
                    res.send("fail");
                    throw err;
                } else {
                    console.log(sqlUpdate);
                    console.log(result);
                    // 성공한 경우 게시물 아이디와 내용을 넘겨준다.
                    res.locals.postContents = hashmap.get("post_contents");
                    res.locals.postId = hashmap.get("post_id");
                    res.locals.gubun = 1;
                    
                    next();
                }
            })
        }
    });
}, hashtag);

/* 
    게시물 정보를 삭제한다.
    1. 정적파일 삭제
    2. 댓글삭제
    3. 게시물 삭제
*/
router.post('/deletePost', async function(req,res) {
    // 파라미터 정보를 파싱해서 post_id를 가져온다.
    await parseFormData(req);

    // s3에 저장된 정적파일이 있다면 삭제한다.
    // 해당 게시물 id의 기존 파일저장 경로를 가져온다.
    //let sql = 'SELECT file_save_names FROM post WHERE post_id = ' + hashmap.get("post_id");
    let sql = 'SELECT file_save_names FROM post WHERE post_id = ' + Number(hashmap.get("post_id"));
    
    await maria.query(sql, function (err, result, fields) {
        if (err) {
            console.log(sql);
            console.log(2222);
            throw err;
        } else {
            // 저장된 파일명
            let file_save_names = result[0].file_save_names
            // s3에서 해당 파일 삭제
            console.log("file_save_names: " + file_save_names);

            if(file_save_names != null) {
                s3delete(file_save_names);
            }
            // 데이터베이스의 댓글 정보를 삭제한다.
            let sqlDeleteComment = 'DELETE FROM comment WHERE post_id = ' + hashmap.get("post_id");
            maria.query(sqlDeleteComment, function (err, result) {
                if (err) {
                    console.log(sqlDeleteComment);
                    res.send("comment delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteComment);
                    console.log(result);
                }
            });

            // 데이터베이스의 해시태그 정보를 삭제한다.
            let sqlDeleteHashTag = 'DELETE FROM hashtag WHERE post_id = ' + hashmap.get("post_id");
            maria.query(sqlDeleteHashTag, function (err, result) {
                if (err) {
                    console.log(sqlDeleteHashTag);
                    res.send("hashtag delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteHashTag);
                    console.log(result);
                }
            });

            // 데이터베이스의 게시물 정보를 삭제한다.
            let sqlDelete = 'DELETE FROM post WHERE post_id = ' + hashmap.get("post_id");
            maria.query(sqlDelete, function (err, result) {
                if (err) {
                    console.log(sqlDelete);
                    res.send("post delete fail");
                    throw err;
                } else {
                    console.log(sqlDelete);
                    console.log(result);
                    res.send("success");
                }
            });
        }
    });
})

// 특정 게시물에 좋아요를 누른 경우 로우 생성!
router.post('/like', async function(req,res, next) {
    // post_id, user_id 가져 와서 hashMap에 넣음
    await parseFormData(req);

    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'INSERT INTO post_like (post_id, user_id, cre_datetime_post_like) VALUES (?)';
    let datas = [hashmap.get("post_id"), hashmap.get("user_id"), time.timeToKr()];

    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            // 좋아요 카운트 테이블에 + 1
            let queryStr = 'select post_like_count(?, 1)';
            let datas = [hashmap.get("post_id")];

            // 저장!
            maria.query(queryStr, [datas], function(err, rows, fields){
                if(!err){
                    console.log("성공");
                    res.locals.postId = hashmap.get("post_id");
                    next();
                } else {
                    console.log(err);
                    res.send(err);
                }
            });
        } else {
            console.log(err);
            res.send(err);
        }
    });
}, tokenPayment);


// 좋아요 취소!
router.post('/dislike', async function(req,res) {
    // post_id, user_id 가져 옴
    await parseFormData(req);

    // 데이터베이스의 게시물 정보를 삭제한다.
    let sqlDelete = 'DELETE FROM post_like WHERE post_id = ? AND user_id = ?';
    let datas = [hashmap.get("post_id"), hashmap.get("user_id")];
    maria.query(sqlDelete, datas, function (err, result) {
        if (err) {
            console.log(sql);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlDelete);
            console.log(result);

            // 좋아요 카운트 테이블에 - 1
            let queryStr = 'select post_like_count(?, -1)';
            let datas = [hashmap.get("post_id")];

            // 저장!
            maria.query(queryStr, [datas], function(err, rows, fields){
                if(!err){
                    console.log("성공");
                    res.send("success");
                } else {
                    console.log(err);
                    res.send(err);
                }
            });
        }
    });
});

router.post('/test', async function(req,res) {
    // 각파일의 정보를 담은 배열을 저장할 맵
    let files = new HashMap();
    // 파일의 정보를 저장할 배열
    let fileInfo;
    // 파일 청크 데이터를 저장
    let chunks;

    // 파일 정보를 읽어와서 배열에 저장한다.
    req.busboy.on('file', (name, file, info) => { //파일정보를 읽어온다.
        const { filename, encoding, mimeType } = info;
        
        // 확장자(jpeg, png 등)
        var filetype = mimeType.split("/")[1];
        console.log("filetype: " + filetype);

        filetempName = `${random()}.${filetype}`; //랜덤하게 파일명 생성
        // mime타입(image/jpeg 등)
        ftype = mimeType;
        console.log("ftype: " + ftype);
        console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`,filename, encoding, mimeType);

        file.on('data', function(data) {
            chunks = [];
            // you will get chunks here will pull all chunk to an array and later concat it.
            chunks.push(data)
        });

        file.on('end', function(data) {
            // 각 파일의 정보를 저장할 배열
            fileInfo = [];
            //랜덤하게 파일명 생성
            filetempName = `${random()}.${filetype}`;
            // 랜덤한 파일명 저장
            fileInfo[0] = filetempName;
            // 각 파일의 타입 저장
            fileInfo[1] = mimeType;
            // 각 파일의 청크 배열 저장
            fileInfo[2] = chunks;
            
            // you will get chunks here will pull all chunk to an array and later concat it.
            files.set(filename, fileInfo);
        });

    });

    req.busboy.on('finish', function() {
        const size = files.size;
        let count = 1;
        let fileNames = "";
        
        files.forEach(function (value, key, map) {
            // 저장한 파일명 ','로 구분해서 저장
            fileNames += value[0] + ",";
            if(count == size) {
                fileNames = fileNames.substring(0,fileNames.length - 1);
            }

            console.log(fileNames);
            
            /*const params = {
                Bucket: BUCKET_NAME,
                Key: value[0], 
                Body: Buffer.concat(value[2]), // concatinating all chunks
                ContentType: value[1] // required
            }

            s3.upload(params, (err, data) => {
                if (err){ //애러가 발생하면 무조건 리턴
                    return resolve(err);
                } else {
                    // 마지막이라면 리턴
                    console.log(count);
                    console.log(value[0]);
                    if(count == size){
                        return resolve("111");
                    } else {
                        count++;
                    }
                }
            });*/

            count++;
          });

        console.log("파일 있음");
        res.send();
    });

    req.pipe(req.busboy);
})


/* multipart 데이터를 파싱하고 정적파일이 있다면 s3로 업로드 한다.
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseMultiParts(req){
    return new Promise( (resolve)=>{
        // 각파일의 정보를 담은 배열을 저장할 맵
        let files = new HashMap();
        // 파일의 정보를 저장할 배열
        let fileInfo;
        // 파일 청크 데이터를 저장
        let chunks;
        // 파일명
        let filetempName;
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();
        // 멘션된 유저아이디를 저장할 배열
        arr = new Array();

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            if(name.includes("mentioned_user_id_list[]")) {
                arr.push(value);
            } else {
                hashmap.set(name, value);
                console.log("value: " + name , hashmap.get(name));
            }
        });
        
        // 파일 정보를 읽어와서 배열에 저장한다.
        req.busboy.on('file', (name, file, info) => { //파일정보를 읽어온다.
            const { filename, encoding, mimeType } = info;
            chunks = [];
            
            // 확장자(jpeg, png 등)
            var filetype = mimeType.split("/")[1];
            console.log("filetype: " + filetype);

            // mime타입(image/jpeg 등)
            console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`,filename, encoding, mimeType);
            
            file.on('data', function(data) {
                // you will get chunks here will pull all chunk to an array and later concat it.
                chunks.push(data)
            });

            file.on('end', function(data) {
                // 각 파일의 정보를 저장할 배열
                fileInfo = [];
                //랜덤하게 파일명 생성
                filetempName = `${random()}.${filetype}`;
                // 랜덤한 파일명 저장
                fileInfo[0] = filetempName;
                // 각 파일의 타입 저장
                fileInfo[1] = mimeType;
                // 각 파일의 청크 배열 저장
                fileInfo[2] = chunks;
                
                // you will get chunks here will pull all chunk to an array and later concat it.
                files.set(filename, fileInfo);
            });

        });

        // field와 file스트림에서 데이터를 다 저장하고 마지막으로 실행됨.
        req.busboy.on('finish', function() {
            // 파일배열의 길이(맵인 경우 size로 구해야 함!!)
            const fileLength = files.size;
            
            console.log("파일길이!! => " + fileLength);

            // 정적파일이 있을 때만 s3로 업로드 한다.
            if(fileLength != 0) {
                // 파일을 저장한 맵의 사이즈
                const size = files.size;
                // 파일맵 요소의 카운트
                let count = 1;
                // 파일들의 이름을 ","로 연결해서 저장한 변수
                let fileNames ="";
                
                console.log(size);

                files.forEach(function (value, key, map) {
                    const params = {
                        Bucket: BUCKET_NAME,
                        Key: value[0], 
                        Body: Buffer.concat(value[2]), // concatinating all chunks
                        ContentType: value[1] // required
                    }

                    s3.upload(params, (err, data) => {
                        if (err){ //애러가 발생하면 무조건 리턴
                            return resolve(err);
                        } else {
                            // 저장한 파일명 ','로 구분해서 저장
                            fileNames += value[0] + ",";
                            // 마지막이라면 리턴
                            if(count == size){
                                fileNames = fileNames.substring(0,fileNames.length - 1);
                                
                                console.log(fileNames);

                                return resolve(fileNames);
                            } else {
                                count++;
                            }
                        }
                    });
                });

                console.log("파일 있음");
                // we are sending buffer data to s3.
            }else {
                console.log("파일 없음");
                // 파일이 없다면 빈값 리턴!
                return resolve();
            }
        });

        // 데이터 스트림 만듬
        req.pipe(req.busboy);
    })
  }

/* form 데이터를 파싱한다(텍스트만 있다).
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseFormData(req){
    return new Promise( (resolve)=>{
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();
        // 멘션된 유저아이디를 저장할 배열
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

// 랜덤한 16자리 값을 만든다.
const random = (() => {
    const buf = Buffer.alloc(16);
    return () => randomFillSync(buf).toString('hex');
})();

function s3upload(file, fileName, mimeType){
    console.log("들어오는가?");

    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: file,
        ContentType: mimeType
    };

    console.log("들어오는가?2222");
    s3.upload(params, function(err, data){
        console.log("들어오는가?3333");
        if(err) {
            throw err
        }
        console.log('file upload success: ' + data.Location);
        return data.Location;
    });
};

// s3에 있는 파일을 삭제한다.
function s3delete(filePath){
    // 파일명을 저장한 배열을 만든다.
    let fileNames = filePath.split(",");
    let size = fileNames.length;
    
    console.log("for문전")
    for(let i = 0; i < size; i++){
        console.log("파일명: "+ i + fileNames[i]);

        s3.deleteObject({
            Bucket: BUCKET_NAME, // 사용자 버켓 이름
            Key: fileNames[i] // 버켓 내 경로
          }, (err, data) => {
            if (err) { 
                throw err; 
            } else {
                // count는 0부터 시작
                if(i == (size -1)){
                    console.log((i + 1) + "-" + fileNames[i]);
                    return data;
                } else {
                    console.log((i + 1) + "-" + fileNames[i]);
                    i ++;
                }
            }
          })
    }
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