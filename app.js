const express = require('express')
const cron = require('node-cron');
const app = express()
const port = 3000

// exports객체에 키를 지정하지 않고 바로 어떤 함수를 가리키게 해서 그 함수가 바로 실행되도록 한다.
require('./start-up/routes')(app)

// 해당 포트로 들어오는 요청을 받는 express 인스턴스 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});

// second minute hour day-of-month month day-of-week
/*cron.schedule('0-10 * * * * *', function(){
    console.log('node-cron 실행됨');
});*/

// 매일 10시 1분마다 동작
/*cron.schedule('* 1 10 * * *', function(){
    console.log('node-cron 실행됨');
});*/
