// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");

// Router를 사용하기 위해 express.Router()호출
const router = express.Router();

const blockchain = require("./blockchain");

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

router.use(express.urlencoded({ extended: false }));


/*************뉴오팀 api********* */
/* 
    노바랜드 위에서 새로운 토큰을 생성한다.
    input: req, res
    output: 없음
*/
router.post('/createToken', async function(req,res) {
    // 토큰을 만들기 위한 정보    
    const mnemonic = req.body.mnemonic;
    const unitName = req.body.unitName;
    const assetName = req.body.assetName;
    const amount = Number(req.body.amount);

    console.log("mnemonic: " + mnemonic);
    console.log("unitName: " + unitName);
    console.log("assetName: " + assetName);
    console.log("amount: " + amount);

    // 토큰 생성 후 assetId 반환(숫자)
    const assetId = await blockchain.createToken(mnemonic, unitName, assetName, amount);

    console.log("assetId: " + assetId);

    // 문자열로 변환 후 반환 => res.send() 숫자는 안보내짐
    res.send("" + assetId);

});

// 계정 토큰에 옵트인
router.post('/optin',async function(req,res){
    const mnemonic = req.body.mnemonic;
    const token_id = req.body.token_id;

    const result = await blockchain.tokenOptIn(mnemonic,token_id)   
    res.send(result);
});


// 토큰 전송
router.post('/transferToken',async function(req,res){   
    const senderMnemonic = req.body.sender_mnemonic;
    const receiverAddr = req.body.receiverAddr;
    const tokenId = req.body.token_id;
    const amount = Number(req.body.amount);

    const result = await blockchain.transferToken(senderMnemonic, receiverAddr, tokenId, amount);
    res.send(result);
});

/* 
    역할: 사용자 블록체인 계정을 생성하고 특정 토큰을 옵트인한다.
    input: user_id
    output: 니모닉
*/
router.post('/createAddrOnNovarandWithToken', async function(req,res) {
    const token_id = req.body.token_id;

    // 사용자 계정과 니모닉을 저장하는 변수
    let accountAndMnemonic;

    // 1. 새로운 블록체인 계정과 니모닉 생성    
    blockchain.makeBlockchainAddrAndMnemonic()
    .then((value) => {
        // 2. 개발사 계정이 생성된 계정에게 Nova 전송(opt-in을 위한 최소 Nova)
        accountAndMnemonic = value;
        blockchain.sendToAddrByDevAddrWithAmount(accountAndMnemonic.account.addr,201000)
    }).catch((error) => {console.log(error)})
    .then(() => {
        // 3. 생성된 계정 bubble 토큰에 옵트인
        blockchain.tokenOptIn(accountAndMnemonic.mnemonic,token_id)
    }).catch((error) => {console.log(error)})
    .then(() => {
        res.send({"mnemonic": accountAndMnemonic.mnemonic, "addr": accountAndMnemonic.account.addr});
    }).catch((error) => {console.log(error)})
})

// 개발사 계정 -> 회원가입한 계정으로 Nova 보내기
router.post('/sendNovaToAddrWithAmount',async function(req,res){   
    const addr = req.body.addr;
    const amount = Number(req.body.amount);

    const result = await blockchain.sendToAddrByDevAddrWithAmount(addr,amount);

    res.send(result);
});

// 계정주소로 계정정보 조회
router.get('/selectAddrUsingAddr', async function(req,res){  
    // 사용자 블록체인 정보 조회
    const account_info = await blockchain.selectAccountInfo(req.query.addr);
    
    res.send(account_info);
});


// 노바로 환전
router.post('/exchange',async function(req,res){
    const sender_addr = req.body.sender_addr;
    const sender_mnemonic = req.body.sender_mnemonic;
    const token_amount = Number(req.body.token_amount);
    const tokenId = Number(req.body.token_id);
    const ratio = Number(req.body.ratio);
    const amount = token_amount * ratio; //1 token =  1mNova * ratio
    
    //console.log("exchange: " + sender_addr);

    //토큰 회수
    blockchain.transferTokenToDevAmount(sender_mnemonic,tokenId,token_amount)
    .then((result)=>{
        if(result=="success"){
            //금액이전
            blockchain.sendToAddrByDevAddrWithAmount(sender_addr,amount)
            .then((response) => {
                //console.log("sendToAddrByDevAddrWithAmount: " + response);
                if(response=="success"){
                    res.send("success");
                }else{
                    res.send("fail");
                }
            }).catch((error) => {console.log(error)});
        }else{
            res.send(result);
        }
    }).catch((error) => {console.log(error)});
});


/*************뉴오팀 api********* */