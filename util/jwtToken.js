// jwt 사용하기 위해!
const jwt = require('jsonwebtoken');

// 설정파일
const config = require('../config/config');

// redis를 사용하기 위해
const redis = require('redis');

// redis 클라이언트
const client = redis.createClient(6379,'127.0.0.1');

module.exports = 
    async function(req, res, next) {
    	/**
         * access token 자체가 없는 경우엔 에러(401)를 반환
         * 클라이언트측에선 401을 응답받으면 accessToken 재발급요청
         */
        //받아온 토큰(" "(공백)으로 구분되어 있음)
        const Authorization = req.get("Authorization");
        if(Authorization == null){
            res.send("잘못된 접근입니다. 토큰없음");
            return;
        }

        const AuthorizationArr = Authorization.split(" ")

        const receivedAccessToken = AuthorizationArr[1];
        const receivedRefreshToken = AuthorizationArr[2];

        console.log("receivedAccessToken: " + receivedAccessToken);
        console.log("receivedRefreshToken: " + receivedRefreshToken);
        
        // 액세스토큰이 넘어오지 않았다면
        if (receivedAccessToken === undefined) {
            res.send('API 사용 권한이 없습니다.'); 
            return;
        }

        // 토큰정보 디코드(만료됐더라도 페이로드에 정보는 가지고 있으므로 사용 가능 - 어떤 사용자가 보낸건지 확인!)
        const decoded = jwt.decode(receivedAccessToken,config.jwt_secretKey);
        const user_id = decoded["user_id"];
        
        console.log("user_id: " + user_id);

        // accessToken 만료여부 검사
        let accessToken = await verifyToken(receivedAccessToken);

        // redis에서 리프레시토큰 정보 가져오기
        // refreshToken정보가 있고 사용자로부터 받아온 토큰과 동일한지 체크
        await client.connect();
        const key = "refreshToken" + user_id;
             
        let refreshToken = await client.get(key);

        // 로그아웃 -> 리프레시 토큰 지워짐 -> 따라서 리프레시 토큰이 없는데 접근했다면 잘못된 토큰으로 접근한 것!
        if(refreshToken == null){
            res.send('잘못된 토큰입니다.');
            return;
        }

        console.log("refreshToken: " + refreshToken);

        await client.quit();

        // 사용자가 보낸 refreshToken과 redis에 저장된 refreshToken이 다르다면 위조된 것이므로 에러 발생
        if(receivedRefreshToken != refreshToken){
            res.send('토큰정보가 잘못됐습니다.');
            return;
        } else {
            // 만료된 토큰 여부 검사
            refreshToken = await verifyToken(receivedRefreshToken);
        }

        if (accessToken == "jwt expired") {
            if (refreshToken == "jwt expired") { // case1: access token과 refresh token 모두가 만료된 경우
                res.send('API 사용 권한이 없습니다.');
                return;
            } else { 
                // case2: access token은 만료됐지만, refresh token은 유효한 경우
                // 새로운 accessToken 생성
                    // 토큰 세팅
                const nick_name = decoded["nick_name"];
                const newAccesshToken = await jwt.sign({ user_id, nick_name },
                    config.jwt_secretKey, {
                    expiresIn: '1h',
                    issuer: 'bubbly'
                });

                const newAccesshTokenObj = {"accessToken" : newAccesshToken};

                res.send(newAccesshTokenObj);
            }
        } else {
            if (refreshToken == "jwt expired") { 
                // case3: access token은 유효하지만, refresh token은 만료된 경우
                // 리프레시토큰 새로 발급
                const newRefreshToken = jwt.sign({},
                    config.jwt_secretKey, {
                    expiresIn: '14d',
                    issuer: 'bubbly'
                });

                // DB에 새로 발급된 refresh token 삽입하는 로직
                await client.connect();
                const key = "refreshToken" + user_id;
         
                await client.set(key, refreshToken);
            
                //const savedToken = await client.get(key);
                //console.log("refreshToken: " + savedToken);
        
                // 14일 후에 자동삭제
                await client.expire(key, 60 * 60 * 24 * 14);
        
                await client.quit();
                
                const newRefreshTokenObj = {"refreshToken" : newRefreshToken};
                
                // 사용자에게 새로운 refreshToken 전송
                res.send(newRefreshTokenObj);
            } else { // case4: accesss token과 refresh token 모두가 유효한 경우
                console.log("success")
                next();
            }
        }
}

async function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwt_secretKey);
    } catch (error) {
        return error.message;
    }
  }