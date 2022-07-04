const express = require("express");
const router = express.Router();
module.exports = router;
//요청을 post로 수신하고 처리 결과 응답을 반환한다.
router.post('/',async function(req,res) {
    //클라이언트에서 하트를 누른다.
    //DB update : 해당 게시글 ID를 기반으로 하트 수를 하나 증가시킨다.
    //해당 게시글 작성자의 id를 기반으로 게시글 작성자의 public key=address를 DB에서 가져온다.
    var postWriterAddress = "Q7LS5VUYTPV7NKMMKFT22Z3A2DWSHUQQA74ILF7OXRKMN3HRQ7VC57EELU";
    //좋아요 누른 다음 하트가 하나더 추가된 이후의 해당 게시글의 총 하트 수를 가져온다.
    var totalNumberOfHeartPerPost = 40;
    var token_payment = require("../token-payment/token-payment");
    var result = await token_payment.main(postWriterAddress,totalNumberOfHeartPerPost);
    console.log(result);
    //추가로 RDB에 저장하는 작업 등 수행
    res.send();
})