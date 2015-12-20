const PropTypes = Object.create(require('react-schema').PropTypes);
const assert = require('assert');

PropTypes.strictShape = function(args) {
  const strictArgs = Object.keys(args).reduce(function(strict, key) {
    if (args[key].isRequired instanceof Function) {
      strict[key] = args[key].isRequired;
    }
    else {
      strict[key] = args[key];
    }

    return strict;
  }, {});

  return PropTypes.shape(strictArgs);
};

PropTypes.validate = function(schema, props, displayName = 'Anonymous') {
  const error = validateSchema(schema, props, displayName);

  if (error) {
    throw new Error(error);
  }
};

module.exports = PropTypes;

// INTERNAL

function validateSchema(propTypes, props, displayName) {
  assert(typeof propTypes === 'function');

  const error = propTypes({ root: props }, 'root', displayName, 'prop');

  if (error) {
    return error.message.replace(/prop `root\./, 'prop `');
  }
}