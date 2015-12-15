const Console = global.console;

module.exports = function JojoUI(dependencies) {
  const { config, console, executor, tracker, signals } = dependencies;

  const messages = [];
  const runInfo = {
    count: 0,
    passed: [],
    failed: []
  };

  function setupListeners() {
    console.on('message', function(message) {
      Console.log(message);
    });

    console.on('debugMessage', function(message) {
      if (config.debug) {
        Console.log('[DEBUG]', message);
      }
    });

    console.on('error', function(message) {
      Console.error('[ERROR]', message);
    });

    executor.on('started', function() {
      Console.log('Thread has started.');

      runInfo.startedAt = new Date();
      runInfo.count = 0;
    });

    executor.on('done', function() {
      const elapsed = new Date() - runInfo.startedAt;

      Console.log('Finished in ' + elapsed + 'ms.');
    });

    executor.on('data', function(rspecMessages) {
      rspecMessages.forEach(function(message) {
        if (message.name === 'group_started') {
          runInfo.count += message.expected_count;
          Console.log('Example count:', runInfo.count);
        }
        if (message.name === 'group_finished') {
          process.stdout.write('\n');
        }
        else if (message.name === 'example_passed') {
          // runInfo.passed.push(message.example);
          process.stdout.write('.');
        }
        else if (message.name === 'example_failed') {
          // runInfo.failed.push(message.example);

          Console.log('Failure:', message.example);
        }
      });
    });
  }


  return {
    start() {
      setupListeners();
    },

    stop() {
    }
  };
}
