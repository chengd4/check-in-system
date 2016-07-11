var assert = require('chai').assert;
var hourlyCron = require('../hourlyCron');
var Action = require('../server/model/actionModel');
var Schedule = require('../server/model/scheduleModel');
var moment = require('moment');

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});
