const algosdk = require('algosdk');
var algod = require('../config/algod-connection');
function checkBalance(address){
    return new Promise(async(resolve)=>{
        var result;
        var algodClient = await algod.getConnection();
        let accountInfo = await algodClient.accountInformation(address).do();
        
        console.log(accountInfo);

        console.log("Account balance: %d microAlgos", accountInfo.amount);
        if(accountInfo.amount>1000){
            result = true;
        }else{
            result = false;
        }
        return resolve(result);
    })
}

module.exports.checkBalance = checkBalance;
