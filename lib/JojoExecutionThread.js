function JojoExecutionThread(id, { useId, config, args, onMessages, onClose }) {
  const env = Object.create(process.env);

  env['RAILS_ENV'] = 'test';

  if (useId) {
    env['TEST_ENV_NUMBER'] = id;
  }

  let databaseError = false;
  let fd = JojoExecutionThread.spawn(config.rspecBinary, args, {
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
    databaseError = chunk.toString().match(/ActiveRecord::NoDatabaseError/);
  });

  fd.on('exit', function(exitCode) {
    if (databaseError) {
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

    fd = null;

    onClose(exitCode);
  });

  return fd;
}

JojoExecutionThread.spawn = require('child_process').spawn;

module.exports = JojoExecutionThread;

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
