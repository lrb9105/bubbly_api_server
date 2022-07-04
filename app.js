const express = require('express')
const maria = require('./db/maria')
const fs = require('fs');
const AWS = require('aws-sdk');
const app = express()
const port = 3000
const http = require('http');

// exports객체에 키를 지정하지 않고 바로 어떤 함수를 가리키게 해서 그 함수가 바로 실행되도록 한다.
require('./start-up/routes')(app)

// 해당 포트로 들어오는 요청을 받는 express 인스턴스 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});

/*
const options = {
  host: 'd2gf68dbj51k8e.cloudfront.net',
  path: '/test3.js'
};

const uploadFile = (fileName) => {
  const fileContent = fs.readFileSync(fileName);
  
  console.log('11' + fileContent);

  const params = {
    Bucket: BUCKET_NAME,
    Key: 'test3.js',
    Body: fileContent
  };
  console.log('22');

  s3.upload(params, function(err, data){
    if(err) {
      throw err
    }
    console.log('file upload success. ${data.Location}');
  });
};

app.get('/', (req, res) => {
  res.send('Hello World!2222')
})

maria.connect();

// insert 예제
app.get('/insert', function(req, res){
  maria.query('INSERT INTO test VALUES(1)', function(err, rows, fields){
    if(!err){
      res.send(rows);
    } else {
      res.send(err);
    }
  });
});

app.get('/upload',function(req, res){
  uploadFile('maria.js');
  res.send('NGINX-logo.png');
});

app.get('/save', function(req, res){ 
  var req = http.get(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
  
    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.on('data', function(chunk) {
      // You can process streamed parts here...
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = Buffer.concat(bodyChunks);
      console.log('BODY: ' + body);
      // ...and/or process the entire body here.
    })
  });

  req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
  });

  res.send('success!');
});
*/