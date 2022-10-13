const connectionPool = require('../db/connectionPool');

// 게시물 생성
const createPost = async function (queryStr, datas, post_writer_id){
    return new Promise(async(resolve, reject)=>{
        try {
            // pool을 가져오는 과정
            const dbPool = await connectionPool.getPool();
        
            console.log("dbPool: " + dbPool);
            
            // pool에서 연결객체를 가져오는 과정
            dbPool.getConnection(async (err, conn) => {
                if (err) {
                    if (conn) {
                        conn.release();
                    }
                    console.log("커넥션 에러");
                    // res.send(err);
                    return reject(err);
                } else {
                    // 내부 콜백에서 쿼리를 수행
                    await conn.query(queryStr, [datas], (err, rows, fields) => {
                        // 커넥션 반납
                        conn.release();
        
                        console.log("성공");
                        // post_id를 가져온다.
                        // 데이터베이스에 게시물의 텍스트 정보를 저장한다.
                        let queryStr = 'select max(post_id) post_id from post where post_writer_id = ?';
                        let datas2 = [post_writer_id];
        
                        // 새로운 커넥션 가져옴
                        dbPool.getConnection(async (err, conn) => {
                            if (err) {
                                if (conn) {
                                    conn.release();
                                }
                                return reject(err);
                            } else {
                                // 내부 콜백에서 쿼리를 수행
                                await conn.query(queryStr, [datas2], (err, rows, fields) => {
                                    // 커넥션 반납
                                    conn.release();
        
                                    if(!err){
                                        console.log("성공");
                                        return resolve(rows[0].post_id);
                                    } else {
                                        console.log(err);
                                        console.log("실패");
                                        //res.send("fail");
                                        return reject("fail");
                                    }
                                })
                            }
                        })
                    })
                }
            })
        } catch (err) {
            console.log(err);
            return reject("fail");;
        }
    });
}

module.exports={
    createPost
}