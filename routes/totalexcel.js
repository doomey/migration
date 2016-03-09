var express = require('express');
var router = express.Router();
var path = require('path');
var async = require('async');
var uuid = require('uuid');
var fs = require('fs');
var mime = require('mime');
var AWS = require('aws-sdk');
var s3Config = require('../config/s3Config');
var bcrypt = require('bcrypt');
var sqlAes = require('./sqlAES');
var XLSX = require('xlsx');

sqlAes.setServerKey(serverKey);

router.get('/', function(req, res, next) {

  var workbook = XLSX.readFile(path.join(__dirname, '../uploads/excel', 'datatable.xlsx'));
  var sheet;

  function getConnection(callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        callback(err);
      } else {
        callback(null, connection);
      }
    });
  }
  
  
  function generateSalt(connection, callback){
    bcrypt.genSalt(10, function(err, salt){
      if(err){
        callback(err);
      } else {
        callback(null, salt, connection);
      }
    })
  }

  function insertIparty(salt, connection, callback){
    var sql = "insert into iparty(username, hashpassword, nickname, partytype, name, phone) " +
        "values(?, ?, ?, ?, " +
        sqlAes.encrypt(2) +
        ")";

    async.each(sheet, function(item, cb){
      //console.log("test : " + item);
      //console.log("변형되어야 할 값 1: " + item.hashpassword);
      bcrypt.hash(item.hashpassword, salt, function(err, hashPassword){
        if(err){
          callback(err);
        } else {
          //console.log("변형되어야 할 값 : " + sheet[i].hashpassword);
          connection.query(sql, [item.username, hashPassword, item.nickname, item.partytype, item.name, item.phone], function(err, result) {
            if(err){
              callback(err);
            } else {
              var result = {
                "id" : result.insertId,
                "partytype" : item.partytype,
                "name" : item.name,
                "phone" : item.phone,
                "password" : hashPassword
              }
              //console.log(result);
              cb(null, result);
            }
          });

        }
      })

    }, function(err, result){
      if(err){
        callback(err);
      } else {
        //console.log(result);
        callback(null, result);
      }
    })
  }

  function insertBoard(connection, callback) {
    var resultArr = [];
    async.eachSeries(sheet, function (item, callback) {
      var sql = "insert into board(name)" +
        "values(?)"
      connection.query(sql, [item.name], function (err, result) {
        if (err) {
          var err = new Error('Board 데이터 생성에 실패하였습니다.');
        } else {
          var result = {
            "id ": result.insertId,
            "name": item.name
          }
          resultArr.push(result);
        }
        callback(null);
      });
    }, function (err) {
      connection.release();
      if (err) {
        callback(err);
      } else {
        console.log("Borad Data insert: " + resultArr);
        callback(null, resultArr)
      }
    });
  }

  function insertGreenItems(connection, callback) {
    var resultArr = [];
    async.eachSeries(sheet, function (item, callback) {
      var location = "";
      var mimeType = mime.lookup(item.picture);
      var filepath = path.join(__dirname, '../uploads/', item.picture)
      fs.stat(filepath, function (err, stats) { //경로에 파일이 있는지 확인한다.
        if (err) {
          console.log('요청하신 파일' + item.picture + '이(가) 존재하지 않습니다.');
          callback(null);
        } else {
          var modifiedfile = uuid.v4() + item.picture;
          console.log(filepath);
          var body = fs.createReadStream(filepath);
          var s3 = new AWS.S3({
            "accessKeyId": s3Config.key,
            "secretAccessKey": s3Config.secret,
            "region": s3Config.region,
            "params": {
              "Bucket": s3Config.bucket,
              "Key": s3Config.imageDir + "/" + modifiedfile,
              "ACL": s3Config.imageACL,
              "ContentType": mimeType //mime.lookup
            }
          });
          s3.upload({"Body": body}) //pipe역할
            .on('httpUploadProgress', function (event) {
              console.log(event);
            })
            .send(function (err, data) {
              if (err) {
                console.log(err);
                callback(err);
              } else {
                location = data.Location;
                fs.unlink(filepath, function () {
                  console.log(filepath + " 파일이 삭제되었습니다...");
                });
                var sql = "insert into greenitems(name, description, price, picture, sdate, edate) " +
                  "values (?, ?, ?, ?, ?, ?)";
                connection.query(sql, [item.name, item.description, item.price, location, item.sdate, item.edate], function (err, result) {
                  if (err) {
                    connection.release();
                    console.log('왜? 애러남?');
                    callback(err);
                  } else {
                    console.log('장난침?');
                    resultArr.push(result.insertId);
                    callback(null);
                  }
                });
              }
            });
        }
      });
    }, function (err) {
        if (err) {
          connection.release();
          console.log("fail!!!");
          callback(err);
        } else {
          connection.release();
          console.log("success!!!");
          callback(null, resultArr);
        }
    });
  }


  function insertPhotos(connection, callback) {
    var resultArr = [];
    async.eachSeries(sheet, function (item, callback) {
      var location = "";
      var mimeType = mime.lookup(item.originalfilename);
      var filepath = path.join(__dirname, '../uploads/photos', item.originalfilename)
      fs.stat(filepath, function (err, stats) { //경로에 파일이 있는지 확인한다.
        if (err) {
          console.log('요청하신 파일' + item.originalfilename + '이(가) 존재하지 않습니다.');
          callback(null);
        } else {
          var modifiedfile = uuid.v4() + item.originalfilename;
          console.log(filepath);
          var body = fs.createReadStream(filepath);
          var s3 = new AWS.S3({
            "accessKeyId": s3Config.key,
            "secretAccessKey": s3Config.secret,
            "region": s3Config.region,
            "params": {
              "Bucket": s3Config.bucket,
              "Key": s3Config.imageDir + "/" + modifiedfile,
              "ACL": s3Config.imageACL,
              "ContentType": mimeType //mime.lookup
            }
          });
          s3.upload({"Body": body}) //pipe역할
            .on('httpUploadProgress', function (event) {
              console.log(event);
            })
            .send(function (err, data) {
              if (err) {
                console.log(err);
                callback(err);
              } else {
                location = data.Location;
                fs.unlink(filepath, function () {
                  console.log(filepath + " 파일이 삭제되었습니다...");
                });
                var sql = "insert into photos(photourl, uploaddate, originalfilename, modifiedfilename, phototype, refer_type, refer_id) " +
                  "values (?, ?, ?, ?, ?, ?, ?)";
                connection.query(sql, [location, item.uploaddate, item.originalfilename, modifiedfile, mimeType, item.refer_type, item.refer_id], function (err, result) {
                  if (err) {
                    connection.release();
                    console.log('왜? 애러남?');
                    callback(err);
                  } else {
                    console.log('장난침?');
                    resultArr.push(result.insertId);
                    callback(null);
                  }
                });
              }
            });
        }
      });
    }, function (err) {
      if (err) {
        connection.release();
        console.log("fail!!!");
        callback(err);
      } else {
        connection.release();
        console.log("success!!!");
        callback(null, resultArr);
      }
    });
  }




  async.eachSeries(workbook.SheetNames, function (item, callback) {
    var sheet_name = item;
    var worksheet = workbook.Sheets[sheet_name];
    sheet = XLSX.utils.sheet_to_json(worksheet);

    if (sheet_name==="iparty"){
      async.waterfall([getConnection, generateSalt, insertIparty], function(err, result){
        if(err){
          callback(err);
        } else {
          callback(null, result);
        }
      })
    }

    if (sheet_name === "board") {
      async.waterfall([getConnection, insertBoard], function (err, result) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    } else if (sheet_name === "greenitems") {
      async.waterfall([getConnection, insertGreenItems], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    } else if (sheet_name === "photos") {
      async.waterfall([getConnection, insertPhotos], function (err, result) {
        if (err) {
          callback(err);
        } else {
          console.log(result);
          callback(null);
        }
      });
    }
  }, function (err) {
    if (err) {
      next(err);
    } else {
      var success = "insert가 성공하였습니다.";
      res.json(success);
    }
  });


});







//var mimeType = mime.lookup(item.picture);
//var s3 = new AWS.S3({
//  "accessKeyId" : s3Config.key,
//  "secretAccessKey" : s3Config.secret,
//  "region" : s3Config.region,
//  "params" : {
//    "Bucket" : s3Config.bucket,
//    "Key" : s3Config.imageDir + "/" + item.picture,
//    "ACL" : s3Config.imageACL,
//    "ContentType": mimeType //mime.lookup
//  }
//});

module.exports = router;