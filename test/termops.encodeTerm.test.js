var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.encodeTerm', function(assert) {
    assert.deepEqual(termops.encodeTerm('main'), 'main', 'encodes term');
    assert.deepEqual(termops.encodeTerm('1234'), '1234', 'encodes numeric term');
    assert.deepEqual(termops.encodeTerm('2345b'), '2345b', 'encodes seminumeric term');
    assert.deepEqual(termops.encodeTerm('2345'), '2345', 'encodes seminumeric differently from numeric term');
    assert.deepEqual(termops.encodeTerm('LS24'), 'LS24', 'encodes non-address numeric term with fnv1a');
    assert.end();
});

test('termops.encodeTerm collisions', function(assert) {
    var texts = 0;
    var sample = 1e6;
    var ids = {};
    var collisions = [];
    while (texts < sample) {
        var text = Math.random().toString(36);
        var id = termops.encodeTerm(text);
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

