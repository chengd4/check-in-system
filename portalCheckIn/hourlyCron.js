// These Cron Job run every hour at the 5, 25, 35, 55 mark
var cron = require('cron');

var cronJob = cron.CronJob;

var lateJob = new cronJob({
  cronTime: '0 45,46 * * * 1-5',
  onTick: function(){
    console.log("WOO");
  },
  start: false,
  timeStart: 'America/Los_Angeles'
});



lateJob.start();
