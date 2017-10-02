const rebalance = require('../lib/spatialmatch.js').rebalance;
const Phrasematch = require('../lib/phrasematch').Phrasematch;
const test = require('tape');

test('rebalance, no garbage', t => {
    let query = ['100', 'main', 'st', '12345', 'seattle', 'washington'];
    let stack = [
        new Phrasematch(['1##', 'main', 'st'], 0.5, 7, null, null, null, null),
        new Phrasematch(
            ['12345'],
            0.16666666666666666,
            8,
            null,
            null,
            null,
            null
        ),
        new Phrasematch(
            ['seattle'],
            0.16666666666666666,
            16,
            null,
            null,
            null,
            null
        ),
        new Phrasematch(
            ['washington'],
            0.16666666666666666,
            32,
            null,
            null,
            null,
            null
        )
    ];

    stack.relev = 1;

    let rebalanced = rebalance(query, stack);
    t.equal(rebalanced.relev, 1, 'relev = 1');
    t.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    t.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    t.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    t.equal(rebalanced[3].weight, 0.25, 'weight = 0.25');
    t.end();
});

test('rebalance, with garbage', t => {
    let query = ['100', 'main', 'st', '12345', 'seattle', 'washington'];

    let stack = [
        new Phrasematch(['1##', 'main', 'st'], 0.5, 7, null, null, null, null),
        new Phrasematch(
            ['12345'],
            0.16666666666666666,
            8,
            null,
            null,
            null,
            null
        ),
        new Phrasematch(
            ['washington'],
            0.16666666666666666,
            32,
            null,
            null,
            null,
            null
        )
    ];

    stack.relev = 0.8333333333333333;

    let rebalanced = rebalance(query, stack);
    t.equal(rebalanced.relev, 0.75, 'relev = 0.75');
    t.equal(rebalanced[0].weight, 0.25, 'weight = 0.25');
    t.equal(rebalanced[1].weight, 0.25, 'weight = 0.25');
    t.equal(rebalanced[2].weight, 0.25, 'weight = 0.25');
    t.end();
});

test('rebalance copies', t => {
    let query = ['100', 'main', 'st', '12345', 'seattle', 'washington'];

    let stackA = [
        new Phrasematch(['1##', 'main', 'st'], 0.5, 7, null, null, null, null),
        new Phrasematch(
            ['12345'],
            0.16666666666666666,
            8,
            null,
            null,
            null,
            null
        ),
        new Phrasematch(
            ['seattle'],
            0.16666666666666666,
            16,
            null,
            null,
            null,
            null
        ),
        new Phrasematch(
            ['washington'],
            0.16666666666666666,
            32,
            null,
            null,
            null,
            null
        )
    ];

    stackA.relev = 1;

    let stackB = [];
    stackB[0] = stackA[0];

    let rebalancedA = rebalance(query, stackA);
    let rebalancedB = rebalance(query, stackB);

    // Assert that the subqueries in rebalancedA are not affected by
    // the rebalance done to rebalancedB.
    t.equal(rebalancedA.relev, 1, 'relev = 1');
    t.equal(rebalancedA[0].weight, 0.25, 'weight = 0.25');
    t.equal(rebalancedA[1].weight, 0.25, 'weight = 0.25');
    t.equal(rebalancedA[2].weight, 0.25, 'weight = 0.25');
    t.equal(rebalancedA[3].weight, 0.25, 'weight = 0.25');

    // Vice versa.
    t.equal(rebalancedB.relev, 0.5, 'relev = 0.50');
    t.equal(rebalancedB[0].weight, 0.5, 'weight = 0.50');

    t.end();
});
