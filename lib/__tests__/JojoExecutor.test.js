const Subject = require('../JojoExecutor');
const sinon = require('sinon');
const EventEmitter = require('events');
const { assert } = require('chai');

sinon.assert.expose(assert, { prefix: "" });

describe('JojoExecutor', function() {
  let sandbox;
  let consoleStub, testFiles;
  let subject;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    consoleStub = {
      log: sandbox.stub(),
      debugLog: sandbox.stub()
    };

    testFiles = [];

    subject = Subject({
      console: consoleStub,

      config: {
        root: '/tmp',
        format: true,
        shuffle: false,
        threads: 1,
        rspecBinary: 'bin/rspec',
        failFast: false,
      },

      getTestFiles: () => testFiles,
    });

    sandbox.stub(console, 'log');
    sandbox.stub(console, 'error');
  });

  afterEach(function() {
    sandbox.restore();

    subject = null;
  });

  it('works', function() {});

  describe.skip('#run', function() {
    it('is in a no-op if there are no files to execute', function() {
      testFiles = [];

      assert.equal(subject.run(), true);
    });

    it('works', function() {
      testFiles = [ 'foo' ];
      assert.equal(subject.run(), false);
    });
  });
});