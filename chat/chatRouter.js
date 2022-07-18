const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');
// s3버킷명
const BUCKET_NAME = 'bubbly-s3';
// aws-sdk를 사용하기 위해 가져 옴
const AWS = require('aws-sdk');
// 설정파일
const config = require('../config/config');
// s3에 접근하기 위해 accessKeyId와 secretAccessKey값을 넣어주고 s3객체를 생성한다.
const s3 = new AWS.S3({accessKeyId: config.s3_accessKeyId, secretAccessKey: config.s3_secretAccessKey});
// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

/* 
    역할: 채팅방을 생성한다.
    input: req, res
    output: 없음
*/
router.post('/createChatRoom', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    const chatRoomInfo = req.body;
    
    const chatRoomName = chatRoomInfo["chatRoomName"];
    
    console.log(chatRoomName);
    const cahtRoomMemberList = chatRoomInfo["cahtRoomMemberList"];
    console.log(cahtRoomMemberList[0]["user_id"]);

    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr = 'insert into chat_room (chat_room_name, cre_datetime_chat_room) values (?)';
    let datas = [chatRoomName, time.timeToKr()];
    
    // 저장!
    await maria.query(queryStr, [datas], async function(err, rows, fields){
        if(!err){
            // 채팅방 id를 가져온다.
            let queryStr2 = 'select max(chat_room_id) chat_room_id from chat_room ';
            
            await maria.query(queryStr2, [datas], async function(err, rows, fields){
                if(!err){
                    console.log("성공");
                    // 채팅방 아이디
                    const chatRoomId = rows[0].chat_room_id;
                    
                    // 채팅방 멤버의 정보리스트를 만든다.
                    const memberSize = cahtRoomMemberList.length;
                    let memberQuery = "";
                    let timeArr = [];

                    for(let i = 0; i < memberSize; i++){
                        const userId = cahtRoomMemberList[i]["user_id"];
                        memberQuery += "(" + userId + ", " + chatRoomId + ", ?),"
                        timeArr[i] = time.timeToKr();
                    }
                    // 마지막 쉼표 제거
                    memberQuery = memberQuery.substring(0, memberQuery.length - 1);
                    
                    console.log("memberQuery: " + memberQuery);

                    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
                    let queryStr3 = 'insert into chat_participant (user_id, chat_room_id, cre_datetime_participation) values ' + memberQuery;                    
                    
                    // 저장!
                    await maria.query(queryStr3, timeArr, function(err, rows, fields){
                        if(!err){
                            console.log("성공");
                            res.send("success");
                        } else {
                            console.log("실패");
                            console.log(err);
                            res.send(err);
                            return;
                        }
                    });
                } else {
                    console.log("실패");
                    console.log(err);
                    res.send("fail");
                    return;
                }
            });
        } else {
            console.log("실패");
            console.log(err);
            res.send("fail");
            return;
        }
    });
});

// 채팅방 프로필 수정
router.post('/updateChatRoomProfile', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);
    
    // 해당 채팅방의 기존 저장파일명을 가져온다.
    let sql = 'select profile_file_name from chat_room where chat_room_id = ' + Number(hashmap.get("chat_room_id"));

    await maria.query(sql, function (err, result, fields) {
        if (err) {
            console.log(sql);
            console.log(2222);
            throw err;
        } else {
            console.log(result);

            // 저장된 파일명(있을수도 없을수도 있음)
            // 있으면 파일명리스트(,로 구분), 없으면 null나옴
            let profile_file_name = result[0].profile_file_name
            
            console.log("사용자 프로필 수정 - profile_file_name: " + profile_file_name);

            // s3에서 해당 파일 삭제
            // 파일명이 있다면 삭제!
            if(profile_file_name != null) {
                s3delete(profile_file_name);
            }

            let sqlUpdate = "update chat_room "
                          + "set profile_file_name =  ? "
                          + "  , upd_datetime_chat_room =  ? "
                          + "where chat_room_id = ? ";

            // undefined를 넣어도 null로 넣어짐!
            let datas = [saveFileNames, time.timeToKr(), hashmap.get("chat_room_id")];

            maria.query(sqlUpdate, datas, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("fail");
                    throw err;
                } else {
                    console.log(sqlUpdate);
                    console.log(result);
                    // 성공한 경우 
                    res.send("success");
                }
            })
        }
    });
});

/* 
    역할: 채팅메시지 전송에서 정적파일을 저장한다.
    input: req, res
    output: 없음
*/
router.post('/createChatStaticContents', async function(req, res, next) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    let saveFileNames = await parseMultiParts(req);

    res.send(saveFileNames);
});

