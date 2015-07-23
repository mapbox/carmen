var index = require('../lib/index.js');
var tape = require('tape');

tape('index.verifyCenter', function(assert) {
    assert.equal(index.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    assert.equal(index.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    assert.end();
});


