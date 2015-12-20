const Subject = require('../PropTypes');
const { assert } = require('chai');

describe('PropTypes', function() {
  describe('.validate', function() {
    const { validate, string, strictShape } = Subject;

    it('using strictShape, it assumes all fields are required', function() {
      const schema = strictShape({
        id: string
      });

      assert.throws(function() {
        validate(schema, {});
      });
    });
  });
});
