const express = require("express");
const router = express.Router();
const axios = require("axios");
module.exports = router;

// 알고랜드 sdk를 사용하기 위해
const algosdk = require('algosdk');

//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/', async function(req,res) {
    console.log("nft_creation 들어옴!");
    
    var nft_creation = require("../nft-market/nft-create");
    var resolve = await nft_creation.main(req, res);
    console.log(resolve.data);
    //resolve.data결과 아래와 같음.
    // {nft_id: 96821233,
    //     result: 'success',
    //     txn_id: '73JIMBCFP6AMJ7CPEFALPX67YRK3JCPGR45PTVP3K3VQMLLJ6G3A'}
    //추가로 RDB에 저장하는 작업 등 수행
    res.send("success");
});

// algosdk 테스트
router.get('/test', async function(req,res) {
    // 사용자로부터 받은 니모닉
    const mnemonic = req.param("mnemonic");
    let account = algosdk.mnemonicToSecretKey(mnemonic);
    res.send(account);
});

// algosdk 테스트
router.get('/test2', async function(req,res) {
    let algodClient = new algosdk.Algodv2({"X-API-Key" : "x5KDN9UEqJ8GFUZxgezZW6FKinMUj8G14gMRuRL2"}, "https://testnet-algorand.api.purestake.io/ps2", "");
    
    const mnemonic = 'idea hand rhythm mail resemble spatial mushroom purse tell excite reunion mule purity fence anger wonder connect black priority mesh version dash speed abstract thing';
    const recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

    console.log(recoveredAccount);


    let params = await algodClient.getTransactionParams().do();
    
    res.send(params);
});

// algosdk 테스트
router.get('/test3', async function(req,res) {
    axios.get('http://127.0.0.1:5000/test')  
        .then(function (response) {
            res.send("success");
        })
        .catch(function (error) {
            res.send(error);
        });
});