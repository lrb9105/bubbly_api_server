
// 멘션 파싱 및 문자열(","로 구분) 생성
module.exports =  async function(arr){
    /* 게시물 콘텐츠에서 해시태그를 파싱해서 json형태(mysql에서 말하는)로 만들어준다.*/
    let mentionedUserIdStr = "";

    // 배열의 갯수만큼 반복한다.
    for(let i = 0; i < arr.length; i++) {
        let mentionVal = arr[i];

        mentionedUserIdStr += mentionVal + ",";
    }

    mentionedUserIdStr = mentionedUserIdStr.substring(0, mentionedUserIdStr.length -1);
    
    console.log("mentionedUserIdStr: " + mentionedUserIdStr);

    return mentionedUserIdStr;
}