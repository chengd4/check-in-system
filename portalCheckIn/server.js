//dependencies
var express        = require('express');
var app            = express();
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var bson = require('bson');
var index         = require('./server/route/index');
var users         = require('./server/route/usersRoute');
var admins        = require('./server/route/admin_routes');
var mongoose      = require('mongoose');
var get_schedule = require('./get_schedule');
var hourlyCron = require('./hourlyCron');

//connect to mongo

mongoose.connect('mongodb://localhost/CheckTest');
//mongoose.connect('mongodb://db.theportal.io:27017/CheckInDev');

var db = mongoose.connection;

app.use(bodyParser.json());
//Lets use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
app.use(methodOverride('X-HTTP-Method-Override'));

//setting the routes
app.use('/admins',          admins);
app.use('/users',           users);
app.use('/',                index);

app.set('port', process.env.PORT || 3000);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback){
    console.log("DB conneciton is successful");

    console.log('Magic happens on port ' + app.get('port'));
});
app.listen(app.get('port'));
//token
//sessions
//query strings [localhost:8080/adminViewPage.html?id=123&password=123]
//                                                  ^^querystring^^
//passport
//jwt
