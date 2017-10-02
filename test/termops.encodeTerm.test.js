const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.encodeTerm', t => {
    t.deepEqual(termops.encodeTerm('main'), 'main', 'encodes term');
    t.deepEqual(termops.encodeTerm('1234'), '1234', 'encodes numeric term');
    t.deepEqual(
        termops.encodeTerm('2345b'),
        '2345b',
        'encodes seminumeric term'
    );
    t.deepEqual(
        termops.encodeTerm('2345'),
        '2345',
        'encodes seminumeric differently from numeric term'
    );
    t.deepEqual(
        termops.encodeTerm('LS24'),
        'LS24',
        'encodes non-address numeric term with fnv1a'
    );
    t.end();
});

test('termops.encodeTerm collisions', t => {
    let texts = 0;
    let sample = 1e6;
    let ids = {};
    let collisions = [];
    while (texts < sample) {
        let text = Math.random().toString(36);
        let id = termops.encodeTerm(text);
        if (ids[id] === text) {
            continue;
        } else if (ids[id]) {
            collisions.push([ids[id], text]);
        } else {
            ids[id] = text;
        }
        texts++;
    }
    let rate = collisions.length / sample;
    let thresh = 1 / 1e6;
    t.equal(
        rate < thresh,
        true,
        'Collision rate ' +
            (rate * 100).toFixed(4) +
            '% < ' +
            (thresh * 100).toFixed(4) +
            '%'
    );
    t.end();
});
