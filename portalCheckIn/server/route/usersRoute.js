var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    users = require('../model/usersModel'),
    User = mongoose.model('user', users),
    moment = require('moment');

var actions = require('../model/actionModel');
var Action = mongoose.model('action', actions);

// Google Calendar API setup

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


moment().format();

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  console.log(credentials);
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  var calendar = google.calendar('v3');

  //Making the beginning date and ending date for searching the calendar events.
  var begin = new Date();
  begin.setHours(0);
  begin.setMinutes(0);
  begin.setSeconds(0);
  begin.setMilliseconds(0);

  var tommorow = new Date(begin);
  tommorow.setDate(tommorow.getDate() + 1);

  calendar.events.list({
    auth: auth,
    calendarId: '1t8dl0sqarrudmiqutl36er5bo@group.calendar.google.com',
    timeMin: begin.toISOString(),
    timeMax: tommorow.toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming events:');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        console.log('%s - %s', start, event.summary);
      }
    }
  });
}


// This function is very messy. Rewrite the logic
router.post('/checkin', function (req, res) {
    var now = moment(); //Capture the current moment
    var nowDate = now.local().toDate(); //Convert the moment to a date object
    var date = nowDate.getDate();
    User.findOne(req.body, function (err, result) {
        //if user id does not exist, send an alert.
        if (result == null) {
            res.status(202);
            res.json({
                status: 202
            });
        }
        else {
            var newAction = new Action();
            newAction.types = ['checkin'];
            newAction.user = {studentId: result.studentId, name: result.name};
            newAction.createdAt = nowDate;
            var userid = result.studentId;
            Action.count({types: 'checkin',"user.studentId": userid}, function (err, checkincount) {
                Action.count({types: 'checkout',"user.studentId": userid}, function (err, checkoutcount) {
                    if (checkincount == checkoutcount) {
                        //if the user is not checked in, check the user in
                        newAction.save();
                        res.status(200);
                        res.json({
                            status: 200,
                            token: result.name
                        });
                    }
                    else {
                        // if user is already checked in, alert the user and not check in again
                        res.status(201);
                        res.json({
                            status: 201,
                            err : "User is Checked In"
                        });
                    }
                })
            });
        }
    });
});

router.post('/checkout' ,function(req,res){
   var now = moment();
   var nowDate = now.local().toDate();

    User.findOne(req.body, function (err, result) {
        console.log(result);
        if (err){
            throw err;
        }
        else if (result == null) { //Didnt find a user
            //return to browser
            res.status(202);

            //return to controller
            res.json({
                status : 202,
                message : "No user found with that ID"
            });
        }
        else if (result){ //found a user
            //Compare checkin and checkout counts to see whether or not to checkout
            //If the number of checkin is the same than the number of checkout for a user, then the person did not checkin yet.
            Action.count({types: {$in: ["checkout"]}, "user.name": result.name}, function(err, checkoutcount){
                Action.count({types: {$in: ["checkin"]}, "user.name": result.name}, function(err, checkincount){
                    console.log(result.name + " Checkout: " + checkoutcount + " Checkin: " + checkincount);

                    if (err){
                        throw err;
                    }
                    else if (checkincount > checkoutcount){

                      // //go through the schedule model here and find the users entries
                      // Schedule.find({"user.studentId": result.studentId}, function(err, userSchedule){
                      //   //find and compare the closest end time to nowDate
                      //
                      //   //if 5+ minutes early, make an early tag
                      //
                      //   //if on time, just checkout
                      //
                      //   //if 5+ minutes late, make a late tag
                      // });

                      var newAction = new Action({
                          types: ["checkout"],
                          createdAt: nowDate,
                          user: {studentId: result.studentId, name: result.name}
                      });

                      newAction.save(function(err, doc){
                          if (err){
                              throw err;
                          }
                          console.log(nowDate);
                          res.status(200);
                          res.json({status:200,
                              message: "Successfully Checked Out",
                              token: result.name});
                      });
                    }
                    else{
                        //can't do checkout since no checkin action available
                        console.log("User has not checked in");
                        res.status(201);
                        res.json({status:201, message : "User Has Not Checked In"});
                    }
                });
            });
        }
    });
});




// encapsulated code can be used in other files
module.exports = router;
