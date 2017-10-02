const termops = require('../lib/util/termops');
const uniq = require('../lib/util/uniq');
const test = require('tape');

test('termops.encodePhrase clustering', t => {
    let sets = [
        ['apples', 'application', 'apply', 'appears', 'appomattox'],
        ['bananas', 'bandana', 'banner', 'bandit', 'banter'],
        ['cat', 'catacomb', 'cateract', 'catastrophe', 'cat nip']
    ];
    sets.forEach(set => {
        let encoded = set.map(text => {
            return termops.encodePhrase(text);
        });
        t.deepEqual(uniq(encoded).length, set.length, 'unique phrases ' + set);
    });
    t.end();
});

test('termops.encodePhrase', t => {
    let a;

    a = termops.encodePhrase('main');
    t.deepEqual(a, 'main', 'main');

    a = termops.encodePhrase('main', true);
    t.deepEqual(a, 'main', 'main (skip)');

    a = termops.encodePhrase('main st');
    t.deepEqual(a, 'main st', 'main st');

    a = termops.encodePhrase('main st', true);
    t.deepEqual(a, 'main st', 'main st (skip)');

    a = termops.encodePhrase(['main', 'st']);
    t.deepEqual(a, 'main st', 'main st (array)');

    a = termops.encodePhrase('lazy dog');
    t.deepEqual(a, 'lazy dog', 'lazy dog');

    a = termops.encodePhrase('lazy dog', true);
    t.deepEqual(a, 'lazy dog', 'lazy dog (skip)');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog');
    t.deepEqual(
        a,
        'the quick brown fox jumps over the lazy dog',
        'long phrase'
    );

    a = termops.encodePhrase(
        'the quick brown fox jumps over the lazy dog',
        true
    );
    t.deepEqual(
        a,
        'the quick brown fox jumps over the lazy dog',
        'long phrase (skip)'
    );

    // unicode vs unidecoded
    a = termops.encodePhrase('京都市');
    t.deepEqual(a, '京都市', '京都市');

    a = termops.encodePhrase('zjing du shi', true);
    t.deepEqual(a, 'zjing du shi', '京都市 (skip)');

    a = termops.encodePhrase('jing du shi');
    t.deepEqual(a, 'jing du shi', 'jing du shi != 京都市');

    // known examples of fnv1a phrase collisions
    // these will be datapoints for decolliding strategies elsewhere...

    // no longer a collision in 52-bit fnv1a
    // t.deepEqual(
    //     termops.encodePhrase('av francisco de aguirre # la serena'),
    //     termops.encodePhrase('# r ademar da silva neiva'),
    //     'known collisions: #1'
    // );

    t.end();
});

test('termops.encodePhrase collisions', t => {
    let texts = 0;
    let sample = 1e6;
    let ids = {};
    let collisions = [];
    while (texts < sample) {
        let text = Math.random().toString(36);
        let id = termops.encodePhrase(text);

        if (id >= Math.pow(2, 52)) {
            t.fail('Phrase ID exceeded 2^52: ' + text + ' ' + id);
        } else if (id < 0) {
            t.fail('Phrase ID < 0: ' + text + ' ' + id);
        }

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
