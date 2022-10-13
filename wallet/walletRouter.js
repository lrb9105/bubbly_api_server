// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// 암호화된 비밀번호를 생성하기 위해
const blockchain = require('../util/blockchain');
const blockChainConfig = require("../backendForSmartContract/config/config.json");
const tokenId = blockChainConfig.SmartContractParams.token_id;
// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;

// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

//환전
router.post('/exchange',async function(req,res){
    // 파라미터 정보를 파싱해서 해시맵에 저장한다(sender_address,sender_mnemonic,token_amount)
    await parseFormData(req);
    // 사용자 아이디
    const sender_addr = hashmap.get("sender_addr");
    const sender_mnemonic = hashmap.get("sender_mnemonic");
    const token_amount = +hashmap.get("token_amount");
    const amount = token_amount; //1 token = 1 bubble
    console.log("exchange: " + sender_addr);

    //토큰회수
    blockchain.transferTokenWithAmount(sender_mnemonic,tokenId,token_amount)
    .then((result)=>{
        if(result=="success"){
            //금액이전
            blockchain.sendToAddrByDevAddrWithAmount(sender_addr,amount)
            .then((response) => {
                console.log("sendToAddrByDevAddrWithAmount: " + response);
                if(response=="success"){
                    res.send("success");
                }else{
                    res.send("fail");
                }
            }).catch((error) => {console.log("11")});
        }else{
            res.send("fail");
        }
    }).catch((error) => {console.log("222")});
});


/* form 데이터를 파싱한다(텍스트만 있다).
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseFormData(req){
    return new Promise( (resolve)=>{
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();

        // 데이터 스트림 만듬
        req.pipe(req.busboy);

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            hashmap.set(name, value);
            console.log("value: " + name , hashmap.get(name));
        });

        req.busboy.on("finish", function() {
            return resolve();            
        });
    })
  }