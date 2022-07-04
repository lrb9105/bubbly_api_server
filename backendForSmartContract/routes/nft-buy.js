const express = require("express");
const router = express.Router();
module.exports = router;
//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/', async function(req,res) {
    var nft_buy = require("../nft-market/nft-buy");
    var resolve = await nft_buy.main(req);
    console.log(resolve.data);
    //resolve.data결과 아래와 같음.
    // {result: 'success',
    //   txn_id: 'QWDR4UUNQ7RIFUP3Z365YFR4ERWE2A3JX73DCQ6KGMBIUAJGDZKQ'}
    //추가로 RDB에 저장하는 작업 등 수행
    res.send();
})
