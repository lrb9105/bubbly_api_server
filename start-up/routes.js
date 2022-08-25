const express = require("express");
const nftCreationRouter = require("../backendForSmartContract/routes/nft-creation");
const busboy = require('connect-busboy');
const ntfSellRouter = require("../backendForSmartContract/routes/nft-sell");
const ntfBuyRouter = require("../backendForSmartContract/routes/nft-buy");
const ntfStopSellRouter = require("../backendForSmartContract/routes/nft-stop-sell");
const tokenPaymentRouter = require("../backendForSmartContract/routes/token-payment");
const userInfoRouter = require("../userinfo/userinfoRouter");
const communityRouter = require("../community/communityRouter");
const postRouter = require("../post/postRouter");
const commentRouter = require("../comment/commentRouter");
const followingRouter = require("../following/followingRouter");
const utilRouter = require("../util/utilRouter");
const loginRouter = require("../login/loginRouter");
const nftRouter = require("../nft/nftRouter");
const hashtagRouter = require("../hashtag/hashtagRouter");
const chatRouter = require("../chat/chatRouter");
const testRouter = require("../test/testRouter");
const mentionRouter = require("../mention/mentionRouter");
const realtimetrendRouter = require("../realtimetrend/realtimetrendRouter");

// jwt토큰 검증
//const jwtToken = require('../util/jwtToken');

module.exports = function(app) {
  // 경로를 지정하지 않았으므로 모든 요청마다 적용되는 함수이다.!!!!!!!
  // form데이터와 multipart를 처리하기 위해 사용
  app.use(busboy());
  // json형태의 요청을 처리하기 위해 사용
  app.use(express.json());
  app.use("/nft-creation", nftCreationRouter);
  app.use("/nft-sell", ntfSellRouter);
  app.use("/nft-buy", ntfBuyRouter);
  app.use("/nft-stop-sell", ntfStopSellRouter);
  app.use("/token-payment", tokenPaymentRouter);
  app.use("/userinfo", userInfoRouter);
  app.use("/community", communityRouter);
  // 토큰 적용 - 테스트 시 편의를 위해 토큰 적용 안함!
  //app.use("/post", jwtToken, postRouter);
  app.use("/post", postRouter);
  app.use("/comment", commentRouter);
  app.use("/following", followingRouter);
  app.use("/util", utilRouter);
  app.use("/login", loginRouter);
  app.use("/nft", nftRouter);
  app.use("/hashtag", hashtagRouter);
  app.use("/chat", chatRouter);
  app.use("/test", testRouter);
  app.use("/mention", mentionRouter);
  app.use("/realtimetrend", realtimetrendRouter);
  app.use("/static",express.static('nft-storage'));
  app.use("/config",express.static('backendForSmartContract/config'));
};