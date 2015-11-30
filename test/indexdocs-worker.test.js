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

    patch = { grid:{}, docs:[], text:[] };
    freq = {};
    tokens = ['main', 'st'];
    zoom = 6;
    doc = {
        id: 1,
        properties: {
            'carmen:text': 'main st',
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/32/32', '14/16384/32'],
            'carmen:score': 100
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
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
    assert.deepEqual(patch.docs.length, 1);
    assert.deepEqual(patch.docs[0], doc);
    assert.deepEqual(patch.text, ['main st', 'main']);

    assert.end();
});

tape('worker.verifyCenter', function(assert) {
    assert.equal(worker.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    assert.equal(worker.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    assert.end();
});

tape('worker.runChecks', function(assert) {
    assert.equal(worker.runChecks({
    }), 'doc has no id');
    assert.equal(worker.runChecks({
        id:1,
        properties: {},
        geometry: {}
    }), 'doc has no carmen:text on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street'
        }
    }), 'doc has no geometry on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:center': [0,0]
        },
        geometry: {}
    }), 'index has no zoom on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text': 'Main Street',
            'carmen:center': [0,0]
        },
        geometry: {}
    }, -1), 'zoom must be greater than 0 --- zoom was -1 on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: {}
    }, 15), 'zoom must be less than 15 --- zoom was 15 on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1');
    assert.equal(worker.runChecks({
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }, 12), '');
    assert.end();
});

