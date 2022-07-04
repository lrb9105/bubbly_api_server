const algosdk = require('algosdk');
var busboy = require('connect-busboy');
const axios = require("axios");
var config = require('../config/get-config-parameter')
var arr = [];
let mnemonic, nftID, appID, sellPrice;

function main(req) {
  return new Promise(async(resolve)=>{
    await parseMultiParts(req); 
    mnemonic = arr[0];
    nftID = arr[1];
    appID = arr[2];
    sellPrice = arr[3];
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
    var txn_result = await requestStopSellNFT(devAddress, devMnemonic, nftOwnerAddress, nftID, appID, sellPrice, tokenID, nodeToken, ipAddress, port);
    result = txn_result;
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
  
function requestStopSellNFT(devAddress, devMnemonic, nftOwnerAddress, nftID, appID, sellPrice, tokenID, nodeToken, ipAddress, port) {
  return axios.post('http://127.0.0.1:5000/stop_sell',null,{params: {
        dev_address: devAddress,
        dev_mnemonic: devMnemonic,
        nft_owner_address: nftOwnerAddress,
        nft_id: nftID,
        app_id: appID,
        sell_price: sellPrice,
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