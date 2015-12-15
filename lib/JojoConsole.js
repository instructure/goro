const EventEmitter = require('events');

module.exports = function JojoConsole() {
  const emitter = new EventEmitter();
  const console = {};

  console.log = function(message) {
    emitter.emit('message', fmt(message, [].slice.call(arguments, 1)));
  };

  console.debugLog = function(message) {
    emitter.emit('debugMessage', fmt(message, [].slice.call(arguments, 1)));
  };

  console.error = function(message) {
    emitter.emit('error', fmt(message, [].slice.call(arguments, 1)));
  };

  console.on = emitter.on.bind(emitter);

  return console;
};

function fmt(message, args) {
  let index = 0;

  return message.replace(/%d|%s/g, function(match) {
    const repl = args[index++];

    if (match === '%d') {
      return parseInt(repl, 10);
    }
    else {
      return repl;
    }
  });
}
