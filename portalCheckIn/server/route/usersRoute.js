var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    User = require('../model/usersModel'),
    moment = require('moment');
Action = require('../model/actionModel');
Schedule = require('../model/scheduleModel');

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



    User.findOne(req.body, function (err, result) {
        //if user id does not exist, send an alert.

        if (result == null) {
            console.log('inside user does not exist');
            res.status(202);
            res.json({
                status: 202
            });
        }
        else {
            var newAction = new Action();
            newAction.type.push('checkin');
            newAction.user = {_id: result._id, name: result.name};
            //newAction.createdAt = nowDate;
            var today = moment().startOf('day');
            var tomorrow = moment(today).add(1, 'days');
            Action.findOne({'user._id': result._id}, {}, {sort: {'createdAt': -1}}, function (err, actions) {
                Schedule.find({
                    'user._id': newAction.user._id,
                    start: {"$gte": today.toDate(), "$lt": tomorrow.toDate()}
                }, {}, {sort: {'start': -1}}, function (err, shifts) {

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


router.post('/checkout', function (req, res) {
    var now = moment();
    var nowDate = now.local().toDate();

    User.findOne(req.body, function (err, result) {

        if (err) {
            throw err;
        }
        else if (result == null) { //Didnt find a user
            //return to browser
            res.status(202);

            //return to controller
            res.json({
                status: 202,
                message: "No user found with that ID"
            });
        }
        else if (result) { //found a user
            //Compare checkin and checkout counts to see whether or not to checkout
            //If the number of checkin is the same than the number of checkout for a user, then the person did not checkin yet.
            Action.count({type: "checkout", "user.name": result.name}, function (err, checkoutcount) {
                Action.count({type: "checkin", "user.name": result.name}, function (err, checkincount) {
                    console.log(result.name + " Checkout: " + checkoutcount + " Checkin: " + checkincount);
                    if (err) {
                        throw err;
                    }
                    else if (checkincount > checkoutcount) {
                        //do checkout and compare calendar here
                        //make the checkout object
                        var newAction = new Action({
                            type: "checkout",
                            createdAt: nowDate,
                            user: {studentId: result.studentId, name: result.name}
                        });

                        newAction.save(function (err, doc) {
                            if (err) {
                                throw err;
                            }
                            console.log(nowDate);
                            res.status(200);
                            res.json({
                                status: 200,
                                message: "Successfully Checked Out",
                                token: result.name
                            });
                        });
                    }
                    else {
                        //can't do checkout since no checkin action available
                        console.log("User has not checked in");
                        res.status(201);
                        res.json({status: 201, message: "User Has Not Checked In"});
                    }
                });
            });
        }
    });
});


// encapsulated code can be used in other files
module.exports = router;
