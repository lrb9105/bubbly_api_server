// 랜덤파일명을 만들기 위해
const { randomFillSync } = require('crypto');
// 알고랜드 sdk를 사용하기 위해
const algosdk = require('algosdk');
// 파일스트림을 이용하기 위해
const fs = require('fs');
// 파이썬 프로그램으로 폼데이터를 보내기위해
const FormData = require("form-data");
// 파이썬 프로그램과 http통신을 하기 위해
const axios = require("axios");
// 폴더경로 + 파일명을 합치기위해
const path = require('path');
// 생성시간 저장 위해 사용
const time = require('../../util/time');
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../../db/maria');
// 스마트컨트랙트 실행에 필요한 json파일을 로드하기 위해
var config = require('../config/get-config-parameter')
// 충분한 알고양을 가지고 있는지 판단하기 위해
var txn_condition = require('../transaction-condition/check-enough-txn-fee')
// 사용자에게 받아온 정보를 저장하기 위해 사용한 배열
var arr;
// 클라이언트로부터 받은 파라미터 및 클라이언트로부터 받은 파일을 ipfs에 올린 후 반환받은 url객체(metadata_url) 
let metadata_url, imageName, description, assetName, mnemonic;
// 임시파일명. 클라이언트에서 파일을 받아 nft-market img에 이 임시파일명으로 저장 후, 이 파일명으로 다시 읽어서 ipfs에 업로드 
let filetempname; 

