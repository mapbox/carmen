var worker = require('../lib/indexer/indexdocs-worker.js');
var grid = require('../lib/util/grid.js');
var tape = require('tape');
var termops = require('../lib/util/termops.js');
var token = require('../lib/util/token.js');

tape('worker.loadDoc', function(assert) {
    var token_replacer = token.createReplacer({});
    var patch;
    var tokens;
    var freq;
    var zoom;
    var doc;
    var err;

    patch = { grid:{}, docs:0 };
    freq = {};
    tokens = ['main', 'st'];
    zoom = 6;
    doc = {
        _id: 1,
        _text: 'main st',
        _center: [0, 0],
        _zxy: ['6/32/32', '14/16384/32'],
        _score: 100
    };

    freq[0] = [101];
    freq[1] = [200];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    // Indexes single doc.
    err = worker.loadDoc(patch, doc, freq, zoom, token_replacer);
    assert.ifError(err);
    assert.deepEqual(Object.keys(patch.grid).length, 8);
    assert.deepEqual(patch.grid[Object.keys(patch.grid)[0]].length, 1);
    assert.deepEqual(grid.decode(patch.grid[Object.keys(patch.grid)[0]][0]), {
        id: 1,
        relev: 1,
        score: 4, // scales score based on max score value (100)
        x: 32,
        y: 32
    });
    assert.deepEqual(patch.docs, 1);

    assert.end();
});

