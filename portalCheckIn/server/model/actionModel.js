/**
 * Created by xinshen on 6/21/16.
 */
var mongoose = require('mongoose');

var commentSchema = mongoose.Schema({
    body: String,
    user: {
        _id: mongoose.Schema.Types.ObjectId,
        name: String
    },
    createdAt: {type: Date, default: Date.now}
});

actionSchema = mongoose.Schema({
    type: [String],
    //whether we need id?
    user: {
        _id: mongoose.Schema.Types.ObjectId,
        name:String
    },

    createdAt: {type: Date, default: Date.now},
    comments: [commentSchema],
    extras: Object
});

actionSchema.index({ type: 1, 'user._id': 1, createdAt: -1 });

var action = mongoose.model("action", actionSchema);
module.exports = action;
