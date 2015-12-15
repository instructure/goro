#!/usr/bin/env node

/**
 * JOJO - RSpec watcher and runner.
 *
 * Usage:
 *
 *     ./bin/jojo
 *     # now modify a ruby spec file and watch it run
 *
 * Run with --help to see the available options.
 *
 * You can pass options to rspec directly after --:
 *
 *     ./bin/jojo -- --fail-fast
 */

const path = require('path');
const program = require('commander');
const UI = require('./JojoUI');
const Executor = require('./JojoExecutor');
const Console = require('./JojoConsole');
const Tracker = require('./JojoTracker');
const TextReporter = require('./JojoReporterText');

program
  .option('-c, --continue', 'Start using the list of tests you tracked in the previous session.')
  .option('-g, --grep [pattern]', 'Name of a test suite (describe(...)) to add to the tracked test list.', '')
  .option('--grep-dir [path]', 'The directory that contains the spec files we should grep from.', 'spec/')
  .option('-f, --focus', 'Run only one test file at a time (the most recently edited one.)')
  .option('-j, --threads [THREADS]', 'Number of RSpec processes to execute in parallel.', 1)
  .option('--no-watch-sources', 'Do not run the specs when source files changes (things under app/ gems/ lib/). Defaults to false (ie it will run)')
  .option('--no-cache', 'Do not write the tracked files to disk (for future runs using --continue.)')
  .option('--no-format', 'Do not use the jojo progress/dot formatter.')
  .option('--fail-fast', 'Abort all execution threads as soon as any spec fails.', false)
  .option('--shuffle', 'Shuffle the test files allocated to each thread.')
  .option('--exclude <PATTERN>', 'Pattern to exclude file paths from.', collect, [])
  .option('--rspec-binary <path>', 'Path to the rspec binary.', 'bin/rspec')
  .option('--root <path>', 'The directory that contains the spec/ folder and rspec binary.', process.cwd())
  .option('--spec-pattern <pattern>', 'Pattern to use for differentiating test files from regular files.', '_spec.rb$')
  .option('--watch-pattern <pattern>', 'Pattern to use for watching spec files.', 'spec/**/*.rb')
  .option('--watch-source-pattern <pattern>', 'Pattern to use for watching source files.', '{app,config,gems,lib}/**/*.rb')
  .option('--debug', 'Show debug messages.', false)
  .option('--reporter <name>', 'Reporter to use; "blessed" or "text", defaults to "blessed".', 'blessed')

  .parse(process.argv)
;

const root = path.resolve(program.root);

main({
  root: root,
  runnerPath: path.join(root, 'tmp', 'jojo.txt'),
  cachePath: path.join(root, 'tmp', 'jojo.cache.txt'),
  cache: Boolean(program.cache),
  watchPattern: String(program.watchPattern),
  watchSourcePattern: String(program.watchSourcePattern),
  watchSources: Boolean(program.watchSources),
  grepDir: String(program.grepDir),
  grep: String(program.grep),
  continue: Boolean(program.continue),
  focus: Boolean(program.focus),
  rspecArgs: program.args,
  threads: parseInt(program.threads, 10),
  format: Boolean(program.format),
  shuffle: Boolean(program.shuffle),
  exclude: [].concat(program.exclude).map(String),
  specPattern: RegExp(program.specPattern),
  rspecBinary: String(program.rspecBinary),
  debug: Boolean(program.debug),
  failFast: Boolean(program.failFast),
  reporter: String(program.reporter),
});

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

function collect(item, set) {
  return set.concat(item);
}
