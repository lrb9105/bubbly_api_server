const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// s3버킷명
const BUCKET_NAME = 'bubbly-s3';
// aws-sdk를 사용하기 위해 가져 옴
const AWS = require('aws-sdk');
// s3에 접근하기 위해 accessKeyId와 secretAccessKey값을 넣어주고 s3객체를 생성한다.
const s3 = new AWS.S3({accessKeyId: 'AKIAT2UD4WFJ4B6IC4EQ', secretAccessKey: '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'});
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');
// 암호화된 비밀번호를 생성하기 위해
const passwordCrypto = require('../util/passwordCrypto');
// 이메일 정보
const { smtpTransport } = require('../config/email');
// redis를 사용하기 위해
const redis = require('redis');
// cryptoJS
const CryptoJS = require('crypto-js')
//request
const request = require('request');
// 설정파일
const config = require('../config/config');


// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
const client = redis.createClient(6379,'127.0.0.1');

// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

// 휴대폰으로 인증번호 전송
router.post('/sendPhoneCertificationNum',async function(req,res){
    await parseFormData(req);

    // 이미 사용중인 휴대폰번호인지 확인한다.
    let sql = "select case when phone_num is null then 'not exist' else 'exist' end is_exist "
            + "from user_info "
            + "where phone_num = '" +  hashmap.get("phone_num") + "'";

    console.log(sql);

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            // 사용가능
            if(result == ""){
                // 휴대폰으로 인증번호 전송
                auth.SendPhoneNumCertificationNum(req, res);
            } else { // 사용중
                res.send("exist");
            }
            
        }
    });
});


/* 
    역할: 비밀번호 테스트
    input: req, res
    output: 없음
*/
router.post('/password', async function(req,res) {
    // 받아온 회원정보를 해시맵에 저장한다.
    await parseFormData(req);
    
    const password = hashmap.get("password");

    console.log("입력한 비번: " + password);

    const returnValue = passwordCrypto.createHashedPassword(password);

    const pass = (await returnValue).hashedPassword;
    const salt = (await returnValue).salt;

    console.log("해시 비번: " + (await returnValue).hashedPassword);
    console.log("salt: " + (await returnValue).salt);

    const result = passwordCrypto.verifyPassword(password, salt, pass);

    if(result){
        res.send("true");
    } else {
        res.send("false");
    }
})

/* 
    역할: 회원정보를 저장한다.
    input: req, res
    output: 없음
*/
router.post('/createUserInfo', async function(req,res) {
    // 받아온 회원정보를 해시맵에 저장한다.
    await parseFormData(req);

    // 암호화된 비밀번호 생성
    const password = hashmap.get("login_pw");
    const hashedPasswordObj = passwordCrypto.createHashedPassword(password);
    const hashedPassword = (await hashedPasswordObj).hashedPassword;
    const salt = (await hashedPasswordObj).salt;
    
    // 데이터베이스에 커뮤니티 정보를 저장한다.
    let queryStr = 'insert into user_info (login_id, login_pw, email_addr, phone_num, nick_name, salt, cre_datetime_user_info) values (?)';
    let datas = [hashmap.get("login_id"), hashedPassword, hashmap.get("email_addr"), hashmap.get("phone_num"), hashmap.get("nick_name"), salt, time.timeToKr()];
    
    // 저장!
    await maria.query(queryStr, [datas], function(err, rows, fields){
        if(!err){
            console.log("성공");
            res.send("success");
        } else {
            console.log(err);
            console.log("실패");
            res.send("fail");
        }
    });
})

