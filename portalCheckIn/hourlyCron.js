// These Cron Job run every hour at the 5, 25, 35, 55 mark
var cron = require('cron');
var Action = require('./server/model/actionModel');
var Schedule = require('./server/model/scheduleModel');
var cronJob = cron.CronJob;
var moment = require('moment');


var lateJob = new cronJob({
  cronTime: '0 5,35 * * * 1-5',
  onTick: function(){
    checkLate();
  },
  start: false,
  timeStart: 'America/Los_Angeles'
});

var beforeJob = new cronJob({
  cronTime: '0 25,55 * * * 1-5',
  onTick: function(){
    checkAbsent();
    checkForcedCheckout();
  },
  start: false,
  timeStart: 'America/Los_Angeles'
});

lateJob.start();
beforeJob.start();



function absentAction(schedule){
  //find one latest action for a user who has the same id as the scheduled user's id.
  Action.find({"user._id": schedule.user._id}).sort({'createdAt': -1}).limit(1).exec(function(err, action){
    //if the latest action is only contains 1 string late, then we know that the person never checked in
    if (action.length == 0 || (action[0].extras.scheduleId.equals(schedule._id) && action[0].type.length == 1 && action[0].type.indexOf("late") != -1)){
      var absent = new Action({
        type: ['absent'],
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        },
        extras: {scheduleId: schedule._id}
      });

      //make a note about what shift was missed
      absent.comments.push({
        body: "Missed work shift for " + moment(schedule.start).format("h:mm a") + " - " + moment(schedule.end).format("h:mm a"),
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        }
      });

      absent.save();
      console.log(schedule.user.name + " is absent");
    }
  });
}

function checkAbsent(){
  //endShift the date and time of the ending shift
  var endShift = new Date();
  if (endShift.getMinutes() == 25){
    endShift.setMinutes(30);
    endShift.setSeconds(0);
    endShift.setMilliseconds(0);
  }else{ // for the 55 minute mark
    endShift.setHours(endShift.getHours() + 1);
    endShift.setMinutes(0);
    endShift.setSeconds(0);
    endShift.setMilliseconds(0);
  }

  //grab list of users who have shifts that will end in 5 minutes
  Schedule.find({end: endShift}, function(err, schedules){
    for (var i = 0; i < schedules.length; i++){
      absentAction(schedules[i]);
    }
  });
}

function checkForcedCheckout(){
  //startShift the date and time of the starting shift
  var startShift = new Date();
  if (startShift.getMinutes() == 25){
    startShift.setMinutes(30);
    startShift.setSeconds(0);
    startShift.setMilliseconds(0);
  }else{ //for the 55 minute mark
    startShift.setHours(startShift.getHours() + 1);
    startShift.setMinutes(0);
    startShift.setSeconds(0);
    startShift.setMilliseconds(0);
  }

  //grab a list of users who have shifts that will started five minutes ago
  Schedule.find({start: startShift}, function(err, schedules){
    for (var i = 0; i < schedules.length; i++){
      forcedAction(schedules[i]);
    }
  });
}

function checkLate(){
  //startShift the date and time of the starting shift
  var startShift = new Date();
  if (startShift.getMinutes() == 35){
    startShift.setMinutes(30);
    startShift.setSeconds(0);
    startShift.setMilliseconds(0);
  }else{ //for the 5 minute mark
    startShift.setMinutes(0);
    startShift.setSeconds(0);
    startShift.setMilliseconds(0);
  }

  //grab list of users who have shifts that started five minutes ago.
  Schedule.find({start: startShift}, function(err, schedules){
    for (var i = 0; i < schedules.length; i++){
      lateAction(schedules[i]);
    }
  });
}

function forcedAction(schedule){
  //find one latest action for a user who has the same id as the scheduled user's id.
  Action.find({"user._id": schedule.user._id}).sort({'createdAt': -1}).limit(1).exec(function(err,action){
    //If the action has a checkin, then need to force checkout
    if (action.length == 0 || action[0].type.indexOf('checkin') != -1){
      var forcedCheckout = new Action({
        type: ['forced', 'checkout'],
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        },
        extras: {scheduleId: action[0].extras.scheduleId}
      });

      //make a note about making a forced checkout at the current time
      forcedCheckout.comments.push({
        body: "Automatic forced check-out at " + moment().format("h:mm a"),
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        }
      });

      forcedCheckout.save();
      console.log(schedule.user.name + " is forced to check out");
    }
  });
}

function lateAction(schedule){
  //find one latest action for a user who has the same id as the scheduled user's id.
  Action.find({"user._id": schedule.user._id}).sort({'createdAt': -1}).limit(1).exec(function(err,action){
    //if the action does not have the same schedule id, then action was not in the current shift
    if (action.length == 0 || !(action[0].extras.scheduleId.equals(schedule._id))){
      var late = new Action({
        type: ['late'],
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        },
        extras: {scheduleId: schedule._id}
      });

      //make a note about the actual scheduled check-in time
      late.comments.push({
        body: "Scheduled to check-in at " + moment(schedule.start).format("h:mm a"),
        user: {
          _id: schedule.user._id,
          name: schedule.user.name
        }
      });

      late.save();
      console.log(schedule.user.name + " is late");
    }
  });
}
