const Subject = require('../GoroUtils');
const sinon = require('sinon');
const { assert } = require('chai');

describe('GoroUtils', function() {
  describe('.compose', function() {
    it("does what it's supposed to do", function() {
      const first = sinon.spy(() => 'x');
      const second = sinon.spy(() => 'y');
      const chain = Subject.compose(second, first);

      const result = chain('a');

      assert.calledWith(first, 'a');
      assert.calledWith(second, 'x');
      assert.equal(result, 'y');
    });
  });
});
