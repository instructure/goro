const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;

exports.compose = function(f, g) {
  return function(x) {
    return f(g(x));
  }
};

exports.stringPad = function(str, padding) {
  var ws = Array(padding).join(' ');

  return str.split('\n').map(function(line) {
    return ws + line;
  }).join('\n');
};

exports.formatStopwatch = (_totalSeconds) => {
  const totalSeconds = parseInt(_totalSeconds, 10);

  let hours    = Math.floor(totalSeconds / SECONDS_IN_HOUR);
  let minutes  = Math.floor(totalSeconds / SECONDS_IN_MINUTE) % MINUTES_IN_HOUR;
  let seconds  = Math.floor(totalSeconds) % SECONDS_IN_MINUTE;

  if (hours   < 10) hours = `0${hours}`;
  if (minutes < 10) minutes = `0${minutes}`;
  if (seconds < 10) seconds = `0${seconds}`;

  return `${hours}:${minutes}:${seconds}`;
};
