const express = require("express");
const router = express.Router();
module.exports = router;
//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/', async function(req,res) {
    var nft_buy = require("../nft-market/nft-buy");
    var resolve = await nft_buy.main(req);
    console.log(resolve.data);
    console.log(resolve);

    res.send(resolve);
})
