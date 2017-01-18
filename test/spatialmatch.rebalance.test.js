var rebalance = require('../lib/spatialmatch.js').rebalance;
var Phrasematch = require('../lib/phrasematch').Phrasematch;
var test = require('tape');

test('rebalance, no garbage', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];
    var stack = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stack.relev = 1;

    var rebalanced = rebalance(query, stack);
    assert.equal(rebalanced.relev, 1, 'relev = 1');
    assert.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[3].weight, 0.25, 'weight = 0.25');
    assert.end();
});

test('rebalance, with garbage', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];

    var stack = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stack.relev = 0.8333333333333333;

    var rebalanced = rebalance(query, stack);
    assert.equal(rebalanced.relev, 0.75, 'relev = 0.75');
    assert.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    assert.end();
});

test('rebalance copies', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];

    var stackA = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, null, null, null),
    ];

    stackA.relev = 1;

    var stackB = [];
    stackB[0] = stackA[0];

    var rebalancedA = rebalance(query, stackA);
    var rebalancedB = rebalance(query, stackB);

    // Assert that the subqueries in rebalancedA are not affected by
    // the rebalance done to rebalancedB.
    assert.equal(rebalancedA.relev, 1, 'relev = 1');
    assert.equal(rebalancedA[0].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalancedA[1].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalancedA[2].weight, 0.25, 'weight = 0.25');
    assert.equal(rebalancedA[3].weight, 0.25, 'weight = 0.25');

    // Vice versa.
    assert.equal(rebalancedB.relev, 0.50, 'relev = 0.50');
    assert.equal(rebalancedB[0].weight, 0.50, 'weight = 0.50');

    assert.end();
});

