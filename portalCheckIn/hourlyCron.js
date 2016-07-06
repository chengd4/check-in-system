// These Cron Job run every hour at the 5, 25, 35, 55 mark
var cron = require('cron');

var cronJob = cron.CronJob;

var lateJob = new cronJob({
  cronTime: '0 5,55 * * * 1-5',
  onTick: function(){
    //DO SOMETHING
    console.log("LATE JOB");
  },
  start: false,
  timeStart: 'America/Los_Angeles'
});

var absentJob = new cronJob({
  cronTime: '0 25,35 * * * 1-5',
  onTick: function(){
    //DO SOMETHING
    console.log("ABSENT JOB");
  },
  start: false,
  timeStart: 'America/Los_Angeles'
});


//absentJob.start();
//lateJob.start();
