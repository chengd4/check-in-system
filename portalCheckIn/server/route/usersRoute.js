var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    User = require('../model/usersModel'),
    moment = require('moment');
var Action = require('../model/actionModel');
var Schedule = require('../model/scheduleModel');

var bufferTime = 6 * 60 * 1000; //6 minutes in milliseconds

var match_schedule = function (shift, newAction,res,result) {

    if (shift.end.getTime() - newAction.createdAt.getTime() <= bufferTime) {

        // STOP CHECKIN
        res.status(201);
        res.json({
            status: 201,
            err: "You shift is about to end"
        })
    }
    else if(shift.start.getTime()-newAction.createdAt.getTime() > bufferTime){

        res.status(201);
        res.json({
            status: 201,
            err: "You shift is not started yet"
        })
    }
    else if (Math.abs(newAction.createdAt.getTime() - shift.start.getTime()) <= bufferTime) {

        newAction.save();
        res.status(200);
        res.json({
            status: 200,
            message: "Successfully Checked In",
            token: result.name

        })
    }
    else {

        newAction.type.push('late');
        newAction.save();
        res.status(200);
        res.json({
            status: 200,
            message: "Successfully Checked In Late",
            token: result.name
        })
    }
};
var allow_checkin = function (actions, newAction, shift,res,result) {
    if (actions == null) {
        match_schedule(shift, newAction,res,result);
    }
    else if (actions.type.indexOf('checkin') == -1) {
        match_schedule(shift, newAction,res,result);
    }
    else {
        res.status(201);
        res.json({
            status: 201,
            err: "User is Checked In"
        });
    }
};
var find_shift = function(shift,res,result){

    if (shift.start.getTime() - bufferTime <= newAction.createdAt.getTime() && newAction.createdAt.getTime() <= shift.end.getTime() + bufferTime) {

        allow_checkin(actions, newAction, shift,res,result);
        return true;
    }
    return false;
};

router.post('/checkin', function (req, res) {

    User.findOne({studentId: req.body.studentId}, function (err, result) {
        //if user id does not exist, send an alert.

        if (result == null) {
            console.log('user does not exist with student id', req.body.studentId);
            res.status(404).json({status:404});
        }
        else {
            var newAction = new Action();
            newAction.type.push('checkin');
            newAction.user = {_id: result._id, name: result.name};
            //newAction.createdAt = nowDate;
            var today = moment().startOf('day');
            var tomorrow = moment(today).add(1, 'days');
            Action.findOne({'user._id': result._id}, {}, {sort: {'createdAt': -1}}, function (err, actions) {
                Schedule.find(
                    {
                        'user._id': newAction.user._id,
                        start: {"$gte": today.toDate(), "$lt": tomorrow.toDate()}
                    },
                    {},
                    {sort: {'start': -1}},
                    function (err, shifts) {
                    if (shifts.length === 0){

                        res.status(201);
                        res.json({
                            status: 201,
                            err: "No shift today"
                        });
                    }
                    else if (shifts.length === 1) {
                        allow_checkin(actions, newAction, shifts[0],res,result);
                    }
                    else if (shifts.length > 1) {
                        for (var i = 0; i < shifts.length; i++) {
                            if(find_shift(shifts[i],res,result)){
                                break;
                            }
                        }
                    }

                });
            });
        }
    });
});

function makeCheckout(schedule, nowDate, user, res){
  //Make the checkout time based on the scheduled checkout time
  var status = ["checkout"];
  if (schedule.end.getTime() - bufferTime > nowDate.getTime()){
    status.push( "early");
  }
  else if (schedule.end.getTime() + bufferTime < nowDate.getTime()){
    status.push( "late");
  }

  var newAction = new Action({
    type: status,
    user: {
      _id: user._id,
      name: user.name
    }
  });
  newAction.save();
}

router.post('/checkout' ,function(req,res){
  var nowDate = new Date();
  User.findOne({studentId: req.body.studentId}, function (err, user) {
    if (err){
        throw err;
    }
    else if (user == null) { //Didnt find a user
        //return to browser
        res.status(404);

        //return to controller
        res.json({
            status : 404,
            message : "No user found with that ID"
        });
    }
    else if (user){ //found a user
        //For the user, see the latest action. If it is a checkin, then checkout. If it is a checkout, then not checkin so dont checkout

        Action.findOne({"user._id": user._id,}, null, {sort: {'createdAt': -1}}, function(err, latestAction){
          if (latestAction == null){
            console.log("User has not checked in");
            res.status(201);
            res.json({status:201, message : "User Has Not Checked In"});
          }
          else if (latestAction.type.indexOf("checkin") != -1){ //If you can find checkin, then continue
            var today = new Date();
            today.setHours(0,0,0,0);
            var tommorow = new Date(today);
            tommorow.setDate(tommorow.getDate()+1);

            //find method will find all schedules today
            Schedule.find({"user._id": user._id, end: {$gte: today, $lt: tommorow}}, function(err, listSchedules){
              if (listSchedules.length == 1){
                makeCheckout(listSchedules[0], nowDate, user, res);
                res.status(200);
                res.json({
                    status: 200,
                    token: user.name
                });
              }
              else if (listSchedules.length > 1){
                var bestPos = 0;
                var time = nowDate.getTime();

                for (var i = 1; i < listSchedules.length; i++){
                  if (Math.abs(time - listSchedules[i].end.getTime()) > Math.abs(time - listSchedules[bestPos].end.getTime())){
                    break;
                  }
                  else{
                    bestPos = i;
                  }
                }
                makeCheckout(listSchedules[bestPos], nowDate, user, res);

                res.status(200);
                res.json({
                    status: 200,
                    token: user.name
                });
              }
            });
          }
          else{
            console.log("User has not checked in");
            res.status(201);
            res.json({status:201, message : "User Has Not Checked In"});
          }
        });
      }
  });
});




// encapsulated code can be used in other files
module.exports = router;