// 사용자 아이디로 채팅방리스트를 조회한다.
router.get('/selectChatRoomListUsingUserId', async function(req,res) {
    // 쿼리문
    let sql = "select cr.chat_room_id "
            + "     , cr.chat_room_name "
            + "     , cr.profile_file_name "
            + "     , cc.chat_msg "
            + "     , cc.cre_datetime_msg "
            + " from chat_room cr "
            + " inner join chat_participant cp on cr.chat_room_id = cp.chat_room_id "
            + " inner join ( "
                + "    select cc.chat_msg "
                + "        , cc.chat_room_id "
                + "     , cc.cre_datetime_msg  "
                + " from chat_contents cc "
                + "inner join ( "
                    + " select chat_room_id "
                    + "        , max(chat_msg_id) chat_msg_id "
                    + " from chat_contents "
                    + " where chat_room_id in (select chat_room_id from chat_participant where user_id = " + req.param("user_id")+ ")"
                    + " group by chat_room_id) cc2 on cc.chat_room_id = cc2.chat_room_id and cc.chat_msg_id = cc2.chat_msg_id "
                    + " ) cc on cr.chat_room_id = cc.chat_room_id "
                    + " where cp.user_id = " + req.param("user_id");

    console.log(sql);

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            console.log(result);
            res.send(result);
        }
    });
});


// 채팅방명을 수정한다.
router.post('/updateChatRoomName', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);
    
    let sqlUpdate = 'update chat_room set chat_room_name = ? where chat_room_id = ?';
            
    let datas = [hashmap.get("chat_room_name"), hashmap.get("chat_room_id")];

    maria.query(sqlUpdate, datas, function (err, result) {
        if (err) {
            console.log(sqlUpdate);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlUpdate);
            console.log(result);
            // 성공한 경우 
            res.send("success");
        }
    })
})

// 채팅방 정보를 삭제한다.
router.post('/deleteChatRoom', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 채팅방 참여인원을 먼저 삭제한다.
    let sqlDeleteChatParticipant = 'delete from chat_participant where chat_room_id = ' + hashmap.get("chat_room_id");

    maria.query(sqlDeleteChatParticipant, function (err, result) {
        if (err) {
            console.log(sqlDeleteChatParticipant);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlDeleteChatParticipant);
            console.log(result);

            let sqlDeleteChatRoom = 'delete from chat_room where chat_room_id = ' + hashmap.get("chat_room_id");
            maria.query(sqlDeleteChatRoom, function (err, result) {
                if (err) {
                    console.log(sqlDeleteChatRoom);
                    res.send("fail");
                    throw err;
                } else {
                    console.log(sqlDeleteChatRoom);
                    console.log(result);
                    res.send("success");
                }
            });
        }
    });
});

// 채팅방 정보를 삭제한다.
router.post('/creteChatParticipant', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
    let queryStr3 = 'insert into chat_participant (user_id, chat_room_id, cre_datetime_participation) values(?) ';                    
    let datas = [hashmap.get("user_id"), hashmap.get("chat_room_id"), time.timeToKr()];

    // 저장!
    await maria.query(queryStr3, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success");
        } else {
            console.log("실패");
            console.log(err);
            res.send(err);
            return;
        }
    });
});

// 채팅방 참여자 조회
router.get('/selectChatParticipantUsingChatRoomId', async function(req,res) {
    // 쿼리문
    let sql = " select cp.chat_room_id "
            + "     , ui.user_id "
            + "     , ui.nick_name "
            + "     , ui.profile_file_name "
            + " from chat_participant cp "
            + " inner join user_info ui on cp.user_id = ui.user_id "
            + " where cp.chat_room_id = " + req.param("chat_room_id");

    console.log(sql);

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            console.log(result);
            res.send(result);
        }
    });
});

// 채팅방 참여자 삭제
router.post('/deleteChatParticipant', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    let sqlDeleteChatParticipant = 'delete from chat_participant where user_id = ? and chat_room_id = ?' ;
    let datas = [hashmap.get("user_id"), hashmap.get("chat_room_id")];

    maria.query(sqlDeleteChatParticipant, datas, function (err, result) {
        if (err) {
            console.log(sqlDeleteChatParticipant);
            res.send("fail");
            throw err;
        } else {
            console.log(sqlDeleteChatParticipant);
            console.log(result);
            res.send("success");
        }
    });
});


