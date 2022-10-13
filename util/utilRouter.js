// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;

const algosdk = require('algosdk');
const token = '12cad58d7c767918026b0a8321fa61516a75d5089d0b43a35556de913c9b2697';
const server = 'http://127.0.0.1';
const port = 8080;
const client = new algosdk.Algodv2(token, server, port);
const connectionPool = require('../db/connectionPool');
const time = require('../util/time');
// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;


// 니모닉을 받아서 알고랜드 계정정보를 반환
router.get('/nemonicToAccount', async function(req,res) {
    (async () => {
        let acc = await algosdk.mnemonicToSecretKey("idea hand rhythm mail resemble spatial mushroom purse tell excite reunion mule purity fence anger wonder connect black priority mesh version dash speed abstract thing");
        console.log(acc.sk);
        console.log(acc.addr);
        let acc2 = await algosdk.secretKeyToMnemonic(acc.sk);
        console.log(acc2);
        res.send(acc.sk)

        let kmdClient = new algosdk.Kmd("a12cede05b619fc48c9c1d6e2881085e6376e1e0122ff78ee52a1e7c3dc286c7", "http://127.0.0.1", 7833)

        console.log(await kmdClient.exportKey("EGW3KCUW2KOIE2SMIXCJBCYOJIAPNVHYCTBJBHW7LZRDIWESOTZU2J7TR4", 
        "!vkdnj91556", "UP5VRZYUXUHKNOGH6RR2AQJ5MMF6DWOQF2NAKWUV63NS4ERPRI5VEZIJT4"));
      })().catch((e) => {
        console.log(e);
      });
});

// 신고기능
router.post('/report', async function(req,res) {
    // 파라미터 정보를 파싱해서 post_id를 가져온다.
    await parseFormData(req);

    const report_type = hashmap.get("reportType");
    const report_ref_id = hashmap.get("reportRefId");
    const report_uesr_id = hashmap.get("reportUesrId");
    const report_contents = hashmap.get("reportContents");
    let report_cre_datetime = time.timeToKr();
    const report_success_yn = 'n';

    const dbPool = await connectionPool.getPool();

    try{
        dbPool.getConnection(async (err, conn) => {
            // 에러 발생 시
            if (err) {
                // 커넥션이 연결되어 있다면
                if (conn) {
                    conn.release();
                }
                return reject(err);
            } else {
                const sql = 'insert into report (report_type,report_ref_id,report_uesr_id,report_contents,report_cre_datetime,report_success_yn) values (?)';
                const datas = [report_type, report_ref_id, report_uesr_id, report_contents, report_cre_datetime, report_success_yn];

                // 내부 콜백에서 쿼리를 수행
                await conn.query(sql, [datas], async function (err, rows, fields) {
                    // 커넥션 반납
                    conn.release();

                    if (err) {
                        res.send("fail");
                        throw err;
                    } else {                                    
                        res.send("success");
                    }
                })
            }
        })
    } catch (err) {
        console.log(err);
        res.send(err);
        return;
    }
});

/* form 데이터를 파싱한다(텍스트만 있다).
    input: req
    output: hashMap <= 필드데이터가 key, value로 저장되어있음
*/
function parseFormData(req){
    return new Promise( (resolve)=>{
        // 필드정보를 저장할 해시맵
        hashmap = new HashMap();
        // 멘션된 유저아이디를 저장할 배열
        arr = new Array();

        // 데이터 스트림 만듬
        req.pipe(req.busboy);

        //텍스트 정보를 읽어와 맵에 저장.
        req.busboy.on('field',(name, value, info) => {
            if(name.includes("mentioned_user_id_list[]")) {
                arr.push(value);
            } else {
                hashmap.set(name, value);
                console.log("value: " + name , hashmap.get(name));
            }
        });

        req.busboy.on("finish", function() {
            return resolve();            
        });
    })
  }