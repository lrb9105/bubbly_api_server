const { randomFillSync } = require('crypto');
// express.Router를 사용하기 위해 express exports를 가져옴!
const express = require("express");
// Router를 사용하기 위해 express.Router()호출
const router = express.Router();
// mariaDB를 연결하기 위해 모듈 가져옴
const maria = require('../db/maria');

// 외부에서 사용하기 위해 router를 넣어줌!
module.exports = router;


// 멘션하기 위한 사용자리스트를 조회한다.
router.get('/selectUserListForMention', async function(req,res) {
    const searchName = "'%" + req.param("search_name") + "%'";
    // 쿼리문
    let sql = " select ui.user_id "
            + "     , ui.nick_name "
            + "     , ui.profile_file_name "
            + " from user_info ui "
            + " inner join ( "
                + " select follower_id search_id "
                + " from following "
                + " where followee_id = " + req.param("user_id")
                + " union "
                + " select followee_id search_id "
                + " from following "
                + " where follower_id= " + req.param("user_id")
                + " ) f on ui.user_id = f.search_id "
                + " where nick_name like " + searchName;
    
    await maria.query(sql, function (err, result) {
        if (err) {
            console.log(err);
            throw err;
        } else {
            console.log(result);
            res.send(result);
        }
    });
});