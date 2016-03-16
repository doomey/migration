module.exports = {
    "key" : process.env.GREEN_S3_KEY2,
    "secret" : process.env.GREEN_S3_SECRET2,
    "region" : "ap-northeast-2", //-1은 도쿄, -2는 서울을 의미한다.
    "bucket" : "greenhero2",
    //아래 image--- 키 이름은 임의로 정해도 된다.
    "imageDir" : "photos",
    "bgDir" : "bg",
    "itemsDir" : "items",
    "multimediaDir" : "multimedia",
    "thumbnailDir" : "thumbnail",
    "imageACL" : "public-read"
}

