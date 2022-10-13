// 알고랜드 sdk를 사용하기 위해
const algosdk = require('algosdk');
const crypto = require('crypto');
const fs = require('fs');

// 스마트컨트랙트 실행에 필요한 json파일을 로드하기 위해
const jsonFile = fs.readFileSync(`${__dirname}/config.json`, 'utf8');
console.log(jsonFile);

const configJson = JSON.parse(jsonFile);
console.log(configJson);


/* 
    새로운 블록체인 계정 및 니모닉 생성
    입력: 없음
    출력: {account 객체, mnemonic값}
*/
const makeBlockchainAddrAndMnemonic = function(){
    return new Promise(async function(resolve, reject){
        const account = await algosdk.generateAccount();
        const mnemonic = await algosdk.secretKeyToMnemonic(account.sk);

        const data = {account, mnemonic};

        return resolve(data);
    })
};


/* 
    계정주소를 이용해서 계정정보 확인
    입력: 계정주소
    출력: {account 정보 json객체}
*/
const selectAccountInfo = async (addr) => {
    let acct_string;

    //algod 노드 접근 토큰
    nodeToken = configJson.SmartContractParams.token; 

    //algod 노드 ip 주소
    ipAddress = configJson.SmartContractParams.ip_address;
    
    //algod 노드 포트 
    port = configJson.SmartContractParams.port;

    if(addr != null){
        let algodClient = new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);
    
        let account_info = (await algodClient.accountInformation(addr).do());
    
        acct_string = JSON.stringify(account_info);
    } else {
        acct_string = "Novarand 계정정보가 없습니다.";
    }

    
    return acct_string;
};


// 계정의 주소와 sk(트랜잭션을 전송할 때 사용하는 세션키)를 얻기 위한 함수
const getPk = function(devMnemonic){
    return new Promise(async function(resolve, reject){
        const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);
        
        //console.log("devAddr.addr: " + devAddr.addr);
        //console.log("devAddr.sk: " + devAddr.sk);

        return resolve(devAddr);
    });
};

/*
    개발사 계정 => addr계정으로 입력한 수만큼 Nova 보내기
*/
const sendToAddrByDevAddrWithAmount = function(addr,amount){
    return new Promise(async function(resolve, reject){
        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;
        //개발사 계정주소
        devAddress = configJson.SmartContractParams.dev_address; 
        //개발사 니모닉(우리계정니모닉)
        devMnemonic = configJson.SmartContractParams.dev_mnemonic; 

        let algodClient = await new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);

        let params = await algodClient.getTransactionParams().do();

        const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);


        let txn = {
            "from": devAddress,
            "to": addr,
            "amount": amount,
            "fee": params.fee,
            "firstRound": params.firstRound,
            "lastRound": params.lastRound,
            "genesisID": params.genesisID,
            "genesisHash": params.genesisHash,
            "note": new Uint8Array(0),
        };

        const signedTxn = await algosdk.signTransaction(txn, devAddr.sk);

        const sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do();
        //console.log("Transaction sent with ID " + sendTx.txId);
        await waitForConfirmation(algodClient, sendTx.txId)

        return resolve("success");
    })
}


/* 
    토큰 옵트인
    입력: 옵트인 할 계정주소, 옵트인할 토큰 아이디
    출력: {account 정보 json객체}
*/
const tokenOptIn = function(user_mnemonic, assetID){
    return new Promise(async function(resolve, reject){
        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;
        //개발사 계정주소
        devAddress = configJson.SmartContractParams.dev_address; 
        //개발사 니모닉(우리계정니모닉)
        devMnemonic = configJson.SmartContractParams.dev_mnemonic; 
    
        let algodClient = await new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);
    
        let params = await algodClient.getTransactionParams().do();
        
        const userAddr = await algosdk.mnemonicToSecretKey(user_mnemonic);
    
        params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;
    
        let sender = userAddr.addr;
        let recipient = sender;
        let revocationTarget = undefined;
        let closeRemainderTo = undefined;
        amount = 0;
        note = new Uint8Array(0);
        
        assetID = Number(assetID);    
    
        // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
        let opttxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount, note, assetID, params);
        
        // Must be signed by the account wishing to opt in to the asset    
        rawSignedTxn = await opttxn.signTxn(userAddr.sk);
    
        let opttx = await algodClient.sendRawTransaction(rawSignedTxn).do();
    
        //console.log("Transaction : " + opttx.txId);

        // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, opttx.txId);
    
        return resolve("success");
    })
};


