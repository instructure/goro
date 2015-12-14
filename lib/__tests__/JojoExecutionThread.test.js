const Subject = require('../JojoExecutionThread');
const sinon = require('sinon');
const EventEmitter = require('events');
const { assert } = require('chai');

sinon.assert.expose(assert, { prefix: "" });

describe('JojoExecutionThread', function() {
  let sandbox;
  let fd, onMessages, onClose;
  let subject;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fd = new EventEmitter();

    fd.stdout = new EventEmitter();
    fd.stderr = new EventEmitter();

    sandbox.stub(Subject, 'spawn', () => fd);
    onMessages = sandbox.stub();
    onClose = sandbox.stub();

    subject = Subject(1, {
      onMessages,
      onClose,
      config: {
        rspecBinary: './bin/rspec'
      },
    });

    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');
  });

  afterEach(function() {
    sandbox.restore();

    fd.removeAllListeners();
    fd.stdout.removeAllListeners();
    fd.stderr.removeAllListeners();

    fd = null;
    subject = null;
  });

  it('works', function() {});

  it('uses config.rspecBinary', function() {
    assert.calledWith(Subject.spawn, './bin/rspec');
  });

  it('notifies me when rspec sends a message', function() {
    fd.stdout.emit('data', '{}');

    assert.calledWith(onMessages, [{}]);
  });

  describe('parsing output', function() {
    it('uses trailing bytes on an incomplete message', function() {
      fd.stdout.emit('data', '{ "foo":');

      assert.notCalled(onMessages);

      fd.stdout.emit('data', '"2"}');

      assert.calledWith(onMessages, [{ foo: '2' }]);
    });

    it('handles a single message', function() {
      fd.stdout.emit('data', '{ "a": 1 }');
      assert.calledWith(onMessages, [{ a: 1 }]);
    });

    it('handles multiple messages in a single buffer', function() {
      fd.stdout.emit('data', '{ "a": 1 }\n{ "b": 2 }')

      assert.calledWith(onMessages, [{ a: 1 }, { b: 2 }]);
    });

    it('discards empty lines', function() {
      fd.stdout.emit('data', '\n\n');

      assert.notCalled(onMessages);
    });
  });

  it('notifies me when thread is closed', function() {
    fd.emit('exit', 0);

    assert.calledWith(onClose, 0);
  });

  it('tracks ActiveRecord::NoDatabaseError errors', function() {
    fd.stderr.emit('data', 'foo ActiveRecord::NoDatabaseError');

    assert.throws(function() {
      fd.emit('exit', 1);
    }, /This error likely means you have not created a database/);
  });
});