// 사용자 정보를 조회한다.
router.get('/selectUserInfo', async function(req,res) {
    // 쿼리문
    let sql = "select user_id "
            + "     , login_id "
            + "     , email_addr "
            + "     , phone_num "
            + "     , novaland_account_addr "
            + "     , profile_file_name "
            + "from user_info "
            + "where user_id = " +  req.param("user_id");

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

// 이미 존재하는 아이디인지 조회한다.
router.get('/selectIsExisingId', async function(req,res) {
    // 쿼리문
    let sql = "select case when login_id is null then 'not exist' else 'exist' end is_exist "
            + "from user_info "
            + "where login_id = " +  req.param("login_id");

    console.log(sql);

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            if(result == ""){
                res.send("not exist");
            } else {
                res.send("exist");
            }
            
        }
    });
});


// 사용자 정보를 수정한다.
router.post('/updateUserInfo', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);
    
    // 해당 사용자 프로필명을 가져온다.
    let sql = 'select profile_file_name from user_info where user_id = ' + Number(hashmap.get("user_id"));

    console.log("sql: " + sql);

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
            
            console.log("사용자 수정 - profile_file_name: " + profile_file_name);

            // s3에서 해당 파일 삭제
            // 파일명이 있다면 삭제!
            if(profile_file_name != null) {
                s3delete(profile_file_name);
            }

            let sqlUpdate = "update user_info "
                          + "set   login_id = ? "
                          + "   , email_addr = ? "
                          + "   , phone_num = ? "
                          + "   , nick_name = ? "
                          + "   , profile_file_name = ? "
                          + "   , upd_datetime_user_info = ? "
                          + "where user_id = ? "

            // undefined를 넣어도 null로 넣어짐!
            let datas = [hashmap.get("login_id"), hashmap.get("email_addr"), hashmap.get("phone_num"),hashmap.get("nick_name"),saveFileNames, time.timeToKr(), hashmap.get("user_id")];

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
})

/* 사용자 정보를 삭제한다.*/
router.post('/deleteUserInfo', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // s3에 저장된 정적파일이 있다면 삭제한다.
    // 해당 게시물 id의 기존 파일저장 경로를 가져온다.
    //let sql = 'SELECT file_save_names FROM post WHERE post_id = ' + hashmap.get("post_id");
    let sql = 'SELECT profile_file_name FROM user_info WHERE user_id = ' + Number(hashmap.get("user_id"));
    
    await maria.query(sql, function (err, result, fields) {
        if (err) {
            console.log(sql);
            console.log(2222);
            throw err;
        } else {
            // 저장된 파일명
            let profile_file_name = result[0].profile_file_name
            // s3에서 해당 파일 삭제
            console.log("profile_file_name: " + profile_file_name);

            // 파일명이 있다면 삭제!
            if(profile_file_name != null) {
                s3delete(profile_file_name);
            }

            // 1-1. 작성한 게시물에 달린 댓글 삭제
            let sqlDeleteComment = 'delete from comment WHERE post_id in (select post_id from post where post_writer_id = ' + + hashmap.get("user_id") + ')';
            maria.query(sqlDeleteComment, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("comment delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteComment);
                    console.log(result);
                }
            });

            // 1-2. 작성한 게시물 삭제
            let sqlDeletePost = 'delete from post WHERE post_writer_id = ' + hashmap.get("user_id");
            maria.query(sqlDeletePost, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("post delete fail");
                    throw err;
                } else {
                    console.log(sqlDeletePost);
                    console.log(result);
                }
            });

            let sqlDeleteMyComment = 'delete from comment WHERE comment_writer_id = ' + hashmap.get("user_id");
            maria.query(sqlDeleteMyComment, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("MyComment delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteMyComment);
                    console.log(result);
                }
            });


            // 3. 팔로위, 팔로워 삭제
            let sqlDeleteFollowing = 'delete from following where followee_id = ' + hashmap.get("user_id") +' or follower_id = ' + hashmap.get("user_id");
            maria.query(sqlDeleteFollowing, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("following delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteFollowing);
                    console.log(result);
                }
            });

            // 4. 채팅참여자 삭제
            let sqlDeleteChatParticipant = 'delete from chat_participant where user_id = ' + hashmap.get("user_id");
            maria.query(sqlDeleteChatParticipant, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("chat participant delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteChatParticipant);
                    console.log(result);
                }
            });

            // 5. 참여중인 커뮤니티
            let sqlDeleteParticipatingCommunity = 'delete from participating_community where user_id = ' + hashmap.get("user_id");
            maria.query(sqlDeleteParticipatingCommunity, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("ParticipatingCommunity delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteParticipatingCommunity);
                    console.log(result);
                }
            });

            // 6. 좋아요한 게시물 삭제
            let sqlDeletePostLike = 'delete from post_like where user_id =' + hashmap.get("user_id");
            maria.query(sqlDeletePostLike, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("PostLike delete fail");
                    throw err;
                } else {
                    console.log(sqlDeletePostLike);
                    console.log(result);
                }
            });

            // 7. 사용자 정보 삭제
            let sqlDeleteUserInfo = 'delete from user_info where user_id =' + hashmap.get("user_id");
            maria.query(sqlDeleteUserInfo, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("UserInfo delete fail");
                    throw err;
                } else {
                    console.log(sqlDeleteUserInfo);
                    console.log(result);
                    res.send("success");
                }
            });
        }
    });
});

