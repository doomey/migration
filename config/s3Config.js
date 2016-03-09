module.exports = {
    "key" : process.env.GREEN_S3_KEY,
    "secret" : process.env.GREEN_S3_SECRET,
    "region" : "ap-northeast-2", //-1은 도쿄, -2는 서울을 의미한다.
    "bucket" : "greenhero",
    //아래 image--- 키 이름은 임의로 정해도 된다.
    "imageDir" : "photos",
    "bgDir" : "bg",
    "imageACL" : "public-read"
}

