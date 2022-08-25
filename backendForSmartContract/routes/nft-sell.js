const express = require("express");
const router = express.Router();
module.exports = router;
//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/', async function(req,res) {
    console.log("nft_sell 들어옴");
    var nft_sell = require("../nft-market/nft-sell");
    var resolve = await nft_sell.main(req,res);
    console.log(resolve.data);
    //resolve.data결과 아래와 같음.
    // {    app_id: 96821750,
    //     result: 'success',
    //     txn_id: 'H53PCKQUKYG75GAHAVUM2UGO3UCTJPZPWALLAOG2RLUQZEAR5GJA'}
    res.send("success");
})