// 사용자 프로필 수정
router.post('/updateUserProfile', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);
    
    // 해당 커뮤니티의 기존 저장파일명을 가져온다.
    let sql = 'select profile_file_name from user_info where user_id = ' + Number(hashmap.get("user_id"));

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

            let sqlUpdate = "update user_info "
                          + "set profile_file_name =  ? "
                          + "  , upd_datetime_user_info =  ? "
                          + "where user_id = ? ";

            // undefined를 넣어도 null로 넣어짐!
            let datas = [saveFileNames, time.timeToKr(), hashmap.get("user_id")];

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
})

// 이메일로 인증번호 전송
router.post('/sendEmailCertificationNum', async function(req,res) {
    await parseFormData(req);

    // 이미 사용중인 이메일인지 확인한다.
    let sql = "select case when email_addr is null then 'not exist' else 'exist' end is_exist "
            + "from user_info "
            + "where email_addr = '" +  hashmap.get("email_addr") + "'";

    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(sql);
            throw err;
        } else {
            console.log(sql);
            // 사용가능
            if(result == ""){
                // 이메일 전송
                auth.SendEmail(req,res);
            } else { // 사용중
                res.send("exist");
            }
            
        }
    });
})

// 이메일 인증번호 검증
router.get('/verfyEmailCertificationNum', async function(req,res) {
    // 받아온 이메일 및 인증번호 저장
    const email_addr = req.param("email_addr");
    const certification_num = req.param("certification_num");

    // redis에서 가져온 인증번호
    certification_num_from_redis = redis_operator.EmailCertificationGet(email_addr, certification_num, res);
});


