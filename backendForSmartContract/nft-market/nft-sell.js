const algosdk = require('algosdk');
var busboy = require('connect-busboy');
const axios = require("axios");
var config = require('../config/get-config-parameter')
// 생성시간 저장 위해 사용
const time = require('../../util/time');
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../../db/maria');
var arr = [];
let mnemonic, nftID, sellPrice;

function main(req,res) {
  return new Promise(async(resolve)=>{
    await parseMultiParts(req); 
    mnemonic = arr[0]; //nft실소유자 주소
    nftID = arr[1];
    sellPrice = arr[2];
    sellerId = arr[3];
    nftDesc = arr[4];

    var account = await getAccount(mnemonic);
    let devAddress, devMnemonic, nftOwnerAddress, token_id, nodeToken, ipAddress, port;
    var configJson = await config.getConfigJson();
    devAddress = configJson.SmartContractParams.dev_address;
    devMnemonic = configJson.SmartContractParams.dev_mnemonic; //개발사 니모닉(우리계정니모닉)
    nftOwnerAddress = account.addr;
    tokenID = configJson.SmartContractParams.token_id; //디앱에서 사용되는 화폐(토큰) id
    nodeToken = configJson.SmartContractParams.token; //algod 노드 덥근 토큰
    ipAddress = configJson.SmartContractParams.ip_address;
    port = configJson.SmartContractParams.port;
    var txn_result = await requestSellNFT(devAddress, devMnemonic, nftOwnerAddress, nftID, sellPrice, tokenID, nodeToken, ipAddress, port);
    result = txn_result;

    // db에 저장
    const app_id = result.data["app_id"];

    // db에 저장
    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'insert into nft_sell (nft_id, seller_id, sell_price, nft_desc, app_id, buy_yn, cre_datetime_sell_start) values (?)';
    let datas = [nftID, sellerId, sellPrice, nftDesc, app_id, 'n', time.timeToKr()];
        
    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
        } else {
            console.log("실패");
            console.log(err);
            res.send("fail");
        }
    });
    
    console.log(result);
    return resolve(result);
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
  
function requestSellNFT(devAddress, devMnemonic, nftOwnerAddress, nftID, sellPrice, tokenID, nodeToken, ipAddress, port) {
  return axios.post('http://127.0.0.1:5000/sell_nft',null,{params: {
        dev_address: devAddress,
        dev_mnemonic: devMnemonic,
        nft_owner_address: nftOwnerAddress,
        nft_id: nftID,
        sell_price: sellPrice,
        token_id: tokenID,
        token: nodeToken,
        //ip_address: ipAddress+':'+port
        ip_address: ipAddress
    }})  
    .then(function (response) {
        return response;
    })
    .catch(function (error) {
    });
}


module.exports.main = main;