/* 
    토큰 전송
    입력: 보내는 사람의 니모닉, 받는 사람의 니모닉
    출력: {account 정보 json객체}
*/
const transferToken = async (sender_mnemonic, receiverAddr, assetID, amount) => {
    return new Promise(async function(resolve, reject){
        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;

        let algodClient = await new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);

        let params = await algodClient.getTransactionParams().do();

        const senderAddr = await algosdk.mnemonicToSecretKey(sender_mnemonic);

        params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;

        sender = senderAddr.addr;

        // 계정정보 가져오기
        const account_info = await selectAccountInfo(sender);

        const accountObj = JSON.parse(account_info);        
        
        const tokenAmount = await checkTokenAmount(accountObj, assetID);

        if(tokenAmount == "empty"){
            return resolve("해당 토큰을 보유하고 있지 않습니다.");
        }

        // 보유한 버블양이 nft가격보다 적다면
        if(Number(tokenAmount) < Number(amount)){
            return resolve("보유한 토큰양이 전송하려는 토큰양보다 적습니다.");
        }

        if(accountObj.amount < 1000) {
            return resolve("Nova가 부족합니다.");
        }

        recipient = receiverAddr;
        revocationTarget = undefined;
        closeRemainderTo = undefined;
        note = new Uint8Array(0)
            
        assetID = Number(assetID);

        // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        let xtxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget, amount,  note, assetID, params);
        
        // Must be signed by the account sending the asset  
        rawSignedTxn = await xtxn.signTxn(senderAddr.sk)

        let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        //console.log("Transaction : " + xtx.txId);
        
        // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, xtx.txId);

        //await printAssetHolding(algodclient, receiverAddr.addr, assetID);
        return resolve("success");
    });
};


// 트랜잭션이 완료될 때까지 대기
const waitForConfirmation = async function (algodclient, txId) {
    let response = await algodclient.status().do();
    let lastround = response["last-round"];
    while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
            //Got the completed Transaction
            console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
            break;
        }
        lastround++;
        await algodclient.statusAfterBlock(lastround).do();
    }
};


/**
 * 
 * @param  mnemonic => 토큰을 생성할 계정의 니모닉 
 * @param  unitName => 토큰 단위
 * @param  assetName => 토큰 명
 * @param  amount => 발행할 토큰 양
 * @returns 
 */
const createToken = async function createAsset(mnemonic, unitName, assetName, amount) {
    return new Promise(async function(resolve, reject){

        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;

        const algodClient = await new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);
        console.log("algod client");

        const account = await getPk(mnemonic);
        console.log("account: " + account.addr);

        console.log("==> CREATE ASSET");
        //Check account balance    
        const accountInfo = await algodClient.accountInformation(account.addr).do();
        const startingAmount = accountInfo.amount;
        console.log("account balance: %d microNovas", startingAmount);

        // Construct the transaction
        const params = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        // params.fee = 1000;
        // params.flatFee = true;
        // const closeout = receiver; //closeRemainderTo
        // WARNING! all remaining funds in the sender account above will be sent to the closeRemainderTo Account 
        // In order to keep all remaining funds in the sender account after tx, set closeout parameter to undefined.
        // For more info see: 
        // https://developer.algorand.org/docs/reference/transactions/#payment-transaction
        // Asset creation specific parameters
        // The following parameters are asset specific
        // Throughout the example these will be re-used. 

        // Whether user accounts will need to be unfrozen before transacting    
        const defaultFrozen = false;
        // Optional string pointing to a URL relating to the asset

        // const metadataJSON = {
        //     "name": "ALICECOI",
        //     "description": "Alice's Coins",
        //     "properties": {
        //         "simple_property": "Alice's coins",
        //         "rich_property": {
        //             "name": "AliceCoi",
        //             "value": "001",
        //             "display_value": "001",
        //             "class": "emphasis",
        //             "css": {
        //                 "color": "#ffffff",
        //                 "font-weight": "bold",
        //                 "text-decoration": "underline"
        //             }
        //         },
        //         "array_property": {
        //             "name": "Alice Coins",
        //             "value": [1, 2, 3, 4],
        //             "class": "emphasis"
        //         }
        //     }
        // }

        const metadataJSON = {
            "name": assetName,
            "description": assetName,
            "properties": {
                "simple_property": assetName,
                "rich_property": {
                    "name": assetName,
                    "value": "001",
                    "display_value": "001",
                    "class": "emphasis",
                    "css": {
                        "color": "#ffffff",
                        "font-weight": "bold",
                        "text-decoration": "underline"
                    }
                },
                "array_property": {
                    "name": assetName,
                    "value": [1, 2, 3, 4],
                    "class": "emphasis"
                }
            }
        }

        // The following parameters are the only ones
        // that can be changed, and they have to be changed
        // by the current manager
        // Specified address can change reserve, freeze, clawback, and manager
        // If they are set to undefined at creation time, you will not be able to modify these later
        const managerAddr = account.addr; // OPTIONAL: FOR DEMO ONLY, USED TO DESTROY ASSET WITHIN THIS SCRIPT
        // Specified address is considered the asset reserve
        // (it has no special privileges, this is only informational)
        const reserveAddr = undefined; 
        // Specified address can freeze or unfreeze user asset holdings   
        const freezeAddr = undefined;
        // Specified address can revoke user asset holdings and send 
        // them to other addresses    
        const clawbackAddr = undefined;
        
        // Use actual asset total  > 1 to create a Fungible Token
        // example 1:(fungible Tokens)
        // totalIssuance = 10, decimals = 0, result is 10 actual asset total
        // example 2: (fractional NFT, each is 0.1)
        // totalIssuance = 10, decimals = 1, result is 1.0 actual asset total
        // example 3: (NFT)
        // totalIssuance = 1, decimals = 0, result is 1 actual asset total 

        // integer number of decimals for asset unit calculation
        // decimals이 6인 경우 1토큰 => 10^6decimal
        //(ex 토큰명 bubble이고 decemial이 6일 때 총 발행량이 100개라면 실제 발행량은 100 * 10^6개가 된다.)
        const decimals = 6; 
        const total = amount; // how many of this asset there will be

        // temp fix for replit    
        const metadatafile = metadataJSON.toString();
        const hash = crypto.createHash('sha256');
        hash.update(metadatafile);

        // replit error  - work around
        const metadata = new Uint8Array(hash.digest());
        //const metadata = "16efaa3924a6fd9d3a4824799a4ac65d";
        // replit error  - the following only runs in debug mode in replit, and use this in your code
        // const metadata = new Uint8Array(hash.digest()); // use this in your code


        // signing and sending "txn" allows "addr" to create an asset 
        const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
            from: account.addr,
            total,
            decimals,
            assetName,
            unitName,
            assetMetadataHash: metadata,
            defaultFrozen,
            freeze: freezeAddr,
            manager: managerAddr,
            clawback: clawbackAddr,
            reserve: reserveAddr,
            suggestedParams: params,});

        const rawSignedTxn = txn.signTxn(account.sk);
        const tx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        let assetID = null;

        // wait for transaction to be confirmed
        const ptx = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);
        //console.log("Transaction " + tx.txId + " confirmed in round " + ptx["confirmed-round"]);

        //Get the completed Transaction
        assetID = ptx["asset-index"];
        // console.log("AssetID = " + assetID);

        //await printCreatedAsset(algodClient, account.addr, assetID);
        //await printAssetHolding(algodClient, account.addr, assetID);
        // console.log("You can verify the metadata-hash above in the asset creation details");
        // console.log("Using terminal the Metadata hash should appear as identical to the output of");
        // console.log("cat metadata.json | openssl dgst -sha256 -binary | openssl base64 -A");
        // console.log("That is: V6XCVkh97N3ym+eEZCSfWFyON3bT1PVHdCh6LwVvWPY=");

        // console.log("assetID: " + assetID);

        return resolve(assetID);
    });
}

