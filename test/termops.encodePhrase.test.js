var termops = require('../lib/util/termops');
var uniq = require('../lib/util/uniq');
var test = require('tape');

test('termops.encodePhrase clustering', function(assert) {
    var sets = [
        ['apples', 'application', 'apply', 'appears', 'appomattox'],
        ['bananas', 'bandana', 'banner', 'bandit', 'banter'],
        ['cat', 'catacomb', 'cateract', 'catastrophe', 'cat nip'],
    ];
    sets.forEach(function(set) {
        var encoded = set.map(function(text) { return termops.encodePhrase(text); });
        assert.deepEqual(uniq(encoded).length, set.length, 'unique phrases ' + set);
    });
    assert.end();
});

test('termops.encodePhrase', function(assert) {
    var a;

    a = termops.encodePhrase('main');
    assert.deepEqual(a, 'xmain', 'main');

    a = termops.encodePhrase('xmain', true);
    assert.deepEqual(a, 'xmain', 'main (skip)');

    a = termops.encodePhrase('main st');
    assert.deepEqual(a, 'xmain st', 'main st');

    a = termops.encodePhrase('xmain st', true);
    assert.deepEqual(a, 'xmain st', 'main st (skip)');

    a = termops.encodePhrase(['main','st']);
    assert.deepEqual(a, 'xmain st', 'main st (array)');

    a = termops.encodePhrase('lazy dog');
    assert.deepEqual(a, 'xlazy dog', 'lazy dog')

    a = termops.encodePhrase('xlazy dog', true);
    assert.deepEqual(a, 'xlazy dog', 'lazy dog (skip)')

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog');
    assert.deepEqual(a, 'xthe quick brown fox jumps over the lazy dog', 'long phrase');

    a = termops.encodePhrase('xthe quick brown fox jumps over the lazy dog', true);
    assert.deepEqual(a, 'xthe quick brown fox jumps over the lazy dog', 'long phrase (skip)');

    // unicode vs unidecoded
    a = termops.encodePhrase('京都市');
    assert.deepEqual(a, 'zjing du shi', '京都市');

    a = termops.encodePhrase('zjing du shi', true);
    assert.deepEqual(a, 'zjing du shi', '京都市 (skip)');

    a = termops.encodePhrase('jing du shi');
    assert.deepEqual(a, 'xjing du shi', 'jing du shi != 京都市');

    // known examples of fnv1a phrase collisions
    // these will be datapoints for decolliding strategies elsewhere...

    // no longer a collision in 52-bit fnv1a
    // assert.deepEqual(
    //     termops.encodePhrase('av francisco de aguirre # la serena'),
    //     termops.encodePhrase('# r ademar da silva neiva'),
    //     'known collisions: #1'
    // );

    assert.end();
});

test('termops.encodePhrase collisions', function(assert) {
    var texts = 0;
    var sample = 1e6;
    var ids = {};
    var collisions = [];
    while (texts < sample) {
        var text = Math.random().toString(36);
        var id = termops.encodePhrase(text);

        if (id >= Math.pow(2,52)) {
            assert.fail('Phrase ID exceeded 2^52: ' + text + ' ' + id);
        } else if (id < 0) {
            assert.fail('Phrase ID < 0: ' + text + ' ' + id);
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
    var rate = (collisions.length/sample);
    var thresh = 1/1e6;
    assert.equal(rate < thresh, true, 'Collision rate ' + (rate*100).toFixed(4) + '% < ' + (thresh*100).toFixed(4) + '%');
    assert.end();
});

