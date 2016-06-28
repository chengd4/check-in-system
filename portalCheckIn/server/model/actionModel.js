/**
 * Created by xinshen on 6/21/16.
 */
var mongoose = require('mongoose');

actionSchema = mongoose.Schema({
    actionType: String,
    //whether we need id?
    user: {
        studentId:Number,
        name:String
    },

    createdAt: Date,
    comments: Array,
    extras: Object
});



var action = mongoose.model("action", actionSchema);
module.exports = action;
