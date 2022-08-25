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


// nft_id로 nft 조회
router.get('/selectNftUsingNftId', async function(req,res) {
    // 쿼리문
    let sql = "select  nft_id "
            + "      , holder_id "
            + "      , nft_name "
            + "      , nft_desc "
            + "      , file_save_url "
            + "from nft "
            + "where nft_id = " + req.param("nft_id");

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

// nft보유자 아이디로 nft 정보를 조회한다.
router.get('/selectNftUsingHolderId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql = "select  nft_id "
            + "      , holder_id "
            + "      , nft_name "
            + "      , nft_desc "
            + "      , file_save_url "
            + "from nft "
            + "where holder_id = " + req.param("holder_id");

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

// 모든 판매중인 nft리스트 정보를 조회한다.
router.get('/selectAllSelledNftList', async function(req,res) {

    let sql = "select ns.nft_id "
            + "     , ns.seller_id "
            + "     , ns.sell_price "
            + "     , ns.nft_desc "
            + "     , ns.app_id "
            + "     , n.nft_name "
            + "     , n.nft_desc "
            + "     , n.file_save_url "
            + "     , ui.novaland_account_addr "
            + "from nft_sell ns "
            + "inner join nft n on ns.nft_id = n.nft_id  "
            + " inner join user_info ui on ns.seller_id = ui.user_id "
            + "where buy_yn = 'n'";
            
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

// nft판매자 아이디로 판매중인 nft 정보를 조회한다.
router.get('/selectSelledNftListUsingSellerId', async function(req,res) {
    // 파라미터 정보를 파싱한다.
    // 데이터베이스에 저장하고 저장된 게시물 id를 가져온다.
    let sql = "select ns.nft_id "
            + "     , ns.seller_id "
            + "     , ns.sell_price "
            + "     , ns.nft_desc "
            + "     , ns.app_id "
            + "     , n.nft_name "
            + "     , n.nft_desc "
            + "     , n.file_save_url "
            + "     , ui.novaland_account_addr "
            + " from nft_sell ns "
            + " inner join nft n on ns.nft_id = n.nft_id "
            + " inner join user_info ui on ns.seller_id = ui.user_id "
            + " where buy_yn = 'n' "
            + " and ns.seller_id = " + req.param("seller_id");
            
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