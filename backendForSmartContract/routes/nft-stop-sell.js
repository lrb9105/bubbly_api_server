const express = require("express");
const router = express.Router();
module.exports = router;
router.use(express.urlencoded({ extended: false }));
//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/',async function(req,res) {
    var resolve;
    var nft_stop_sell = require("../nft-market/nft-stop-sell");
    var resolve = await nft_stop_sell.main(req);
    console.log(resolve.data);
    res.send("success");
})