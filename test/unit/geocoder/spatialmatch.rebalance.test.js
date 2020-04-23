'use strict';


const rebalance = require('../../../lib/geocoder/spatialmatch').rebalance;
const Phrasematch = require('../../../lib/geocoder/phrasematch').Phrasematch;
const test = require('tape');

/**
 * Converts an array of PhraseMatches to Stacks
 *
 * @param phraseMatches {Array} An array of phraseMatches
 */
function convertPhraseMatchesToStacks(phraseMatches) {
    const stack = {
        entries: []
    };
    for (let k = 0; k < phraseMatches.length; k++) {
        stack.entries.push({
            grid_entry: {
                relev: phraseMatches[k].weight
            },
            mask: phraseMatches[k].mask,
            phrasematch_id: k
        });
    }
    return stack;
}

test('rebalance, no garbage', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];

    const phraseMatches = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, [0, 0], null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, [0, 0], null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, [0, 0], null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, [0, 0], null, null, null),
    ];

    const stack = convertPhraseMatchesToStacks(phraseMatches);

    stack.relev = 1;

    const rebalanced = rebalance(query, stack, phraseMatches);
    t.equal(rebalanced.relev, 1, 'relev = 1');
    t.equal(rebalanced.entries[0].grid_entry.relev, 0.5, '1## main st weight = 0.5');
    t.equal(rebalanced.entries[1].grid_entry.relev, 0.16666666666666666, '12345 weight = 0.167');
    t.equal(rebalanced.entries[2].grid_entry.relev, 0.16666666666666666, 'seattle weight = 0.167');
    t.equal(rebalanced.entries[3].grid_entry.relev, 0.16666666666666666, 'washington weight = 0.167');
    t.end();
});

test('rebalance, with garbage', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];

    const phrasematches = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, [0, 0], null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, [0, 0], null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, [0, 0], null, null, null),
    ];

    const stack = convertPhraseMatchesToStacks(phrasematches);

    stack.relev = 0.8333333333333333;

    const rebalanced = rebalance(query, stack, phrasematches);
    t.equal(rebalanced.relev, 0.77777779, 'relev = 0.75');
    t.equal(rebalanced.entries[0].grid_entry.relev, 0.34666667, '1## main st weight = 0.347');
    t.equal(rebalanced.entries[1].grid_entry.relev, 0.21555556, '12345 weight = 0.216');
    t.equal(rebalanced.entries[2].grid_entry.relev, 0.21555556, 'washington weight = 0.216');
    t.end();
});

test('rebalance copies', (t) => {
    const query = ['100','main','st','12345','seattle','washington'];

    const phrasematches = [
        new Phrasematch(['1##','main','st'], 0.5, 7, null, [0, 0], null, null, null),
        new Phrasematch(['12345'], 0.16666666666666666, 8, null, [0, 0], null, null, null),
        new Phrasematch(['seattle'], 0.16666666666666666, 16, null, [0, 0], null, null, null),
        new Phrasematch(['washington'], 0.16666666666666666, 32, null, [0, 0], null, null, null),
    ];

    const stackA = convertPhraseMatchesToStacks(phrasematches);

    stackA.relev = 1;

    const stackB = {
        entries: []
    };
    stackB.entries[0] = stackA.entries[0];
    stackB.relev = 0.5;

    const rebalancedA = rebalance(query, stackA, phrasematches);
    const rebalancedB = rebalance(query, stackB, phrasematches);

    // Assert that the subqueries in rebalancedA are not affected by
    // the rebalance done to rebalancedB.
    t.equal(rebalancedA.relev, 1, 'relev = 1');
    t.equal(rebalancedA.entries[0].grid_entry.relev, 0.5, 'weight = 0.5');
    t.equal(rebalancedA.entries[1].grid_entry.relev, 0.16666666666666666, 'weight = 0.167');
    t.equal(rebalancedA.entries[2].grid_entry.relev, 0.16666666666666666, 'weight = 0.167');
    t.equal(rebalancedA.entries[3].grid_entry.relev, 0.16666666666666666, 'weight = 0.167');

    // Vice versa.
    t.equal(rebalancedB.relev, 0.5, 'relev = 0.50');
    t.equal(rebalancedB.entries[0].grid_entry.relev, 0.5, 'weight = 0.50');

    t.end();
});