function main(req, res) {
  console.log("main 들어옴!");
  return new Promise(async(resolve)=>{
    //클라이언트에서 수신한 파라미터를 배열에 저장 및 수신한 이미지 임시파일 저장.
    await parseMultiParts(req); 
    
    //nft실 소유자 니모닉 -> flask nft생성 요청시 사용
    mnemonic = arr[0]; 
    //자산명 -> flask nft생성 요청시 사용
    assetName = arr[1]; 
    //이미지명 -> ipfs이미지 메타데이터 저장시 사용
    imageName = assetName; 
    //디스크립션-> ipfs이미지 메타데이터 저장시 사용
    description = arr[2]; 
    user_id = arr[3]; 
    post_id = arr[4]; 

    //nft실소유자 계정정보 가져오기
    var account = await getAccount(mnemonic);
    
    
    //트랜잭션하기 위한 최소 코인 보유했는지 확인
    var isBalanceMoreThanMin = await txn_condition.checkBalance(account.addr);
    
    
    // nft생성자가 가진 알고양이 1000microAlogs보다 많은지 확인(이것보다 적으면 트랜잭션 생성이 불가하다)
    if(isBalanceMoreThanMin){
      //파일명과 이미지명을 변수로 ipfs 저장 http post요청 함수
      var prom = storeMetaData(imageName,filetempname); 
      
      prom.then(async(res)=>{
        //비동기 방식으로 임시 이미지 파일 삭제
        var removeFrom = path.join(`${__dirname}/img`, filetempname);
        
        console.log("storeMetaData 완료");

        fs.unlink(removeFrom, err => {
          if(err!=null){
          console.log("파일 삭제 Error 발생");
          }
        });

        //ipfs저장후 반환된 res를 파싱하여 metadata json경로로 할당
        metadata_url = res.value.url;
        console.log("metadata_url: " + metadata_url);
        
        arr.push(metadata_url); //배열에 nft생성관련 정보 담기 위해 메타데이터 url도 배열에 추가
        //smart contract app(flask) 전송 정보 리스트업
        let devAddress, devMnemonic, nftOwnerAddress, nftOwnerMnemonic, nodeToken, ipAddress, port; 
        var configJson = await config.getConfigJson();

        //개발사 계정주소
        devAddress = configJson.SmartContractParams.dev_address; 
        //개발사 니모닉(우리계정니모닉)
        devMnemonic = configJson.SmartContractParams.dev_mnemonic; 
        
        //nft실소유자 주소
        nftOwnerAddress = account.addr;
        //클라이언트에서 받아온 nft실소유자 니모닉 
        nftOwnerMnemonic = mnemonic;
        //단위명이지만 수량이 1개이므로 piece로 defult로 하던가, 또는 코드와 같이 assetName으로 해도 무방함. 
        unitName = "bubbly"; 
        //에셋명. 사용자가 바꾸지않고 클라이언트에서 임시로 생성해서 전달받아도 무방함.
        assetName = assetName; 
        //ipfs에 nft저장 후 반환된 metadata저장된 제이슨 ipfs 파일 경로
        nftURL = metadata_url; 
        //algod 노드 접근 토큰
        nodeToken = configJson.SmartContractParams.token; 
        //algod 노드 ip 주소
        ipAddress = configJson.SmartContractParams.ip_address;
        //algod 노드 포트 
        port = configJson.SmartContractParams.port;

        var txn_result = await requestCreateNFT(devAddress, devMnemonic, nftOwnerAddress, nftOwnerMnemonic, unitName, assetName, nftURL, nodeToken, ipAddress, port);
        result = txn_result;
        
        const nft_id = result.data["nft_id"];

        // 이미지 저장경로를 가져온다.
        let fileSaveUrl = await metadata_url.replace("ipfs://","https://ipfs.io/ipfs/");

        await axios.get(metadataUrl)
        .then(async (response) =>{
            let imageUrl = response.data["image"];
            fileSaveUrl = imageUrl.replace("ipfs://","https://ipfs.io/ipfs/");

            console.log(fileSaveUrl);
            console.log("생성한 nft 블록체인에 저장");

            // db에 저장
            // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
            let queryStr = 'insert into nft (nft_id, holder_id, nft_name, nft_desc, cre_datetime_nft, file_save_url) values (?)';
            let datas = [nft_id, user_id, assetName, description, time.timeToKr(), fileSaveUrl];
            
            // 저장!
            await maria.query(queryStr, [datas], async function(err, rows, fields){
                if(!err){
                    console.log("생성한 nft db에 저장");

                    // 해당 nft가 포함된 게시물 nft_yn "y"로 업데이트 
                    let queryStr = "update post set nft_post_yn = 'y', nft_id = ? where post_id = ?";
                    let datas = [nft_id, post_id];
                    
                    await maria.query(queryStr, datas, function(err, rows, fields){
                        if(!err){
                            console.log("성공");
                            console.log("nft로 생성한 게시물 nft_yn값 변경");
                        } else {
                            console.log("실패");
                            console.log(err);
                            res.send("fail");
                        }
                    });
                } else {
                    console.log("실패");
                    console.log(err);
                    res.send("fail");
                }
            });
        })
        .catch((err) => {
            console.log("Error!!",err);
        });

        /*
        console.log(fileSaveUrl);
        console.log("생성한 nft 블록체인에 저장");

        // db에 저장
        // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
        let queryStr = 'insert into nft (nft_id, holder_id, nft_name, nft_desc, cre_datetime_nft, file_save_url) values (?)';
        let datas = [nft_id, user_id, assetName, description, time.timeToKr(), fileSaveUrl];
        
        // 저장!
        await maria.query(queryStr, [datas], async function(err, rows, fields){
          if(!err){
              console.log("생성한 nft db에 저장");

              // 해당 nft가 포함된 게시물 nft_yn "y"로 업데이트 
              let queryStr = "update post set nft_post_yn = 'y', nft_id = ? where post_id = ?";
              let datas = [nft_id, post_id];
              
              await maria.query(queryStr, datas, function(err, rows, fields){
                  if(!err){
                      console.log("성공");
                      console.log("nft로 생성한 게시물 nft_yn값 변경");

                      return resolve("success");
                  } else {
                      console.log("실패");
                      console.log(err);
                      return resolve("fail");
                  }
              });
          } else {
              console.log("실패");
              console.log(err);
              return resolve("fail");
          }
        });*/
      });
    }else{
      result = "계정 잔고가 NFT optin하기 위한 최소 nova 금액 미만입니다.";
      console.log(result);
    return resolve(result);
    }
  })
}


