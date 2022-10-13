const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// s3버킷명
const BUCKET_NAME = 'bubbly-s3';
// aws-sdk를 사용하기 위해 가져 옴
const AWS = require('aws-sdk');
// 설정파일
const config = require('../config/config');
// s3에 접근하기 위해 accessKeyId와 secretAccessKey값을 넣어주고 s3객체를 생성한다.
const s3 = new AWS.S3({accessKeyId: config.s3_accessKeyId, secretAccessKey: config.s3_secretAccessKey});
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');

const participateRouter = require("./participate/participteRouter");

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

router.use("/participate", participateRouter);

/* 
    역할: 커뮤니티 정보를 저장한다.
    input: req, res
    output: 없음
*/
router.post('/createCommunity', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    let saveFileNames = await parseMultiParts(req);

    // 저장한 파일명
    console.log(saveFileNames);
    
    // 데이터베이스에 커뮤니티 정보를 저장한다.
    let queryStr = 'insert into community ( community_owner_id, community_name, community_desc, profile_file_name, cre_datetime_community, rule) values (?)';
    let datas = [hashmap.get("community_owner_id"), hashmap.get("community_name"), hashmap.get("community_desc"), saveFileNames, time.timeToKr(), hashmap.get("rule")];
    
    // 저장!
    await maria.query(queryStr, [datas], async function(err, rows, fields){
        if(!err){
            console.log("성공");

            // 가장큰 커뮤니티 아이디 조회
            let queryStr2 = 'select max(community_id) community_id from community';
            
            // 저장!
            await maria.query(queryStr2, function(err, rows, fields){
                if(!err){
                    console.log("rows[0].community_id: " + rows[0].community_id);
                    res.send("" + rows[0].community_id);
                } else {
                    console.log(err);
                    console.log("실패");
                    res.send("fail");
                }
            });
        } else {
            console.log(err);
            console.log("실패");
            res.send("fail");
        }
    });
})

