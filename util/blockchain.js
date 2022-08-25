// 알고랜드 sdk를 사용하기 위해
const algosdk = require('algosdk');
// 스마트컨트랙트 실행에 필요한 json파일을 로드하기 위해
var config = require('../backendForSmartContract/config/get-config-parameter')

/* 
    새로운 블록체인 계정 및 니모닉 생성
    입력: 없음
    출력: {account 객체, mnemonic값}
*/
/*
const makeBlockchainAddrAndMnemonic = async () => {
    const account = await algosdk.generateAccount();
    const mnemonic = await algosdk.secretKeyToMnemonic(account.sk);

    const data = {account, mnemonic};

    return data;
};
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
    let configJson = await config.getConfigJson();
    let acct_string;

    //algod 노드 접근 토큰
    nodeToken = configJson.SmartContractParams.token; 
    console.log("algod 노드 접근 토큰: " + nodeToken);

    //algod 노드 ip 주소
    ipAddress = configJson.SmartContractParams.ip_address;
    console.log("algod 노드 접근 ipAddress: " + ipAddress);
    //algod 노드 포트 
    port = configJson.SmartContractParams.port;
    console.log("algod 노드 접근 port: " + port);

    if(addr != null){
        let algodClient = new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);
        console.log("algodClient: " + algodClient);
    
        let account_info = (await algodClient.accountInformation(addr).do());
    
        acct_string = JSON.stringify(account_info);
        console.log("Account Info: " + acct_string);
    } else {
        acct_string = "Novarand 계정정보가 없습니다.";
    }

    
    return acct_string;
};

/* 
    개발계정이 새로운 계정에게 algo 전송(opt-in위해서)
    입력: 계정주소
    출력: {account 정보 json객체}
*/
/*
const sendToAddrByDevAddr = async (addr) => {
    let configJson = await config.getConfigJson();

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

    let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);

    let params = await algodClient.getTransactionParams().do();

    const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);


    let txn = {
        "from": devAddress,
        "to": addr,
        "amount": 210000,
        "fee": params.fee,
        "firstRound": params.firstRound,
        "lastRound": params.lastRound,
        "genesisID": params.genesisID,
        "genesisHash": params.genesisHash,
        "note": new Uint8Array(0),
    };

    const signedTxn = await algosdk.signTransaction(txn, devAddr.sk);

    const sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do();
    console.log("Transaction sent with ID " + sendTx.txId);
    await waitForConfirmation(algodClient, sendTx.txId)

    return "success";
};
*/

const sendToAddrByDevAddr = function(addr){
    return new Promise(async function(resolve, reject){
        let configJson = await config.getConfigJson();

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

        let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);

        let params = await algodClient.getTransactionParams().do();

        const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);


        let txn = {
            "from": devAddress,
            "to": addr,
            "amount": 210000,
            "fee": params.fee,
            "firstRound": params.firstRound,
            "lastRound": params.lastRound,
            "genesisID": params.genesisID,
            "genesisHash": params.genesisHash,
            "note": new Uint8Array(0),
        };

        const signedTxn = await algosdk.signTransaction(txn, devAddr.sk);

        const sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do();
        console.log("Transaction sent with ID " + sendTx.txId);
        await waitForConfirmation(algodClient, sendTx.txId)

        return resolve("success");
    })
};

/* 
    토큰 옵트인
    입력: 계정주소
    출력: {account 정보 json객체}
*/
/*
const tokenOptIn = async (user_mnemonic, assetID) => {
    let configJson = await config.getConfigJson();

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

    let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);

    let params = await algodClient.getTransactionParams().do();

    const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);

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


    // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
    let opttxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount, note, assetID, params);

    console.log("opttxn: " + opttxn);

    // Must be signed by the account wishing to opt in to the asset    
    rawSignedTxn = await opttxn.signTxn(userAddr.sk);


    let opttx = await algodClient.sendRawTransaction(rawSignedTxn).do();

    console.log("Transaction : " + opttx.txId);
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, opttx.txId);

    return("success");

};
*/
const tokenOptIn = function(user_mnemonic, assetID){
    return new Promise(async function(resolve, reject){
        let configJson = await config.getConfigJson();

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
    
        let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);
    
        let params = await algodClient.getTransactionParams().do();
    
        const devAddr = await algosdk.mnemonicToSecretKey(devMnemonic);
    
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
    
    
        // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
        let opttxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount, note, assetID, params);
    
        console.log("opttxn: " + opttxn);
    
        // Must be signed by the account wishing to opt in to the asset    
        rawSignedTxn = await opttxn.signTxn(userAddr.sk);
    
    
        let opttx = await algodClient.sendRawTransaction(rawSignedTxn).do();
    
        console.log("Transaction : " + opttx.txId);
        // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, opttx.txId);
    
        return("success");
    })
};


