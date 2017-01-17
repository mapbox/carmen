var fs = require('fs');
var indexdocs = require('../lib/indexer/indexdocs.js');
var tape = require('tape');

tape('indexdocs.parseDocs (passthru)', function(assert) {
    var docs = [{
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'main street',
            'carmen:center': [0,0]
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }];
    var settings = { zoom: 6, geocoder_tokens: {} };
    var full = { vectors: [] };
    var err = indexdocs.parseDocs(docs, settings, full);
    assert.ifError(err);
    assert.deepEqual(full.vectors, [{
        id: 1,
        type: 'Feature',
        properties: {
            id: 1,
            'carmen:text': 'main street'
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }]);
    assert.end();
});

tape('indexdocs.parseDocs (address MultiPoint)', function(assert) {
    var docs = [{
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'main street',
            'carmen:center': [0,0],
            'carmen:addressnumber': [
                [ '100', '200', '300', '400' ],
                null
            ],
            'carmen:lfromhn': [ null, ['1', '101', '201', '301']],
            'carmen:ltohn': [ null, ['99', '199', '299', '399']],
            'carmen:rfromhn': [ null, ['0', '100', '200', '300']],
            'carmen:rtohn': [ null, ['98', '198', '298', '398']],
            'carmen:parityl': [ null, ['O','O','O','O']],
            'carmen:parityr': [ null, ['E','E','E','E']],
            'carmen:rangetype': 'tiger'
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiPoint',
                    coordinates: [
                        [0,0],
                        [1,0],
                        [2,0],
                        [3,0]
                    ]
                },
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [[0,0], [1,0]],
                        [[2,0], [3,0]],
                        [[4,0], [5,0]],
                        [[6,0], [7,0]]
                    ]
                }
            ]
        }
    }];
    var settings = { zoom: 6, geocoder_tokens: {} };
    var full = { vectors: [] };
    var err = indexdocs.parseDocs(docs, settings, full);
    assert.ifError(err);

    if (process.env.UPDATE) {
        fs.writeFileSync(__dirname + '/fixtures/indexdocs.parseDocs.json', JSON.stringify(full.vectors, null, 2));
    }
    var expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/indexdocs.parseDocs.json'));

    assert.deepEqual(full.vectors, expected);
    assert.end();
});

