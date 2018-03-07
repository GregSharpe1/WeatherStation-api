// Allows me to run the nppm run start-dev
// https://github.com/remy/nodemon#nodemons
const AWS = require('aws-sdk')
const express = require('express')
const compression = require('compression')
// As explained below, 48 will be a 24 hour period.
const RETURN_NUM_ITEMS = 48;

const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
// Inilize the application. 
const expressApp = express()

// Format the output into standard json
expressApp.set('json spaces', 2);
// use the compression library
expressApp.use(compression())
expressApp.use(awsServerlessExpressMiddleware.eventContext())

AWS.config.update({
    // Such the default region
    // AWS Credentials will be passed into this function 
    // from within the lambda function
    region: "eu-west-1"
})

var dbInstance = new AWS.DynamoDB.DocumentClient()
var table = "WeatherStation"
var DeviceID = "WeatherStation"

// This count variable will be passed into API.

// MATH:
// Readings are taken every 30 minutes, therefore if thhe user requested
// the previous 24 hours of data. then the API call will be as following:
// api.com/v1/aberswyth/48 <- 48 is 24 hours worth of readings.
expressApp.get('/:count?', function(req, res){
    var params = 
    {
        TableName: table,
        KeyConditionExpression: "#did = :did",
        ExpressionAttributeNames:{
            "#did": "Device ID"
        },
        ExpressionAttributeValues: {
            ":did":DeviceID,
        },
        // If a count value is entered, use that! Else, return 48 items
        Limit: req.params.count || RETURN_NUM_ITEMS,
        // This allows the returned items to be return newest to oldest
        ScanIndexForward: false
    };

    // Query the database instance
    // With the above params, creating a function 
    // calculating the output and data
    dbInstance.query(params, function(err, data){
        if (err){
            console.error('Unable to read JSON item', JSON.stringify(err, null, 2));
        } else {
            res.json(data.Items)
        }
    })
})


// The below is a test, exposing port 3001
// Browser -> "localhost:3001/{NUMBER_OF_ITEMS}"
// var port = process.env.API_PORT || 3001;
// expressApp.listen(port, function(){
//     console.log('expressApplication listen on port:' + port);
// })

module.exports = expressApp