const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');
const mention = require('../post/mention');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;


// deep_post
router.get('/deep_post', async function(req,res) {
    let post_id = req.query.id;
    res.redirect('bubbly1://3.39.84.115/'+post_id)
});

// deep_community
router.get('/deep_community', async function(req,res) {
    let community_id = req.query.id;

    res.redirect('bubbly2://3.39.84.115/'+community_id)
});

// 개인정보 보호저책
router.get('/privacyPolicy', async function(req,res) {
    res.render("../views/privacyPolicy.html")
});

// 이용약관
router.get('/termsToUse', async function(req,res) {
    res.render("../views/termsToUse.html")
});

// 이용약관
router.get('/', async function(req,res) {
    let data = req.query.data;
    
    console.log(data);

    res.redirect('bubbly://deep/'+data)
});

// 유니콘 개인정보 보호정책
router.get('/unicornWallet_privacyPolicy', async function(req,res) {
    res.render("../views/unicornWallet_privacyPolicy.html")
});

// 유니콘 이용약관
router.get('/unicornWallet_termsToUse', async function(req,res) {
    res.render("../views/unicornWallet_termsToUse.html")
});