/**
 * Created by xinshen on 6/28/16.
 */
var mongoose = require('mongoose');

scheduleSchema = mongoose.Schema({
    start: Date,
    end: Date,
    user: {
        _id: mongoose.Schema.Types.ObjectId,
        name:String
    }
},{ capped: 1024 });


var schedule = mongoose.model("schedule", scheduleSchema);
module.exports = schedule;
