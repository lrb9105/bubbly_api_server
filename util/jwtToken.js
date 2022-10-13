// jwt 사용하기 위해!
const jwt = require('jsonwebtoken');

// 설정파일
const config = require('../config/config');

// redis를 사용하기 위해
const redis = require('redis');

// redis 클라이언트
const client = redis.createClient(6379,'127.0.0.1');

// 액세스 토큰 검증
async function verifyAccessToken(req, res, next) {
    /**
         * access token 자체가 없는 경우엔 에러(401)를 반환
         * 클라이언트측에선 401을 응답받으면 accessToken 재발급요청
         */
        //받아온 토큰(" "(공백)으로 구분되어 있음)
        let receivedAccessToken = req.get("Authorization");
        console.log("receivedAccessToken: " + receivedAccessToken);

        // 액세스토큰이 넘어오지 않았다면 => 로그인 화면으로 이동
        if(receivedAccessToken == undefined || receivedAccessToken == null){
            res.statusCode = 406;
            res.send("token not exist");
            console.log("token not exist");
            return;
        // 올바른 토큰
        } else {
            receivedAccessToken = receivedAccessToken.split(" ")[1];
            console.log("receivedAccessToken: " + receivedAccessToken);
        }  

        // accessToken 만료여부 검사
        let accessTokenExpireMsg = await verifyToken(receivedAccessToken);

        console.log("accessTokenExpireMsg: " + accessTokenExpireMsg);

        // 액세스 토큰 만료! => 재요청
        if (accessTokenExpireMsg == "jwt expired") {
            res.statusCode = 401;
            res.send("accessToken expired");
            console.log("accessToken expired");
        // 올바르지 않은 액세스 토큰  => 로그인 화면으로 이동
        } else  if( accessTokenExpireMsg == "invalid token" ||
                    accessTokenExpireMsg == "jwt malformed" || 
                    accessTokenExpireMsg == "jwt signature is required" || 
                    accessTokenExpireMsg == "invalid signature" ||
                    accessTokenExpireMsg == "jwt audience invalid" || 
                    accessTokenExpireMsg == "jwt issuer invalid" ||
                    accessTokenExpireMsg == "jwt id invalid" ||
                    accessTokenExpireMsg == "jwt subject invalid" || 
                    accessTokenExpireMsg == "jwt not active" ||
                    accessTokenExpireMsg == "jwt must be provided"){
            
            console.log("incorrect accessToken")
            res.statusCode = 406;
            res.send("incorrect accessToken");
            return;
        } else {
            console.log("jwt 검증 성공!");
            // 사용자 요청 실행
            next();
        }
}

// 액세스토큰 재발급
async function reIssueAccessToken(refreshTokenFromUser, res){
    const refreshTokenFromUserParse = refreshTokenFromUser.split(" ")[1];
    // 사용자에게 받아온 리프레시 토큰 디코드
    const decoded = jwt.decode(refreshTokenFromUserParse,config.jwt_secretKey);
    const user_id = decoded["user_id"];

    console.log("리프레시 토큰에서 추출한 userid: " + user_id);

    // redis에서 리프레시토큰 정보 가져오기
    // refreshToken정보가 있고 사용자로부터 받아온 토큰과 동일한지 체크
    await client.connect();
    const key = "refreshToken" + user_id;
            
    // 리프레시 토큰 가져오기
    let refreshTokenFromRedis = await client.get(key);

    console.log("refreshTokenFromUserParse: " + refreshTokenFromUserParse);
    console.log("refreshTokenFromRedis: " + refreshTokenFromRedis);

    // 레디스 연결 끊기
    await client.quit();

    // 리프레시토큰 만료여부
    let refreshTokenExpireYn;

    // 레디스에 리프레시 토큰이 존재하고 사용자가 보낸 리프레시 토큰과 일치한다면
    if(refreshTokenFromRedis != null && refreshTokenFromUserParse == refreshTokenFromRedis){
        // 만료여부 검증
        refreshTokenExpireYn = await verifyToken(refreshTokenFromUserParse);
    } else {
        // db에 리프레시 토큰 정보가 없다면 리프레시 토큰 만료 => 로그인 화면으로 이동
        res.statusCode = 406;
        res.send("refreshToken not exist");
        return;
    }

    // 만료 됐다면=> 로그인 화면으로 이동
    if(refreshTokenExpireYn == "jwt expired"){
        res.statusCode = 401;
        res.send("refreshToken expire");
        return;
    }
    
    // 여기까지 왔다면 리프레시 토큰이 만료되지 않았고 올바른 토큰인것이다. 따라서 액세스토큰을 발급해준다.
    const newAccesshToken = await jwt.sign({user_id},
        config.jwt_secretKey, {
        expiresIn: '1h',
        issuer: 'bubbly'
    });

    console.log("newAccesshToken: " + newAccesshToken);

    // 새로운 액세스토큰 발급
    res.send(newAccesshToken);
}

module.exports = {verifyAccessToken, reIssueAccessToken}
    

async function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwt_secretKey);
    } catch (error) {
        return error.message;
    }
}