// 특정 커뮤니티 정보를 조회한다.
router.get('/selectCommunityUsingCommunityId', async function(req,res) {
    // 쿼리문
    let sql = "select community_id "
            + "     , community_owner_id "
            + "     , community_name "
            + "     , community_desc "
            + "     , profile_file_name "
            + "     , rule "
            + "from community "
            + "where community_id = " +  req.param("community_id");

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

// 특정 커뮤니티 정보 검색
router.get('/selectCommunitySearchResultList', async function(req,res) {
    const searchText = req.param("search_text");

    // 쿼리문
    let sql = "select community_id "
            + "     , community_owner_id "
            + "     , community_name "
            + "     , community_desc "
            + "     , profile_file_name "
            + "     , rule "
            + "from community "
            + "where (community_desc like  '%" + searchText +"%' or community_name like  '%" + searchText + "%')";

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

// 특정 커뮤니티의 참여자의 nft리스트를 조회한다.
router.get('/selectCommunityParticipantNftList', async function(req,res) {
    // 쿼리문
    let sql = "select pc.community_id "
            + "     , ui.user_id "
            + "     , ui.login_id "
            + "     , ui.nick_name "
            + "     , ui.profile_file_name "
            + "     , nft.nft_id "
            + "     , nft.holder_id "
            + "     , nft.nft_name "
            + "     , nft.nft_desc "
            + "     , date_format(nft.cre_datetime_nft, '%Y-%m-%d %H:%i') nft_creation_time "
            + "     , nft.file_save_url "
            + "     , ns.seller_id "
            + "     , ns.sell_price "
            + "     , ns.app_id "
            + "     , ui.novaland_account_addr "
            + "     , case when ns.app_id is null then 'n' else 'y' end is_sell "
            + "from participating_community pc "
            + "inner join user_info ui on pc.user_id = ui.user_id "
            + " inner join nft nft on ui.user_id = nft.holder_id "
            + " left join nft_sell ns on (nft.nft_id = ns.nft_id and ui.user_id = ns.seller_id) "
            + "where pc.community_id = " +  req.param("community_id");

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

// 특정 커뮤니티의 참여자 리스트를 조회한다.
router.get('/selectCommunityParticipantList', async function(req,res) {
    // 쿼리문
    let sql = "select pc.community_id "
            + "     , ui.user_id "
            + "     , ui.nick_name "
            + "     , ui.profile_file_name "
            + "from participating_community pc "
            + "inner join user_info ui on pc.user_id = ui.user_id "
            + "where pc.community_id = " +  req.param("community_id");

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

// 특정 사용자가 특정 커뮤니티에 가입되어있는지 여부를 반환한다.
router.get('/selectCommunityJoinYn', async function(req,res) {
    // 쿼리문
    let sql = "select user_id "
            + "from participating_community pc "
            + "where community_id = ? and user_id = ?";

    const datas = [req.query.community_id, req.query.user_id];

    await maria.query(sql, datas,function (err, rows) {
        if (err) {
            console.log(err);
            throw err;
        } else {
            if(rows[0] != undefined){
                const userId = rows[0].user_id;
                console.log(userId);
                res.send("true");
            } else {
                res.send("false");

            }
        }
    });
});


// 사용자가 가입한 커뮤니티 리스트를 조회한다.
router.get('/selectCommunityListUsingUserId', async function(req,res) {
    // 쿼리문
    let sql = "select c.community_id "
            + "     , c.community_owner_id "
            + "     , c.community_name "
            + "     , c.community_desc "
            + "     , c.profile_file_name "
            + "     , c.rule "
            + "from community c "
            + "where c.community_id in (select community_id from participating_community where user_id = " + req.param("user_id")+ ")";

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


// 커뮤니티 정보를 수정한다.
router.post('/updateCommunity', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);
    
    // 해당 커뮤니티의 기존 저장파일명을 가져온다.
    let sql = 'select profile_file_name from community where community_id = ' + Number(hashmap.get("community_id"));

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
            
            console.log("커뮤니티 수정 - profile_file_name: " + profile_file_name);

            let datas;
            let sqlUpdate;


            console.log("saveFileNames: " + saveFileNames);

            // 수정할 프로필이 있다면!
            if(saveFileNames != undefined ) {
                // 이전에 저장한 프로필이 있다면 s3에서 해당 파일 삭제
                if(profile_file_name != null){
                    s3delete(profile_file_name);
                }

                sqlUpdate = "update community "
                          + "set community_name = ? "
                          + "  , community_desc = ? "
                          + "  , profile_file_name =  ? "
                          + "  , upd_datetime_community = ? "
                          + "  , rule = ? "
                          + "  where community_id = ? ";

                datas = [hashmap.get("community_name"), hashmap.get("community_desc"), saveFileNames, time.timeToKr(), hashmap.get("rule"), hashmap.get("community_id")];
            } else { //커뮤니티 프로필 수정 안함!
                sqlUpdate = "update community "
                          + "set community_name = ? "
                          + "  , community_desc = ? "
                          + "  , upd_datetime_community = ? "
                          + "  , rule = ? "
                          + "  where community_id = ? "

            // undefined를 넣어도 null로 넣어짐!
                datas = [hashmap.get("community_name"), hashmap.get("community_desc"), time.timeToKr(), hashmap.get("rule"), hashmap.get("community_id")];
            }

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

/* 커뮤니티 정보를 삭제한다.
    1. 커뮤니티 참여인원 정보 삭제
    2. 커뮤니티 정보 삭제
*/
router.post('/deleteCommunity', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장한다
    await parseFormData(req);

    // 데이터베이스의 게시물 정보를 삭제한다.
    let sqlDeletePc = 'delete from participating_community where community_id = ' + hashmap.get("community_id");
    maria.query(sqlDeletePc, function (err, result) {
        if (err) {
            console.log(err);
            res.send("fail");
            throw err;
        } else {
            let sqlDeleteCommunity = 'delete from community where community_id = ' + hashmap.get("community_id");
            maria.query(sqlDeleteCommunity, function (err, result) {
                if (err) {
                    console.log(err);
                    res.send("fail");
                    throw err;
                } else {
                    console.log(sqlDeleteCommunity);
                    console.log(result);
                    
                    res.send("success");
                }
            });
        }
    });
});

// 커뮤니티 프로필 수정
router.post('/updateCommunityProfile', async function(req,res) {
    // 파라미터 정보를 파싱해서 해시맵에 저장하고 파일을 s3에 저장한다.
    // 여러개 저장할 경우 ','로 구분해서 이름을 가져온다!
    // 새로 저장할 파일이 있으면 파일명리스트(,로 구분) 없다면 undefinded
    let saveFileNames = await parseMultiParts(req);
    
    // 해당 커뮤니티의 기존 저장파일명을 가져온다.
    let sql = 'select profile_file_name from community where community_id = ' + Number(hashmap.get("community_id"));

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
            
            console.log("커뮤니티 프로필 수정 - profile_file_name: " + profile_file_name);

            // s3에서 해당 파일 삭제
            // 파일명이 있다면 삭제!
            if(profile_file_name != null) {
                s3delete(profile_file_name);
            }

            let sqlUpdate = "update community "
                          + "set profile_file_name =  ? "
                          + "  , upd_datetime_community =  ? "
                          + "where community_id = ? ";

            // undefined를 넣어도 null로 넣어짐!
            let datas = [saveFileNames, time.timeToKr(), hashmap.get("community_id")];

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