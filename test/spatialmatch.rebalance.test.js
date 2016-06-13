var rebalance = require('../lib/spatialmatch.js').rebalance;
var test = require('tape');

test('rebalance, no garbage', function(assert) {
    var query = ['100','main','st','12345','seattle','washington'];
    var stack = [];

    stack[0] = ['1##','main','st'];
    stack[0].mask = 7;
    stack[0].weight = 0.5;

    stack[1] = ['12345'];
    stack[1].mask = 8;
    stack[1].weight = 0.16666666666666666;

    stack[2] = ['seattle'];
    stack[2].mask = 16;
    stack[2].weight = 0.16666666666666666;

    stack[3] = ['washington'];
    stack[3].mask = 32;
    stack[3].weight = 0.16666666666666666;

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

    var stack = [];

    stack[0] = ['1##','main','st'];
    stack[0].mask = 7;
    stack[0].weight = 0.5;

    stack[1] = ['12345'];
    stack[1].mask = 8;
    stack[1].weight = 0.16666666666666666;

    stack[2] = ['washington'];
    stack[2].mask = 32;
    stack[2].weight = 0.16666666666666666;

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

    var stackA = [];

    stackA[0] = ['1##','main','st'];
    stackA[0].mask = 7;
    stackA[0].weight = 0.5;

    stackA[1] = ['12345'];
    stackA[1].mask = 8;
    stackA[1].weight = 0.16666666666666666;

    stackA[2] = ['seattle'];
    stackA[2].mask = 16;
    stackA[2].weight = 0.16666666666666666;

    stackA[3] = ['washington'];
    stackA[3].mask = 32;
    stackA[3].weight = 0.16666666666666666;

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