/* form 데이터를 파싱한다(텍스트만 있다).
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseFormData(req){
    return new Promise( (resolve)=>{
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();

        // 데이터 스트림 만듬
        req.pipe(req.busboy);

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            hashmap.set(name, value);
            console.log("value: " + name , hashmap.get(name));
        });

        req.busboy.on("finish", function() {
            return resolve();            
        });
    })
  }

    /* multipart 데이터를 파싱하고 정적파일이 있다면 s3로 업로드 한다.
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseMultiParts(req){
    return new Promise( (resolve)=>{
        // 각파일의 정보를 담은 배열을 저장할 맵
        let files = new HashMap();
        // 파일의 정보를 저장할 배열
        let fileInfo;
        // 파일 청크 데이터를 저장
        let chunks;
        // 파일명
        let filetempName;
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            hashmap.set(name, value);
            console.log("value: " + name , hashmap.get(name));
        });
        
        // 파일 정보를 읽어와서 배열에 저장한다.
        req.busboy.on('file', (name, file, info) => { //파일정보를 읽어온다.
            const { filename, encoding, mimeType } = info;
            chunks = [];
            
            // 확장자(jpeg, png 등)
            var filetype = mimeType.split("/")[1];
            console.log("filetype: " + filetype);

            // mime타입(image/jpeg 등)
            console.log(`File [${name}]: filename: %j, encoding: %j, mimeType: %j`,filename, encoding, mimeType);
            
            file.on('data', function(data) {
                // you will get chunks here will pull all chunk to an array and later concat it.
                chunks.push(data)
            });

            file.on('end', function(data) {
                // 각 파일의 정보를 저장할 배열
                fileInfo = [];
                //랜덤하게 파일명 생성
                filetempName = `${random()}.${filetype}`;
                // 랜덤한 파일명 저장
                fileInfo[0] = filetempName;
                // 각 파일의 타입 저장
                fileInfo[1] = mimeType;
                // 각 파일의 청크 배열 저장
                fileInfo[2] = chunks;
                
                // you will get chunks here will pull all chunk to an array and later concat it.
                files.set(filename, fileInfo);
            });

        });

        // field와 file스트림에서 데이터를 다 저장하고 마지막으로 실행됨.
        req.busboy.on('finish', function() {
            // 파일배열의 길이(맵인 경우 size로 구해야 함!!)
            const fileLength = files.size;
            
            console.log("파일길이!! => " + fileLength);

            // 정적파일이 있을 때만 s3로 업로드 한다.
            if(fileLength != 0) {
                // 파일을 저장한 맵의 사이즈
                const size = files.size;
                // 파일맵 요소의 카운트
                let count = 1;
                // 파일들의 이름을 ","로 연결해서 저장한 변수
                let fileNames ="";
                
                console.log(size);

                files.forEach(function (value, key, map) {
                    const params = {
                        Bucket: BUCKET_NAME,
                        Key: value[0], 
                        Body: Buffer.concat(value[2]), // concatinating all chunks
                        ContentType: value[1] // required
                    }

                    s3.upload(params, (err, data) => {
                        if (err){ //애러가 발생하면 무조건 리턴
                            return resolve(err);
                        } else {
                            // 저장한 파일명 ','로 구분해서 저장
                            fileNames += value[0] + ",";
                            // 마지막이라면 리턴
                            if(count == size){
                                fileNames = fileNames.substring(0,fileNames.length - 1);
                                
                                console.log(fileNames);

                                return resolve(fileNames);
                            } else {
                                count++;
                            }
                        }
                    });
                });

                console.log("파일 있음");
                // we are sending buffer data to s3.
            }else {
                console.log("파일 없음");
                // 파일이 없다면 빈값 리턴!
                return resolve();
            }
        });

        // 데이터 스트림 만듬
        req.pipe(req.busboy);
    })
  }

  // 랜덤한 16자리 값을 만든다.
const random = (() => {
    const buf = Buffer.alloc(16);
    return () => randomFillSync(buf).toString('hex');
})();

// s3에 있는 파일을 삭제한다.
function s3delete(filePath){
    // 파일명을 저장한 배열을 만든다.
    let fileNames = filePath.split(",");
    let size = fileNames.length;
    
    console.log("for문전")
    for(let i = 0; i < size; i++){
        console.log("파일명: "+ i + fileNames[i]);

        s3.deleteObject({
            Bucket: BUCKET_NAME, // 사용자 버켓 이름
            Key: fileNames[i] // 버켓 내 경로
          }, (err, data) => {
            if (err) { 
                throw err; 
            } else {
                // count는 0부터 시작
                if(i == (size -1)){
                    console.log((i + 1) + "-" + fileNames[i]);
                    return data;
                } else {
                    console.log((i + 1) + "-" + fileNames[i]);
                    i ++;
                }
            }
          })
    }
}

/* min ~ max까지 랜덤으로 숫자를 생성하는 함수 */ 
let generateRandom = function (min, max) {
    let ranNum = Math.floor(Math.random()*(max-min+1)) + min;
    return ranNum;
}