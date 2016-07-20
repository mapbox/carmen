var indexdocs = require('../lib/indexer/indexdocs.js');
var grid = require('../lib/util/grid.js');
var tape = require('tape');
var termops = require('../lib/util/termops.js');
var token = require('../lib/util/token.js');

tape('indexdocs.loadDoc', function(assert) {
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
        type: "Feature",
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
    newdoc = indexdocs.loadDoc(patch, doc, freq, zoom, token_replacer);
    assert.deepEquals(newdoc, { geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 1, properties: { 'carmen:center': [ 0, 0 ], 'carmen:hash': 1, 'carmen:score': 100, 'carmen:text': 'main st', 'carmen:zxy': [ '6/32/32', '14/16384/32' ] }, type: 'Feature' });

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
    assert.deepEqual(patch.text, ['xmain st', 'xmain']);

    assert.end();
});

tape('indexdocs.loadDoc - No Center', function(assert) {
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
        type: "Feature",
        properties: {
            'carmen:text': 'main st',
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

    assert.deepEqual(doc.properties['carmen:center'], undefined);
    assert.deepEqual(doc.properties['carmen:zxy'], ['6/32/32', '14/16384/32']);

    // Load doc without center, check that center gets set
    newdoc = indexdocs.loadDoc(patch, doc, freq, zoom, token_replacer);
    assert.deepEquals(newdoc, { geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 1, properties: { 'carmen:center': [ 0, 0 ], 'carmen:hash': 1, 'carmen:score': 100, 'carmen:text': 'main st', 'carmen:zxy': [ '6/32/32', '14/16384/32' ] }, type: 'Feature' });
    assert.deepEqual(doc.properties['carmen:center'],[0,0]);
    assert.deepEqual(doc.properties['carmen:zxy'], ['6/32/32', '14/16384/32']);

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
    assert.deepEqual(patch.text, ['xmain st', 'xmain']);

    assert.end();
});

tape('indexdocs.verifyCenter', function(assert) {
    assert.equal(indexdocs.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    assert.equal(indexdocs.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    assert.end();
});

tape('indexdocs.runChecks', function(assert) {
    assert.equal(indexdocs.runChecks({
    }), 'doc must be Feature or FeatureCollection');
    assert.equal(indexdocs.runChecks({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }), 'doc has no id');

    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }), 'doc has no carmen:text on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street'
        }
    }), '"geometry" property required on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
    }, 12), 'a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Polygon', coordinates: [Array.apply(null, Array(50001)).map(function() {return [1.1,1.1]})] }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
    }, 12), 'a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: {
            type: 'MultiPolygon',
            coordinates: [
                [Array.apply(null, Array(50001)).map(function() {return [1.1,1.1]})],
                [Array.apply(null, Array(50001)).map(function() {return [1.1,1.1]})]
            ]
        }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1');
    assert.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }, 12), '');
    assert.end();
});
