const fs = require('fs');
const indexdocs = require('../lib/indexer/indexdocs.js');
const tape = require('tape');

tape('indexdocs.parseDocs (passthru)', t => {
    let docs = [
        {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0, 0]
            },
            geometry: { type: 'Point', coordinates: [0, 0] }
        }
    ];
    let settings = { zoom: 6, geocoder_tokens: {} };
    let full = { vectors: [] };
    let err = indexdocs.parseDocs(docs, settings, full);
    t.ifError(err);
    t.deepEqual(full.vectors, [
        {
            id: 1,
            type: 'Feature',
            properties: {
                id: 1,
                'carmen:text': 'main street',
                'carmen:center': [0, 0]
            },
            geometry: { type: 'Point', coordinates: [0, 0] }
        }
    ]);
    t.end();
});

tape('indexdocs.parseDocs (address MultiPoint)', t => {
    let docs = [
        {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': [['100', '200', '300', '400'], null],
                'carmen:lfromhn': [null, ['1', '101', '201', '301']],
                'carmen:ltohn': [null, ['99', '199', '299', '399']],
                'carmen:rfromhn': [null, ['0', '100', '200', '300']],
                'carmen:rtohn': [null, ['98', '198', '298', '398']],
                'carmen:parityl': [null, ['O', 'O', 'O', 'O']],
                'carmen:parityr': [null, ['E', 'E', 'E', 'E']],
                'carmen:rangetype': 'tiger'
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiPoint',
                        coordinates: [[0, 0], [1, 0], [2, 0], [3, 0]]
                    },
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [[0, 0], [1, 0]],
                            [[2, 0], [3, 0]],
                            [[4, 0], [5, 0]],
                            [[6, 0], [7, 0]]
                        ]
                    }
                ]
            }
        }
    ];
    let settings = { zoom: 6, geocoder_tokens: {} };
    let full = { vectors: [] };
    let err = indexdocs.parseDocs(docs, settings, full);
    t.ifError(err);

    if (process.env.UPDATE) {
        fs.writeFileSync(
            __dirname + '/fixtures/indexdocs.parseDocs.json',
            JSON.stringify(full.vectors, null, 2)
        );
    }
    let expected = JSON.parse(
        fs.readFileSync(__dirname + '/fixtures/indexdocs.parseDocs.json')
    );

    t.deepEqual(full.vectors, expected);
    t.end();
});
