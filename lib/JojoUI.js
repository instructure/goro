const React = require('react');
const { bool, shape, func, object } = require('react-schema').PropTypes;
const blessed = require('blessed');
const ReactBlessed = require('react-blessed');
const { validate, compose } = require('./JojoUtils');
const App = require('./JojoUIComponents');

module.exports = function JojoUI(dependencies) {
  const { config, console, executor, tracker, signals } = dependencies;

  validate(shape({
    console: object.isRequired,

    executor: shape({
      on: func.isRequired,
      isScheduled: func.isRequired,
    }).isRequired,

    tracker: shape({
      getTestFiles: func.isRequired,
      grep: func.isRequired,
      clear: func.isRequired,
      toggleFocusMode: func.isRequired,
    }).isRequired,

    config: shape({
      debug: bool.isRequired,
    }).isRequired,
  }), dependencies, 'JojoUI');

  let screen, component;
  let grepping = false;

  const messages = [];
  const runInfo = {
    count: 0,
    current: null,
    passed: [],
    failed: []
  };

  function createScreen() {
    screen = blessed.screen({
      debug: true,
      autoPadding: true,
      smartCSR: true,
      title: 'JOJO'
    });

    component = ReactBlessed.render(<App {...getProps()} />, screen);
  }

  function setupKeys() {
    screen.key(['escape'], function() {
      if (grepping) {
        grepping = false;
        render();
      }
      else {
        teardown();
      }
    });

    screen.key(['q', 'C-c'], function() {
      teardown();
    });

    screen.key(['f4'], function() {
      tracker.clear();
    });

    screen.key(['f5'], function() {
      tracker.toggleFocusMode();
    });

    screen.key(['f6'], function() {
      executor.toggleFailFast();
    });

    screen.key(['/'], function() {
      grepping = true;
      render();
    });
  }

  function setupListeners() {
    console.on('message', function(message) {
      messages.push(message);
      render();
    });

    console.on('debugMessage', function(message) {
      screen.debug(message);
      render();
    });

    console.on('error', function(message) {
      runInfo.failed.push({
        full_description: 'RSpec Exception',
        failure: message,
        location: 'generic rspec error'
      });

      render();
    });

    executor.on('change', render);
    executor.on('error', teardown);

    executor.on('started', function() {
      runInfo.passed = [];
      runInfo.failed = [];
      runInfo.current = null;
      runInfo.startedAt = new Date();
      runInfo.count = 0;

      render();
    });

    executor.on('done', function() {
      const elapsed = new Date() - runInfo.startedAt;
      messages.push('Finished in ' + elapsed + 'ms.');
      render();
    });

    executor.on('data', function(rspecMessages) {
      rspecMessages.forEach(function(message) {
        if (message.name === 'group_started') {
          runInfo.count += message.expected_count;
        }
        // else if (message.name === 'group_finished') {
        // }
        else if (message.name === 'stdout') {
          messages.push(message.data);
        }
        else if (message.name === 'example_passed') {
          runInfo.passed.push(message.example);
        }
        else if (message.name === 'example_failed') {
          runInfo.failed.push(message.example);
        }
      });

      render();
    });
  }

  function render() {
    component.inject(getProps());
  }

  function getProps() {
    return {
      config: config,
      fileList: tracker.getTestFiles(),
      runInfo: runInfo,
      messages: messages,
      grepping: grepping,
      focus: tracker.inFocusMode(),
      onGrep: compose(compose(render, hideGrep), tracker.grep),
      onDismissGrep: compose(render, hideGrep),
      scheduled: executor.isScheduled(),

      failFast: executor.isFailFast()
    };
  }

  function hideGrep() {
    grepping = false;
  }

  function teardown() {
    signals.kill();
  }

  return {
    start() {
      createScreen();
      setupKeys();
      setupListeners();
      render();
    },

    stop() {
      screen.destroy();
    }
  };
}
