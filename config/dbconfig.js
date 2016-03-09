// 로컬 테스트 계정 config
//var config = {
//    "host" : "localhost",
//    "user" : "root",
//    "password" : "1234",
//    "debug" : true,
//    "database" : "greendb"
//}

// AWS DB 계정 config
var config = {
    "host": process.env.GREEN_DB_SERVER,
    "port": process.env.GREEN_DB_PORT,
    "user": process.env.GREEN_DB_USERNAME,
    "password": process.env.GREEN_DB_PASSWORD,
    "database": process.env.GREEN_DB,
    "ssl": "Amazon RDS",
    "debug": true
}

module.exports = config;
