var Schema = require('react-schema');

exports.validate = function(schema, props, displayName) {
  var result = Schema.validate(schema, props, displayName);

  if (!result.isValid) {
    throw new Error(result.errors.value.toString());
  }
};

exports.compose = function(f, g) {
  return function(x) {
    return f(g(x));
  }
};