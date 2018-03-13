// Allows me to run the nppm run start-dev
// https://github.com/remy/nodemon#nodemons
const AWS = require('aws-sdk')
const express = require('express')
const compression = require('compression')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

// Inilize the application. 
const app = express()

// Format the output into standard json
app.set('json spaces', 2);
// Use the compression library
app.use(compression())
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

// This count variable will be passed into API.

// MATH:
// Readings are taken every 30 minutes, therefore if thhe user requested
// the previous 24 hours of data. then the API call will be as following:
// api.com/v1/aberswyth/48 <- 48 is 24 hours worth of readings.
// app.get('/weather/aberystwyth/:count?', function(req, res){
//     var params = 
//     {
//         TableName: table,
//         KeyConditionExpression: "#did = :did",
//         ExpressionAttributeNames:{
//             "#did": "Device ID"
//         },
//         ExpressionAttributeValues: {
//             ":did":DeviceID,
//         },
//         // If a count value is entered, use that! Else, return 1 items
//         Limit: req.params.count || RETURN_NUM_ITEMS,
//         // This allows the returned items to be return newest to oldest
//         ScanIndexForward: false
//     };

//     // Query the database instance
//     // With the above params, creating a function 
//     // calculating the output and data
//     dbInstance.query(params, function(err, data){
//         if (err){
//             console.error('Unable to read JSON item', JSON.stringify(err, null, 2));
//         } else {            
//             console.log("Count: ", req.params.count)
//             res.json(data.Items)
//         }
//     })
// })

// app.get('/weather/aberystwyth/sensor/:sensor/:count?', function(req, res){
//     var params = 
//     {
//         TableName: table,
//         KeyConditionExpression: "#did = :did",
//         ExpressionAttributeNames:{
//             "#did": "Device ID"
//         },
//         ExpressionAttributeValues: {
//             ":did":DeviceID,
//         },
//         // If a count value is entered, use that! Else, return 1 items
//         Limit: req.params.count || RETURN_NUM_ITEMS,
//         // This allows the returned items to be return newest to oldest
//         ScanIndexForward: false
//     };

//     // Query the database instance
//     // With the above params, creating a function 
//     // calculating the output and data
//     dbInstance.query(params, function(err, data){
//         if (err){
//             console.error('Unable to read JSON item', JSON.stringify(err, null, 2));
//         } else {            
//             // If count is present, loop through the amount of counts printing the requested sensors value
//             if (req.params.count){
//                 // Loop through from 0 to the amount of requests.
//                 // Create the array to store the sensor value
//                 console.log("Count {} when looking for {}", req.params.count, req.params.sensor)
//                 sensor_values = [];
//                 for (var i = 0; i < req.params.count; i++){
//                     // Append the requsted sensor value to an array (FOR NOW)
//                     sensor_values.push(data.Items[i].payload[req.params.sensor])
//                 }
//                 console.log("Sensor value array: ", sensor_values)
//                 // Print the number of requested values in JSON
//                 res.json(sensor_values)
//             } else {
//                 // Some processing of the recieved data to only return the sensor requested.
//                 res.json(data.Items[0].payload[req.params.sensor])
//             }
//         }
//     })
// })



// The below is a test, exposing port 3001
//Browser -> "localhost:3001/{NUMBER_OF_ITEMS}"
var port = process.env.API_PORT || 3001;
app.listen(port, function(){
    console.log('application listen on port:' + port);
})

//module.exports = app