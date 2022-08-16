const crypto = require('crypto');
const util = require('util');
const config = require('../config/config');

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);
const randomByte = config.randomByte;
const repeatCount = config.repeatCount;
const crypto1 = config.crypto1;
const crypto2 = config.crypto2;

// salt덕분에 동일한 비밀번호를 입력해도 서로다른 해시값이 나오게 된다. salt또한 함께 저장해야 한다.
const createSalt = async () => {
    const buf = await randomBytesPromise(randomByte);
  
    return buf.toString(crypto1);
  };

/* 
    암호화된 비밀번호 생성
    입력: 사용자가 입력한 비밀번호
    출력: 암호화된 비밀번호, salt값
*/
const createHashedPassword = async (password) => {
    // salt 생성
    const salt = await createSalt();

    // 입력한 비밀번호, salt값, 해시 반복횟수, 해시값 길이, 암호화 알고리즘 => 새로운 키값 생성!
    const key = await pbkdf2Promise(password, salt, repeatCount, randomByte, crypto2);

    // crypto1으로 인코딩한 암호화 결과값
    const hashedPassword = key.toString(crypto1);
  
    return { hashedPassword, salt };
};

/* 
    암호화된 비밀번호 검증
    입력: 사용자가 입력한 비밀번호, salt값, 암호화된 비밀번호
    출력: 암호화된 비밀번호, salt값
*/
const verifyPassword = async (password, userSalt, userPassword) => {
    // salt를 이용해서 암호화된 비밀번호 생성
    const key = await pbkdf2Promise(password, userSalt, repeatCount, randomByte, crypto2);
    
    const hashedPassword = key.toString(crypto1);

    // 사용자의 비밀번호를 암호화한 값과 db에 저장된 비밀번호를 비교한다.
    if (hashedPassword == userPassword) {
        console.log("success")
        return "success"
    }

    console.log("fail: hashedPassword => " + hashedPassword)
    console.log("fail: userPassword => " + userPassword)
    return "fail";
};

module.exports = { createHashedPassword, verifyPassword};