/* 
    버블 전송
    입력: 계정주소
    출력: {account 정보 json객체}
*/
const transferToken = async (sender_mnemonic, receiver_mnemonic, assetID) => {
    let configJson = await config.getConfigJson();

    //algod 노드 접근 토큰
    nodeToken = configJson.SmartContractParams.token; 
    //algod 노드 ip 주소
    ipAddress = configJson.SmartContractParams.ip_address;
    //algod 노드 포트 
    port = configJson.SmartContractParams.port;

    let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);

    let params = await algodClient.getTransactionParams().do();

    const senderAddr = await algosdk.mnemonicToSecretKey(sender_mnemonic);

    const receiverAddr = await algosdk.mnemonicToSecretKey(receiver_mnemonic);

    params = await algodClient.getTransactionParams().do();
    params.fee = 1000;
    params.flatFee = true;

    sender = senderAddr.addr;
    recipient = receiverAddr.addr;
    revocationTarget = undefined;
    closeRemainderTo = undefined;
    note = new Uint8Array(0)
    //Amount of the asset to transfer
    amount = 1000;

    // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
    let xtxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount,  note, assetID, params);
    
    // Must be signed by the account sending the asset  
    rawSignedTxn = await xtxn.signTxn(senderAddr.sk)

    let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + xtx.txId);
    
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, xtx.txId);

    //await printAssetHolding(algodclient, receiverAddr.addr, assetID);
};

/* 
    버블 전송
    입력: 계정주소
    출력: {account 정보 json객체}
*/
const transferTokenByAccount = async (sender_mnemonic, receiverAddr, assetID) => {
    let configJson = await config.getConfigJson();

    //algod 노드 접근 토큰
    nodeToken = configJson.SmartContractParams.token; 

    //algod 노드 ip 주소
    ipAddress = configJson.SmartContractParams.ip_address;
    
    //algod 노드 포트 
    port = configJson.SmartContractParams.port;

    let algodClient = await new algosdk.Algodv2({"X-API-Key" : nodeToken}, ipAddress, port);

    let params = await algodClient.getTransactionParams().do();

    const senderAddr = await algosdk.mnemonicToSecretKey(sender_mnemonic);

    params = await algodClient.getTransactionParams().do();
    params.fee = 1000;
    params.flatFee = true;

    sender = senderAddr.addr;
    recipient = receiverAddr;
    revocationTarget = undefined;
    closeRemainderTo = undefined;
    note = new Uint8Array(0)
    //Amount of the asset to transfer
    amount = 10000000000;

    // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
    let xtxn = await algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,amount,  note, assetID, params);
    
    // Must be signed by the account sending the asset  
    rawSignedTxn = await xtxn.signTxn(senderAddr.sk)

    let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
    console.log("Transaction : " + xtx.txId);
    
    // wait for transaction to be confirmed
    await waitForConfirmation(algodClient, xtx.txId);

    //await printAssetHolding(algodclient, receiverAddr.addr, assetID);
};



// Function used to wait for a tx confirmation
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

// Function used to print asset holding for account and assetid
const printAssetHolding = async function (algodclient, account, assetid) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodclient.accountInformation(account).do();
    
    console.log("accountInfo: " + accountInfo);

    for (idx = 0; idx < accountInfo['assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] == assetid) {
            let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
            console.log("assetholdinginfo = " + myassetholding);
            break;
        }
    }

    return "success";
};

module.exports = { makeBlockchainAddrAndMnemonic, selectAccountInfo, sendToAddrByDevAddr, tokenOptIn, transferToken, transferTokenByAccount};