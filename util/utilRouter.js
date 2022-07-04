// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

const algosdk = require('algosdk');
const token = '12cad58d7c767918026b0a8321fa61516a75d5089d0b43a35556de913c9b2697';
const server = 'http://127.0.0.1';
const port = 8080;
const client = new algosdk.Algodv2(token, server, port);

// 니모닉을 받아서 알고랜드 계정정보를 반환
router.get('/nemonicToAccount', async function(req,res) {
    (async () => {
        let acc = await algosdk.mnemonicToSecretKey("idea hand rhythm mail resemble spatial mushroom purse tell excite reunion mule purity fence anger wonder connect black priority mesh version dash speed abstract thing");
        console.log(acc.sk);
        console.log(acc.addr);
        let acc2 = await algosdk.secretKeyToMnemonic(acc.sk);
        console.log(acc2);
        res.send(acc.sk)

        let kmdClient = new algosdk.Kmd("a12cede05b619fc48c9c1d6e2881085e6376e1e0122ff78ee52a1e7c3dc286c7", "http://127.0.0.1", 7833)

        console.log(await kmdClient.exportKey("EGW3KCUW2KOIE2SMIXCJBCYOJIAPNVHYCTBJBHW7LZRDIWESOTZU2J7TR4", 
        "!vkdnj91556", "UP5VRZYUXUHKNOGH6RR2AQJ5MMF6DWOQF2NAKWUV63NS4ERPRI5VEZIJT4"));
      })().catch((e) => {
        console.log(e);
      });
})