// 휴대폰 인증번호 검증
router.get('/verfyPhoneCertificationNum', async function(req,res) {
    // 받아온 휴대폰번호 및 인증번호 저장
    const phone_num = req.param("phone_num");
    const certification_num = req.param("certification_num");

    // redis에서 가져온 인증번호
    certification_num_from_redis = redis_operator.PhoneCertificationGet(phone_num, certification_num, res);
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

const auth = {
    SendEmail : async(req, res) => {
        const sendEmail  = hashmap.get("email_addr")
        const number = generateRandom(111111,999999)

        const mailOptions = {
            from: '"bubbly_official" <bubbly_official@naver.com>',
            to: sendEmail,
            subject: "[bubbly]인증 관련 이메일 입니다",
            text: "오른쪽 숫자 6자리를 입력해주세요 : " + number
        };

        const result = await smtpTransport.sendMail(mailOptions, (error, responses) => {
            if (error) {
                console.log(error);
                res.send("이메일 전송 fail");
            } else {
                console.log("이메일 전송 success");

                const email_addr = hashmap.get("email_addr");
                const certification_num = number;
                
                // redis에 이메일, 인증번호 저장 저장
                redis_operator.EmailCertificationSet(email_addr, certification_num);
                res.send("success");
            }
            smtpTransport.close();
        });
    },
    SendPhoneNumCertificationNum : async(req, res) => {

        const resUpper = res;

        var user_phone_number = hashmap.get("phone_num");

        const random = generateRandom(111111,999999)

        var resultCode = 404;
        const date = Date.now().toString();
        const uri = config.uri; //서비스 ID
        const secretKey = config.secretKey;// Secret Key
        const accessKey = config.accessKey;//Access Key
        const method = "POST";
        const space = " ";
        const newLine = "\n";
        const url = `https://sens.apigw.ntruss.com/sms/v2/services/${uri}/messages`;
        const url2 = `/sms/v2/services/${uri}/messages`;

        const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
        hmac.update(method);
        hmac.update(space);
        hmac.update(url2);
        hmac.update(newLine);
        hmac.update(date);
        hmac.update(newLine);
        hmac.update(accessKey);

        const hash = hmac.finalize();
        const signature = hash.toString(CryptoJS.enc.Base64);

        request({
            method: method,
            json: true,
            uri: url,
            headers: {
                "Contenc-type": "application/json; charset=utf-8",
                "x-ncp-iam-access-key": accessKey,
                "x-ncp-apigw-timestamp": date,
                "x-ncp-apigw-signature-v2": signature,
            },
            body: {
                type: "SMS",
                countryCode: "82",
                from: "01032652285",
                content: "bubbly인증번호:" +  random,
                messages: [
                { to: `${user_phone_number}`, },],
            },
            },
            function (err, res, html) {
                if (err) {
                    console.log(err);
                    console.log(html); 
                    resUpper.send(err);
                } else { 
                    resultCode = 200; 
                    // 휴대폰으로 인증번호 전송 완료
                    // redis에 저장
                    redis_operator.PhoneCertificationSet(user_phone_number, random);
                    resUpper.send("success");
                }
            }
        );
    }
}

const redis_operator = {
    EmailCertificationSet: async(email_addr, certification_num) => {
        await client.connect();
             
        await client.set(email_addr,certification_num);
    
        console.log("certification_num: " + certification_num);

        // 10분 후 자동 삭제
        await client.expire(email_addr,60 * 10);

        await client.quit();
    },
    EmailCertificationGet: async(email_addr, certification_num, res) => {
        await client.connect();
        console.log("연결")
    
        // 값을 가져 옴.
        const value = await client.get(email_addr);

        console.log("가져온 값: "+ certification_num);
        console.log("redis 값: "+ value);

        /*  사용자가 보낸 인증번호와 redis에 저장된 인증번호가 동일하다면
            1. redis에 있는 인증번호 삭제
            2. equal 전송!
        */
        if(certification_num == value){
            // 삭제!
            client.del(email_addr)
            
            await client.quit();

            res.send("equal");
        } else { // 동일하지 않다면 not equal 전송
            await client.quit();

            res.send("not equal");
        }
    }, PhoneCertificationSet: async(user_phone_number, random) => {
        await client.connect();
             
        await client.set(user_phone_number, random);
    
        console.log("certification_num: " + random);

        // 10분 후 자동 삭제
        await client.expire(user_phone_number, 60 * 5);

        await client.quit();
    }, PhoneCertificationGet: async(user_phone_number, certification_num, res) => {
        await client.connect();
        console.log("연결")
    
        // 값을 가져 옴.
        const value = await client.get(user_phone_number);

        console.log("가져온 값: "+ certification_num);
        console.log("redis 값: "+ value);

        /*  사용자가 보낸 인증번호와 redis에 저장된 인증번호가 동일하다면
            1. redis에 있는 인증번호 삭제
            2. equal 전송!
        */
        if(certification_num == value){
            // 삭제!
            client.del(user_phone_number)
            
            await client.quit();

            res.send("equal");
        } else { // 동일하지 않다면 not equal 전송
            await client.quit();

            res.send("not equal");
        }
    }

};