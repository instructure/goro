const React = require('react');
const { validate, bool, func, object, strictShape } = require('./PropTypes');
const blessed = require('blessed');
const ReactBlessed = require('react-blessed');
const { compose } = require('./GoroUtils');
const App = require('./GoroUIComponents');

module.exports = function GoroUI(dependencies) {
  const { config, console, executor, tracker, signals } = dependencies;

  validate(strictShape({
    console: object,

    executor: strictShape({
      on: func,
      isScheduled: func,
    }),

    tracker: strictShape({
      getTestFiles: func,
      grep: func,
      clear: func,
      toggleFocusMode: func,
    }),

    config: strictShape({
      debug: bool,
    }),
  }), dependencies, 'GoroUI');

  let screen, component;
  let grepping = false;
  let activePanelIndex = 0;

  const PANELS = [ 'failures', 'console' ];
  const runInfo = {
    count: 0,
    current: null,
    passed: [],
    pending: [],
    failed: [],
    elapsed: 0
  };

  const streams = {
    stdout: [],
    stderr: []
  };

  function createScreen() {
    screen = blessed.screen({
      debug: true,
      autoPadding: true,
      smartCSR: true,
      title: 'GORO'
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

    screen.key(['tab'], function() {
      switchActivePanel();
      render();
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
      streams.stdout.push('[goro]: ' + message);
      render();
    });

    console.on('debugMessage', function(message) {
      screen.debug(message);
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
      runInfo.elapsed = 0;

      startTimer();

      render();
    });

    executor.on('done', function() {
      console.log(`Finished ${runInfo.count} example(s) in ${runInfo.elapsed}ms.`);

      stopTimer();
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
          streams.stdout.push(message.data);
        }
        else if (message.name === 'stderr') {
          streams.stderr.push(message.data);
        }
        else if (message.name === 'example_passed') {
          runInfo.passed.push(message.example);
        }
        else if (message.name === 'example_pending') {
          runInfo.pending.push(message.example);
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
      grepping: grepping,
      focus: tracker.inFocusMode(),
      onGrep: compose(compose(render, hideGrep), tracker.grep),
      onDismissGrep: compose(render, hideGrep),
      scheduled: executor.isScheduled(),
      activePanel: PANELS[activePanelIndex],

      stdout: streams.stdout,
      stderr: streams.stderr,

      failFast: executor.isFailFast()
    };
  }

  function hideGrep() {
    grepping = false;
  }

  function teardown() {
    signals.kill();
  }

  function switchActivePanel() {
    activePanelIndex++;

    if (activePanelIndex >= PANELS.length) {
      activePanelIndex = 0;
    }
  }

  let timer;

  function startTimer() {
    timer = setInterval(function() {
      runInfo.elapsed = (new Date() - runInfo.startedAt);
      render();
    }, 1000);
  }

  function stopTimer() {
    timer = clearInterval(timer);
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
