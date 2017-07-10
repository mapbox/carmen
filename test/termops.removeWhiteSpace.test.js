const tape = require('tape');
const readline = require('readline');
const fs = require('fs');
const termops = require('../lib/util/termops');

tape('removeWhiteSpace', (assert) => {
    let noSpace = termops.removeWhiteSpace('this has a space');
    let result = noSpace.indexOf(' ');
    assert.deepEqual(noSpace, 'thishasaspace', 'result and removed spaces are the same')
    assert.deepEqual(result, -1, 'removeWhiteSpace() removes whitespace');
    assert.end();
});
