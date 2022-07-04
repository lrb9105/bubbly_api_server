const algosdk = require('algosdk');
var busboy = require('connect-busboy');
const axios = require("axios");
var config = require('../config/get-config-parameter')
var algod = require('../config/algod-connection')

function main(postWriterAddress,totalNumberOfHeartPerPost) {
    return new Promise(async(resolve)=>{
    var result;
    if(totalNumberOfHeartPerPost>=10){
        var lastDigitStr = String(totalNumberOfHeartPerPost).slice(-1); //포스트의 총 하트수 숫자의 맨 마지막 자리수
        var lastDigitNum = Number(lastDigitStr); //스트링을 숫자로 변환
        var configJson = await config.getConfigJson();
        // 개발 계정의 니모닉!(서버에 설치된 노드에서 계정하나 만들어서 걔 사용하면 될 듯)
        var devMnemonic = configJson.SmartContractParams.dev_mnemonic;
        var account = await getAccount(devMnemonic);
        let devPK = account.sk; //config파일에 비밀키가 있는데 니모닉을 통해서 가져오는 이유는, flask로 넘격던 다른 함수와 달리 
        //이 경우에는 backend에서 바로 서명해야 하기 때문에 uint로 인코딩된 값을 그대로 가져와서 서명으로 추가함.
        let sender = account.addr;
        let revocationTarget = undefined; //undefinde로 되어 있어야 이 변수에 실주소가 있는지 없는지 검증하지 않는다.
        let closeRemainderTo = undefined; //undefinde로 되어 있어야 이 변수에 실주소가 있는지 없는지 검증하지 않는다.
            if(lastDigitNum == 0){ //맨 마지막 자리숫자 0이어야 정산한다. (10,20,30,...,100,110,...)
                //총 하트수의 마지막 숫자가 0이면, 10단위씩 증가한 것으로 본다.
                //1개의 토큰을 transaction한다.
                let algodClient = await algod.getConnection();
                let params = await algodClient.getTransactionParams().do();
                params.fee = algosdk.ALGORAND_MIN_TX_FEE;
                params.flatFee = true;
                let receiver = postWriterAddress;
                let enc = new TextEncoder();
                let note = enc.encode("Hello World");
                let amount = 1;
                let tokenID = configJson.SmartContractParams.token_id;
                tokenID = parseInt(tokenID)
                console.log(tokenID);
                let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
                    sender, 
                    receiver,
                    closeRemainderTo, 
                    revocationTarget,
                    amount,  
                    note, 
                    tokenID, 
                    params);
                rawSignedTxn = xtxn.signTxn(devPK)
                let txId = xtxn.txID().toString();
                console.log("Signed transaction with txID: %s", txId);
                let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
                let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
                console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
                let string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
                console.log("Note field: ", string);
                accountInfo = await algodClient.accountInformation(sender).do();
                console.log("Account balance: %d microAlgos", accountInfo.amount);
                accountInfo = await algodClient.accountInformation(receiver).do();
                console.log("Account balance: %d microAlgos",  accountInfo.amount);
                // accountInfo = await algodClient.accountAssetInformation(sender,tokenID).do();
                // console.log("Account balance: %d microAlgos", accountInfo);
                // accountInfo = await algodClient.accountAssetInformation(receiver,tokenID).do();
                // console.log("Account balance: %d microAlgos", accountInfo);
                result=txId;
                return resolve(result);
            }else{
                result = "현재 10개당 1개의 토큰을 지급합니다.";
                return resolve(result);
            }
   }else{
    result = "총 하트수가 10이하입니다. 현재 10개당 1개의 토큰을 지급합니다.";
    return resolve(result);
   }
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


module.exports.main = main;