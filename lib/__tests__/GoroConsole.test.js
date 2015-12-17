const Subject = require('../GoroConsole');
const { assert } = require('chai');
const sinon = require('sinon');

describe('GoroConsole', function() {
  it('is creatable', function() {
    Subject();
  });

  describe('messengers', function() {
    let subject, callback;

    beforeEach(function() {
      subject = Subject();
      callback = sinon.stub();
    });

    it('provides a "log" routine', function() {
      subject.on('message', callback);
      subject.log('foo');

      assert.calledWith(callback, 'foo');
    });

    it('provides a "debugLog" routine', function() {
      subject.on('debugMessage', callback);
      subject.debugLog('foo');

      assert.calledWith(callback, 'foo');
    });

    it('provides an "error" routine', function() {
      subject.on('error', callback);
      subject.error('foo');

      assert.calledWith(callback, 'foo');
    });
  });

});
