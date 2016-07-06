/**
 * Created by xinshen on 6/29/16.
 */
var User = require('./server/model/usersModel');
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

var calendar_id = '1t8dl0sqarrudmiqutl36er5bo@group.calendar.google.com';

var make_schedule = function (event) {
    User.findOne({name: event.summary, studentId: event.description}, function (err, result) {
        if (result != null) {
            var schedule = new Schedule({
                start: event.start.dateTime,
                end: event.end.dateTime,
                user: {
                    name: event.summary,
                    _id: result._id
                }
            });

            console.log(schedule.user.name);

            schedule.save();

        }
    });
};

//cron job: execute get data from API every 7 a.m.

var CronJob = require('cron').CronJob;

var job = new CronJob({
    cronTime: '00 08 14 * * 1-5',
    onTick: function () {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Calendar API.
            authorize(JSON.parse(content), listEvents);
        });
    },
    start: false,
    timeZone: 'America/Los_Angeles'
});
job.start();


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
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
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
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
    console.log('list events');
    var calendar = google.calendar('v3');
    var next_day = new Date();
    next_day.setDate(next_day.getDate() + 1);

    calendar.events.list({
        auth: auth,
        calendarId: calendar_id,
        timeMin: (new Date()).toISOString(),
        timeMax: next_day.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var events = response.items;
        if (events.length == 0) {
            console.log('No upcoming events found.');
        } else {
            console.log('Upcoming events of the day:');


            for (var i = 0; i < events.length; i++) {
                console.log(events[i]);
                make_schedule(events[i]);
            }


        }
    });
}