function parseMultiParts(req){
  arr = [];
  console.log("parseMultiParts 들어옴!");

  return new Promise( (resolve)=>{
  console.log("parseMultiParts return 들어옴!");

  var image;
  req.pipe(req.busboy);
  req.busboy.on('field',(name, value, info) => { //텍스트 정보를 읽어와 배열에 저장.
        console.log(`Field [${name}]: value: %j`, value);
        arr.push(value);
    });
  req.busboy.on('file', (name, file, info) => { //파일정보를 읽어와 
      const { filename, encoding, mimeType } = info;
      var filetypes = mimeType.split("/"); //파일 정보의 mime타입에서 뒤의 확장자 가져오기(image/png)
      var filetype = filetypes[1];
      console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`,filename,encoding,mimeType);
      filetempname = `${random()}.${filetype}`; //랜덤하게 파일명 생성
      var saveTo = path.join(`${__dirname}/img`, filetempname); //파일저장경로 생성
      file.pipe(fs.createWriteStream(saveTo)); //file객체의 파이프라인에 있는 바이트를 읽어와 saveTo 경로에 파일 생성 
      
      console.log("임시파일 저장경로: " + saveTo);
      
      return resolve();
    });
  })
}

// ipfs에 nft의 원본데이터와 메타데이터 저장
function storeMetaData(imagename, filename){
  //메타데이터 제이슨 스트링 만들 문자열 생성
  const metaDataJson = `{"name": "${imagename}", "image": "undefined","properties": {"videoClip": "undefined"}}`;
  
  console.log("metaDataJson: " + metaDataJson);

  //api.nft.storage에 form으로 보내기 위한 객체 로드
  const form = new FormData();
  
  //form에 추가. meta키에 위 제이슨 스트링을 value로 전달
  form.append("meta",metaDataJson); 
  
  //form에 추가. image키에 클라이언트에서 전달해서 임시저장했던 이미지 파일 blob을 value로 전달
  var openFrom = path.join(`${__dirname}/img`, filename);
  form.append("image", fs.createReadStream(openFrom)); 
  
  return axios
  .post("https://api.nft.storage/store", form, {
    headers: {
      'Content-Type': 'multipart/form-data', 
      'accept': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDQ3MjREODUwOTcwMmQzMDAzRUM4NEY0OTFBRDcyRjQxNzgwODNDMUUiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1NDkzNjc5Njc4MCwibmFtZSI6ImJ1YmJseSJ9.hLcWfZWJOCNzCzZCpZe8t0kmfRbk1oFmnIcVvLlSWyM', //nft-storage 토큰
    },
  })
  .then((response) =>{
    console.log("ipfs데이터 저장: " + response.data);
    return response.data;
  })
  .catch((err) => {
    console.log("Error!!",err);
  });
}

const random = (() => {
  const buf = Buffer.alloc(16);
  return () => randomFillSync(buf).toString('hex');
})();


function getAccount(mnemonic){
  return new Promise((resolve)=>{
    console.log("mnemonic: " + mnemonic);

    let account = algosdk.mnemonicToSecretKey(mnemonic);
    return resolve(account);
  })
}

// nft생성 스마트컨트랙트에게 요청
function requestCreateNFT(devAddress, devMnemonic, nftOwnerAddress, nftOwnerMnemonic, unitName, assetName, nftURL, nodeToken, ipAddress,port) {
  //axios.post(url[, data[, config]]) 형식으로 사용함.
  console.log("requestCreateNFT: 들어옴");
  
  return axios.post('http://127.0.0.1:5000/create_nft',null,{params: {
            dev_address: devAddress,
            dev_mnemonic: devMnemonic,
            nft_owner_address: nftOwnerAddress,
            nft_owner_mnemonic: nftOwnerMnemonic,
            unit_name: unitName,
            asset_name: assetName,
            nft_url: nftURL,
            token: nodeToken,
            ip_address: ipAddress+':'+port
            //ip_address: ipAddress
        }})  
        .then(function (response) {
          console.log("response: " + response);
          return response;
        })
        .catch(function (error) {
            console.log("error: " + error);
        });
}


module.exports.main = main;