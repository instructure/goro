function GoroExecutionThread(id, { useId, config, args, onMessages, onError, onClose }) {
  const env = Object.create(process.env);

  env['RAILS_ENV'] = 'test';

  if (useId) {
    env['TEST_ENV_NUMBER'] = id;
  }

  let fd = GoroExecutionThread.spawn(config.rspecBinary, args, {
    detached: false,
    stdio: 'pipe',
    env: env,
    cwd: config.root
  });

  let dataBuf = '';
  let errBuf = '';

  fd.stdout.on('data', function(chunk) {
    const payload = parseMessages(dataBuf + chunk.toString());

    if (payload.messages.length) {
      onMessages(payload.messages);
    }

    dataBuf = payload.trailing;
  });

  fd.stderr.on('data', function(chunk) {
    errBuf += chunk;
  });

  fd.on('exit', function(exitCode) {
    if (errBuf.match(/ActiveRecord::NoDatabaseError/)) {
      throw new Error(
        errBuf + '\n' +
        Array(80).join('-') +
        "\n" +
        "This error likely means you have not created a database to use " +
        "for this thread." +
        "\nTo do this, run the following command and try again:" +
        "\n\n" +
        "    RAILS_ENV=test TEST_ENV_NUMBER=" + id + " ./bin/rake db:setup" +
        "\n"
      );
    }
    else if (errBuf.length) {
      onError(errBuf);
    }

    fd = null;

    onClose(exitCode);
  });

  return fd;
}

GoroExecutionThread.spawn = require('child_process').spawn;

module.exports = GoroExecutionThread;

function parseMessages(buffer) {
  const lines = buffer.split('\n');
  const messages = lines.map(function(rawChunk) {
    const chunk = rawChunk.trim();

    if (chunk.length === 0) {
      return false;
    }

    try {
      return JSON.parse(chunk);
    }
    catch (e) {
      console.log(e.message);
      console.log(chunk);

      return null;
    }
  });

  return {
    trailing: lines.filter(function(_, index) {
      return messages[index] === null;
    }).join('\n'),

    messages: messages.filter(m => !!m)
  };
}
