var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getWeights', function(assert) {
    var res;
    var tokens;
    var freq;

    tokens = ['a','b','c'];
    freq = {};
    freq["__COUNT__"] = [1002];
    freq[termops.encodeTerm(tokens[0])] = [1000];
    freq[termops.encodeTerm(tokens[1])] = [1];
    freq[termops.encodeTerm(tokens[2])] = [1];

    res = termops.getWeights(tokens, freq);
    assert.deepEqual(res, [
        0.047820577394264194,
        0.47608971130286787,
        0.47608971130286787
    ], 'weights terms');
    assert.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    tokens = ['###', 'a','b','c'];
    res = termops.getWeights(tokens, freq)
    assert.deepEqual(res, [
        0.2,
        0.038256461915411356,
        0.3808717690422943,
        0.3808717690422943
    ], 'weights numTokens @ 0.2 and adjusts others');
    assert.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    tokens = ['a','b','c','###'];
    res = termops.getWeights(tokens, freq)
    assert.deepEqual(res, [
        0.038256461915411356,
        0.3808717690422943,
        0.3808717690422943,
        0.2
    ], 'weights numTokens @ 0.2 and adjusts others');
    assert.equal(res.reduce(sum,0), 1, 'weights sum to 1');

    assert.end();
});

function sum(memo, val) { return memo + val; }
