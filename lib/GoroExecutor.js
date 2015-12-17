const path = require('path');
const EventEmitter = require('events');
const PATH_FORMATTER = path.resolve(__dirname, '..', 'ext', 'rspec', 'goro_formatter.rb');
const { validate, compose } = require('./GoroUtils');
const { shape, string, bool, number, func } = require('react-schema').PropTypes;
const ExecutionThread = require('./GoroExecutionThread');

function GoroExecutor(dependencies) {
  validate(shape({
    console: shape({
      debugLog: func.isRequired,
      log: func.isRequired,
    }).isRequired,

    config: shape({
      root: string.isRequired,
      format: bool.isRequired,
      shuffle: bool.isRequired,
      threads: number.isRequired,
      rspecBinary: string.isRequired,

      failFast: bool.isRequired,
    }).isRequired,

    getTestFiles: func.isRequired,
  }), dependencies, 'GoroExecutor');

  const { config, console, getTestFiles } = dependencies;
  const emitter = new EventEmitter();

  const pool = {};
  const threadCount = config.threads;
  const RSPEC_BINARY = config.rspecBinary;

  let runAgain = false;
  let staticArgs = [];
  let failFast = config.failFast;

  if (config.format) {
    staticArgs = staticArgs.concat([
      '--require', PATH_FORMATTER,
      '--format', 'GoroFormatter'
    ]);
  }

  console.debugLog('Will be using %d threads.', threadCount);

  function runRSpec() {
    if (isBusy()) {
      runAgain = true;
      emitter.emit('change');

      return false;
    }

    const testFiles = getTestFiles();

    if (!testFiles.length) {
      console.debugLog('Aborting request; no tracked spec files to run.');

      return false;
    }

    const specsPerThread = Math.ceil(testFiles.length / threadCount);
    const shuffledTestFiles = config.shuffle ? shuffle(testFiles) : testFiles;

    SignalStarted();

    for (let thread = 1; thread <= threadCount; ++thread) {
      const cursor = (thread-1) * specsPerThread;
      const threadTestFiles = shuffledTestFiles.slice(cursor, cursor + specsPerThread);
      const args = staticArgs.concat(threadTestFiles);

      if (threadTestFiles.length === 0) {
        break;
      }

      console.debugLog(`Thread[${thread}]: running over the files: ${JSON.stringify(threadTestFiles)}`);
      console.debugLog(`Running RSpec with command: ${RSPEC_BINARY + args.join(' ')}`);

      launchThread(thread, args);
    }

    return true;
  }

  function isBusy() {
    return Object.keys(pool).some(t => !!pool[t]);
  }

  function launchThread(id, args) {
    pool[id] = ExecutionThread(id, {
      useId: threadCount > 1,
      config,
      args,
      onMessages: compose(failFastIfNeeded, broadcastRSpecMessages),
      onError: function(e) {
        console.error(e);
      },
      onClose: closeThread(id)
    });
  }

  function broadcastRSpecMessages(messages) {
    emitter.emit('data', messages);

    return messages;
  }

  function failFastIfNeeded(messages) {
    if (failFast && messages.some(m => m.name === 'example_failed')) {
      console.log('Aborting execution due to --fail-fast.');

      killAllThreads();
      SignalDone();
    }
  }

  function closeThread(id) {
    return function(exitCode) {
      console.debugLog(`Thread[${id}]: done with exitCode ${exitCode}.`);

      pool[id] = null;

      if (!isBusy()) {
        emitter.emit('done');

        if (runAgain) {
          runAgain = false;
          runRSpec();
        }
      }
    }
  }

  function killAllThreads() {
    Object.keys(pool).forEach(function(id) {
      if (pool[id]) {
        pool[id].kill('SIGINT');
        pool[id] = null;
      }
    });
  }

  function SignalDone() {
    emitter.emit('done');
  }

  function SignalStarted() {
    emitter.emit('started');
  }

  return {
    run: runRSpec,
    isBusy: isBusy,
    on: emitter.on.bind(emitter),

    isScheduled() {
      return !!runAgain;
    },

    isFailFast() {
      return failFast;
    },

    toggleFailFast() {
      failFast = !failFast;

      emitter.emit('change');

      runRSpec();
    },

    stop() {
      killAllThreads();
    }
  };
}

module.exports = GoroExecutor;

function shuffle(arr) {
  var o = [].concat(arr);

  for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);

  return o;
}
