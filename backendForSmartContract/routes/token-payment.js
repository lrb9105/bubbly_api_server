
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../../db/maria');
// 요청 값을 저장하기 위한 해시맵
const HashMap  = require ('hashmap') ;
// hashmap은 여러 함수에서 사용할 것이므로 인스턴스 변수로 생성
let hashmap;

module.exports = async function(req,res) {
    // 게시물 아이디
    const postId = res.locals.postId;

    // post_like_count_for_token db에서 해당 게시글의 좋아요 카운트를 가져온다. 
    let queryStr = 'select count from post_like_count_for_token where post_id = ?';
    let datas = [postId];

    await maria.query(queryStr, datas, function(err, rows, fields){
        if(!err){
            // 좋아요 카운트 테이블에서 좋아요 수를 가져온다!
            const likeCount = rows[0].count;

            console.log("likeCount: " + likeCount);

            // 만약 10이라면 게시물 작성자에게 한개의 토큰을 준다!
            if(likeCount == 10){
                // 게시물 작성자의 블록체인 계정주소를 가져온다.
                let queryStr = "select ui.novaland_account_addr "
                             + "from post p "
                             + "inner join user_info ui on p.post_writer_id = ui.user_id "
                             + "where p.post_id = ? ";
                let datas = [postId];

                // 저장!
                maria.query(queryStr, datas, async function(err, rows, fields){
                    if(!err){
                        // 게시물 작성자의 블록체인 주소
                        const addr = rows[0].novaland_account_addr;

                        // 만약 10이라면 게시물 작성자에게 한개의 토큰을 준다!
                        var token_payment = require("../token-payment/token-payment");
                        await token_payment.main(addr);

                        // 해당 게시물의 좋아요 카운트를 0으로 바꿔준다.
                        let queryStr = 'update post_like_count_for_token set count = 0 where post_id = ?';
                        let datas = [postId];

                        // 저장!
                        maria.query(queryStr, datas, function(err, rows, fields){
                            if(!err){
                                console.log("성공111");
                                res.send("bubble 1개 지급");
                            } else {
                                console.log(err);
                                res.send(err);
                            }
                        });
                    } else {
                        console.log(err);
                        res.send(err);
                    }
                });
            } else {
                res.send("bubble 지급 안함");
            }
        } else {
            console.log(err);
            res.send("fail");
        }
    });
}

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