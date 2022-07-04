const algosdk = require('algosdk');
var busboy = require('connect-busboy');
const axios = require("axios");
var config = require('../config/get-config-parameter')
var txn_condition = require('../transaction-condition/check-enough-txn-fee')
var arr = [];
let nft_owner_address, buyer_mnemonic, nftID, appID, buyPrice; //클라이언트로부터 전달받은 인자

function main(req) {
  return new Promise(async(resolve)=>{
    await parseMultiParts(req); //클라이언트 리퀘스트에 담기 파라미터를 arr에 담는다.
    //arr번호별로 python에 넘길 객체에 할당
    nft_owner_address = arr[0];
    buyer_mnemonic = arr[1];
    nftID = arr[2];
    appID = arr[3];
    buyPrice = arr[4];
    var buyer_account = await getAccount(buyer_mnemonic);
    var isBalanceMoreThanMin = await txn_condition.checkBalance(buyer_account.addr); //구매자의 토큰이 1000d이상이닞 확인. txn최소 잔고
    //그러나 옵트인하기 위한 트랜잭션 최소 작액 재검토 및 다른 기능으로 인해 최소잔액 기준 변경 시 txn_condition코드에서 최소잔액 수정 필요.
    if(isBalanceMoreThanMin){
        //smart contract application(flask)로 넘길 변수 리스트업
        let devAddress, devMnemonic, nftOwnerAddress, buyerAddress, buyerMnemonic, token_id, nodeToken, ipAddress, port;
        var configJson = await config.getConfigJson();
        devAddress = configJson.SmartContractParams.dev_address; //개발사주소(우리계정주소)
        devMnemonic = configJson.SmartContractParams.dev_mnemonic; //개발사 니모닉(우리계정니모닉)
        nftOwnerAddress = nft_owner_address; //nft소유자 주소. 클라이언트에서 전송 또는 클라이언트에서 id를 전송하면 
        //backend에서 query를 통해 주소값 반환. 현재는 클라이언트에서 보내는 것으로 가정.
        buyerAddress = buyer_account.addr; //nft구매자 주소, 니모닉에서 가져온 계정에서 추출
        buyerMnemonic = buyer_mnemonic; //nft구매자 니모닉
        tokenID = configJson.SmartContractParams.token_id; //Dapp 화폐인 토큰 id
        nodeToken = configJson.SmartContractParams.token; //algod node 접근 토큰
        ipAddress = configJson.SmartContractParams.ip_address; //algod node ip 주소
        port = configJson.SmartContractParams.port; //algod node 포트 번호
        var txn_result = await requestBuyNFT(devAddress, devMnemonic, nftOwnerAddress,buyerAddress,buyerMnemonic, nftID, buyPrice, appID, tokenID, nodeToken, ipAddress, port);
        //nft 구매 요청
        result = txn_result;
        console.log(result);
        //트랜잭션 결과를 프로미스에 담아서 반환.
        return resolve(result);
    }else{
      result = "계정 잔고가 NFT optin하기 위한 최소 nova 금액 미만입니다.";
      console.log(result);
      return resolve(result);
    }
  })
}

function parseMultiParts(req){
  return new Promise( (resolve)=>{
  req.pipe(req.busboy);
  req.busboy.on('field',(name, value, info) => {
        console.log(`Field [${name}]: value: %j`, value);
        arr.push(value);
    });
    return resolve();
})
}


function getAccount(mnemonic){
    console.log(mnemonic);
  return new Promise((resolve)=>{
    let account = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(account);
    return resolve(account);
  })
}
  
function requestBuyNFT(devAddress, devMnemonic, nftOwnerAddress, buyerAddress, buyerMnemonic, nftID, buyPrice, appID, tokenID, nodeToken, ipAddress, port) {
  //axios.post(url[, data[, config]]) 형식으로 사용함.
  return axios.post('http://127.0.0.1:5000/buy_nft',null,{params: {
        dev_address: devAddress,
        dev_mnemonic: devMnemonic,
        nft_owner_address: nftOwnerAddress,
        buyer_address : buyerAddress,
        buyer_mnemonic : buyerMnemonic,
        nft_id: nftID,
        buy_price: buyPrice,
        app_id : appID,
        token_id: tokenID,
        token: nodeToken,
        ip_address: ipAddress+':'+port
    }})  
    .then(function (response) {
        return response;
    })
    .catch(function (error) {
    });
}


module.exports.main = main;