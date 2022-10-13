// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');
const time = require('../util/time');

class chatSqlExecutor {
    async createChatRoom(datas, chatRoomMemberList, res) {
        return new Promise((resolve, reject) => {
            let queryStr = 'insert into chat_room (chat_room_name_creator, chat_room_name_other, chat_creator_id, chat_other_id, cre_datetime_chat_room) values (?)';

            // 저장!
            maria.query(queryStr, [datas], async function(err, rows, fields){
                if(!err){
                    // 채팅방 id를 가져온다.
                    let queryStr2 = 'select max(chat_room_id) chat_room_id from chat_room ';
                    
                    await maria.query(queryStr2, [datas], async function(err, rows, fields){
                        if(!err){
                            console.log("성공");
                            // 채팅방 아이디
                            const chatRoomId = rows[0].chat_room_id;
                            console.log("생성한 채팅방 아이디: " + chatRoomId);

                            // 채팅방 멤버의 정보리스트를 만든다.
                            const memberSize = chatRoomMemberList.length;
                            let memberQuery = "";
                            let timeArr = [];

                            for(let i = 0; i < memberSize; i++){
                                const userId = chatRoomMemberList[i];
                                
                                console.log("userId:" + userId);

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
                                    console.log("채팅방 저장 성공");
                                    //res.send("" + chatRoomId);
                                    return resolve("" + chatRoomId);
                                } else {
                                    console.log("실패");
                                    console.log(err);
                                    //res.send(err);
                                    return resolve("" + chatRoomId);
                                }
                            });
                        } else {
                            console.log("실패");
                            console.log(err);
                            return resolve("fail");
                            //res.send("fail");
                        }
                    });
                } else {
                    console.log("실패");
                    console.log(err);
                    return resolve("fail");
                }
            });
        });
    }
}

module.exports = chatSqlExecutor