const UI = require('./GoroUI');
const Executor = require('./GoroExecutor');
const Console = require('./GoroConsole');
const Tracker = require('./GoroTracker');
const TextReporter = require('./GoroReporterText');

function main(config) {
  let ui, tracker, executor;
  const UIFactory = config.reporter === 'text' ? TextReporter : UI;

  const console = Console();

  tracker = Tracker({
    config,
    console,

    onChange: function() {
      executor.run();
    }
  });

  executor = Executor({
    config,
    console,
    getTestFiles: function() {
      return tracker.getTestFiles();
    }
  });

  ui = UIFactory({
    config,
    console,
    tracker,
    executor,
    signals: {
      kill() {
        process.exit(0);
      }
    }
  });

  // do something when app is closing
  process.on('exit', exitHandler({ cleanup: true }));

  // catches ctrl+c event
  process.on('SIGINT', exitHandler({ exit: true }));

  // catches uncaught exceptions
  process.on('uncaughtException', exitHandler({ cleanup: true, exit: true }));

  ui.start();
  tracker.start();
  // run in case we loaded from (a non-empty) cache
  executor.run();

  function exitHandler(options) {
    return function(err) {
      if (options.cleanup) {
        global.console.log('Cleaning up...');

        try {
          ui.stop();
          tracker.stop();
          executor.stop();
        } catch (_) { /* ignore */ }

        global.console.log('Done.');
      }

      if (err) {
        global.console.error(err);
      }

      if (options.exit) {
        process.exit();
      }
    }
  }
}

module.exports = main;