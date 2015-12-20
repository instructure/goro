const Subject = require('../GoroUIComponents');
const blessed = require('blessed');
const React = require('react');
const ReactBlessed = require('react-blessed');
const net = require('net');
const { assert } = require('chai');
const { drill, m } = require('react-drill/addons/react-blessed');

describe('GoroUIComponents', function() {
  let sinkFd, screen, subject;

  beforeEach(function() {
    sinkFd = new net.Socket();

    screen = blessed.screen({
      input: sinkFd,
      output: sinkFd,

      debug: true,
      warnings: true,
      autoPadding: true,
      smartCSR: true,
      title: 'GORO'
    });

    subject = ReactBlessed.render(<Subject />, screen);
  });

  afterEach(function() {
    subject = null;
    screen.destroy();
  });

  it('renders', function() {
    assert.ok(subject.isMounted());
  });

  describe('rendering', function() {
    it('displays the number of examples', function() {
      drill(subject).find('text', m.hasText('Examples:.*0'));

      subject.inject({
        runInfo: {
          count: 3,
          failed: [],
          passed: [],
        }
      });

      drill(subject).find('text', m.hasText('Examples:.*3'));
    });
  });

  describe('rendering failures', function() {
    beforeEach(function() {
      subject.inject({
        runInfo: {
          count: 2,
          failed: [{
            full_description: 'hehehe',
            failure: 'BOMB'
          }]
        }
      });
    });

    it('displays the failure count', function() {
      drill(subject).find('text', m.hasText('Failed:.*1'));
    });

    it('displays failure details', function() {
      drill(subject)
        .find('box', m.hasText('Failures'))
          .find('log', m.hasText('BOMB'));
    });
  });

  it('renders the watched file list', function() {
    subject.inject({ fileList: [ 'foo_spec.rb' ] });

    drill(subject)
      .find('scrollablebox', m.hasText('foo_spec.rb'));
  });

  it('displays the progress in a progress bar', function() {
    subject.inject({
      runInfo: {
        count: 4,
        passed: [{ }],
        failed: []
      }
    });

    assert.equal(drill(subject).find('progressbar').node.filled, 25);
  });

  it('displays the console panel and forwards stdout/stderr to it', function() {
    subject.inject({
      activePanel: 'console',
      stdout: [ 'hello!!!' ],
      stderr: [ 'boo!!!' ]
    });

    drill(subject).find('log', m.hasText('hello!!!'));
    drill(subject).find('log', m.hasText('boo!!!'));
  });
});
