// Allows me to run the nppm run start-dev
// https://github.com/remy/nodemon#nodemons
const AWS = require('aws-sdk')
const express = require('express')
const compression = require('compression')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const moment = require('moment')

// Inilize the application. 
const app = express()

// Format the output into standard json
app.set('json spaces', 2);
// Use the compression library
// If large amount of data are to be sent use compression as it will save time and ultimately money.
//app.use(compression())
app.use(awsServerlessExpressMiddleware.eventContext())

AWS.config.update({
    // Such the default region
    // AWS Credentials will be passed into this function 
    // from within the lambda function
    region: "eu-west-1"
})

var dbInstance = new AWS.DynamoDB.DocumentClient()

// This will be used to for the different table
// Will also be used to set the Device ID and TableName
// (they will be the same)
var weatherStationList = {
  "aber": {
    "table": "WeatherStation",
    "device_id": "WeatherStation",
    "full_name": "aberystwyth"
  }
}

// Allow any site to access the information throught the use of the HEADERS (Have tried setting this in API Gateway with no luck)
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// MATH:
// Readings are taken every 30 minutes, therefore if thhe user requested
// the previous 24 hours of data. then the API call will be as following:
// api.com/v1/aberswyth/48 <- 48 is 24 hours worth of readings.
app.get('/weather/:location/:count?', function(req, res){
    if (!weatherStationList.hasOwnProperty(req.params.location)){
        res.status(404).json({ "status": 404, "message": "Not Found", "error": "Location " + req.params.location + " not found."})
    } else {
		//What do we want to do here?
      	//We have a valid location as per weatherStationList
      	
      	//Has count been set?
      	//If not, set return_count to 24 Hours worth of data.
      	var return_count = req.params.count || 48
        
        //Build the Query
      	var params = {
          TableName: weatherStationList[req.params.location].table,
          KeyConditionExpression: "#did = :did",
					ExpressionAttributeNames:{
          	"#did": "Device ID"
          },
          ExpressionAttributeValues: {
          	":did": weatherStationList[req.params.location].device_id,
          },
          Limit: return_count,
          ScanIndexForward: false
        }
        
        //Run
        dbInstance.query(params, function(err, data){
          if (err){
            res.status(500).json({ "status": 500, "message": "Internal Server Error", "error": err})
          } else {
            var res_weather_json = []
            
            if(req.query.sensor){
              if(req.query.sensor in data.Items[0].payload){
                data.Items.forEach(function(element){
                  var wx = {}
                  wx.timestamp = element.timestamp
                  wx[req.query.sensor] = element.payload[req.query.sensor] || "null"
                  res_weather_json.push(wx)
                })
              } else {
                res.status(404).json({ "status": 404, "message": "Not Found", "error": req.query.sensor + " not found."})
              }
            } else {
              data.Items.forEach(function(element){
                var wx = {}
                wx.timestamp = element.timestamp
                wx.payload = element.payload
                res_weather_json.push(wx)
              })
            }
            
            var res_base_json = {
              "status": 200,
              "message": "OK",
              "data": {
                "location": weatherStationList[req.params.location].full_name,
                "device_id": weatherStationList[req.params.location].device_id,
                "weather_data": res_weather_json
              }
            }
            
            //We need to process the data in two ways. 
            //a. format as defined in the json thing
            //b. if queries are set.
            //Format the data!
            res.status(200).json(res_base_json)
          }
        })
    }
})

// timestamp b is optionally, if not set timestampB equals date.today()
app.get('/weather/history/:location/:timestampA/:timestampB?', function(req, res){
  if (!weatherStationList.hasOwnProperty(req.params.location)){
    res.status(404).json({ "status": 404, "message": "Not Found", "error": "Location " + req.params.location + " not found."})
  } else if (!req.params.timestampA){
    // Check if timestamp A has been specified
    res.status(404).json({"status": 404, "message": "Not Found", "error": "TimestampA not set."})
  } else {
    // Return that data b

    // set the start_timestamp to timestampA this is required.
    var start_timestamp = req.params.timestampA
    // If the 'end_timestamp' is not set set until today.
    // Multiple the number 
    var end_timestamp = req.params.timestampB || (moment().unix() * 1000).toString();

    //Build the Query
    console.log("START ", start_timestamp)
    console.log("END ", end_timestamp)

    // Based upon https://dzone.com/articles/query-dynamodb-items-withnodejs
    var params = {
      TableName: weatherStationList[req.params.location].table,
      KeyConditionExpression: "#did = :did and #timestamp BETWEEN :timestampA AND :timestampB",
      ExpressionAttributeNames:{
        "#did": "Device ID",
        "#timestamp": "timestamp"
      },
      ExpressionAttributeValues: {
        ":did": weatherStationList[req.params.location].device_id,
        ":timestampA": start_timestamp,
        ":timestampB": end_timestamp
      },
      ScanIndexForward: false
    }
    
    dbInstance.query(params, function(err, data){
      if (err){
        res.status(500).json({ "status": 500, "message": "Internal Server Error", "error": err})
      } else {
        var res_weather_json = []
         
        data.Items.forEach(function(element){
          var wx = {}
          wx.timestamp = element.timestamp
          wx.payload = element.payload
          res_weather_json.push(wx)
        })
      }
      
      var res_base_json = {
        "status": 200,
        "message": "OK",
        "data": {
          "location": weatherStationList[req.params.location].full_name,
          "device_id": weatherStationList[req.params.location].device_id,
          "weather_data": res_weather_json
        }
      }
        
        //We need to process the data in two ways. 
        //a. format as defined in the json thing
        //b. if queries are set.
        //Format the data!
        res.status(200).json(res_base_json)

    });

  }

});


// DEVELOPMENT ENVIRONMENT 
// UNCOMMMENT THE BELOW

// RUN npm start-dev.
// The below is a test, exposing port 3001
//Browser -> "localhost:3001/{NUMBER_OF_ITEMS}"
// var port = process.env.API_PORT || 3001;
// app.listen(port, function(){
//     console.log('application listen on port:' + port);
// })

// For DEV comment out the below
module.exports = app