// 개발사 계정에게 토큰 전송
const transferTokenToDevAmount = async (sender_mnemonic, assetID, amount) => {
    return new Promise(async function(resolve, reject){
        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;
        //개발사 계정주소
        devAddress = configJson.SmartContractParams.dev_address; 
        //개발사 니모닉(우리계정니모닉)
        devMnemonic = configJson.SmartContractParams.dev_mnemonic; 
        let algodClient = await new algosdk.Algodv2({"X-Algo-API-Token" : nodeToken}, ipAddress, port);

        let params = await algodClient.getTransactionParams().do();
        //사용자가 송금자
        const senderAddr = await algosdk.mnemonicToSecretKey(sender_mnemonic);

        let sender = senderAddr.addr;

        // 계정정보 가져오기
        const account_info = await selectAccountInfo(sender);

        const accountObj = JSON.parse(account_info);        
        
        const tokenAmount = await checkTokenAmount(accountObj, assetID);

        if(tokenAmount == "empty"){
            return resolve("해당 토큰을 보유하고 있지 않습니다.");
        }

        // 보유한 버블양이 nft가격보다 적다면
        if(Number(tokenAmount) < Number(amount)){
            return resolve("보유한 토큰양이 전송하려는 토큰양보다 적습니다.");
        }

        if(accountObj.amount < 1000) {
            return resolve("Nova가 부족합니다.");
        }

        //개발사가 수신자
        const receiverAddr = await algosdk.mnemonicToSecretKey(devMnemonic);
        params = await algodClient.getTransactionParams().do();
        params.fee = 1000;
        params.flatFee = true;

        let recipient = receiverAddr.addr;
        let revocationTarget = undefined;
        let closeRemainderTo = undefined;
        note = new Uint8Array(0)
        //Amount of the asset to transfer
        amount = amount;
        
        assetID = Number(assetID);

        // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        let xtxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount, note, assetID, params);
        // Must be signed by the account sending the asset  
        rawSignedTxn = await xtxn.signTxn(senderAddr.sk)
        let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        //console.log("Transaction : " + xtx.txId);
        // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, xtx.txId);
        //await printAssetHolding(algodclient, receiverAddr.addr, assetID);
        return resolve("success");
    });
};

// 보유한 토큰양 체크
const checkTokenAmount = async(accountObj, assetID) => {
    return new Promise(async(resolve)=>{
        for(let i = 0; i < accountObj.assets.length; i ++ ){
            if(accountObj.assets[i]["asset-id"] == assetID){
                console.log("amount: " + accountObj.assets[i]["amount"]);
                //문자열로 반환
                return resolve("" + accountObj.assets[i]["amount"]);
            }
        }
        return resolve("empty");
    });
}




module.exports = { makeBlockchainAddrAndMnemonic, selectAccountInfo, tokenOptIn, transferToken, sendToAddrByDevAddrWithAmount, getPk, createToken, transferTokenToDevAmount};
