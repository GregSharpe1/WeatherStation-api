// https://github.com/remy/nodemon#nodemons

const AWS = require('aws-sdk')
AWS.config.update({
    region: "eu-west-1"
})
var docClient = new AWS.DynamoDB.DocumentClient()
var table = "WeatherStation"
var DeviceID = "WeatherStation"
var timestamp = "1519746313208"

var params = 
{
    TableName: table,
    Key: {
        "Device ID": DeviceID,
        "timestamp": timestamp
    }
};

docClient.get(params, function(err, data){
    if (err){
        console.error('Unable to read JSON item', JSON.stringify(err, null, 2));
    } else {
        console.log('Data recieved', JSON.stringify(data, null, 2))
    }
})

console.log('HELLO OR WHATEVER')