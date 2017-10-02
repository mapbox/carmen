const indexdocs = require('../lib/indexer/indexdocs.js');
const grid = require('../lib/util/grid.js');
const tape = require('tape');
const termops = require('../lib/util/termops.js');
const token = require('../lib/util/token.js');
const rewind = require('geojson-rewind');

tape('indexdocs.loadDoc', t => {
    let token_replacer = token.createReplacer({});
    let patch;
    let tokens;
    let freq;
    let zoom;
    let doc;
    let err;

    patch = { grid: {}, docs: [], text: [] };
    freq = {};
    tokens = ['main', 'st'];
    zoom = 12;
    doc = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'main st',
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/32/32', '6/33/33'],
            'carmen:score': 100
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    };

    freq['__COUNT__'] = [101];
    freq['__MAX__'] = [200];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    // Indexes single doc.
    err = indexdocs.loadDoc(
        freq,
        patch,
        doc,
        { lang: { has_languages: false } },
        zoom,
        token_replacer
    );
    t.ok(typeof err !== 'number', 'no error');

    t.deepEqual(Object.keys(patch.grid).length, 2, '2 patch.grid entries');
    t.deepEqual(
        Array.from(patch.grid[Object.keys(patch.grid)[0]].keys()),
        ['default'],
        '1 language in patch.grid[0]'
    );
    t.deepEqual(
        patch.grid[Object.keys(patch.grid)[0]].get('default').length,
        2,
        '2 grids for language "all" in patch.grid[0]'
    );
    t.deepEqual(
        grid.decode(patch.grid[Object.keys(patch.grid)[0]].get('default')[0]),
        {
            id: 1,
            relev: 1,
            score: 7, // log scales score of 100 based on max score value of 200
            x: 32,
            y: 32
        },
        'patch.grid[0][0]'
    );
    t.deepEqual(patch.docs.length, 1);
    t.deepEqual(patch.docs[0], doc);
    t.deepEqual(patch.text, ['main st', 'main']);

    t.end();
});

tape('indexdocs.standardize', t => {
    t.test(
        'indexdocs.standardize - carmen:center & carmen:zxy calculated',
        q => {
            let res = indexdocs.standardize(
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main street'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                },
                6,
                {}
            );

            q.deepEquals(res, {
                geometry: { coordinates: [0, 0], type: 'Point' },
                id: 1,
                properties: {
                    'carmen:center': [0, 0],
                    'carmen:text': 'main street',
                    'carmen:zxy': ['6/32/32']
                },
                type: 'Feature'
            });
            q.end();
        }
    );

    t.test(
        'indexdocs.standardize - Must be MultiPoint or GeometryCollection',
        q => {
            q.throws(() => {
                indexdocs.standardize(
                    {
                        id: 1,
                        type: 'Feature',
                        properties: {
                            'carmen:text': 'main street',
                            'carmen:center': [0, 0],
                            'carmen:addressnumber': [9]
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0]
                        }
                    },
                    6,
                    {}
                );
            }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

            q.end();
        }
    );

    t.test(
        'indexdocs.standardize - Must be MultiPoint or GeometryCollection',
        q => {
            q.throws(() => {
                indexdocs.standardize(
                    {
                        id: 1,
                        type: 'Feature',
                        properties: {
                            'carmen:text': 'main street',
                            'carmen:center': [0, 0],
                            'carmen:addressnumber': [9]
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0]
                        }
                    },
                    6,
                    {}
                );
            }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

            q.end();
        }
    );

    t.test(
        'indexdocs.standardize - carmen:addressnumber parallel arrays must equal',
        q => {
            q.throws(() => {
                indexdocs.standardize(
                    {
                        id: 1,
                        type: 'Feature',
                        properties: {
                            'carmen:text': 'main street',
                            'carmen:center': [0, 0],
                            'carmen:addressnumber': [9]
                        },
                        geometry: {
                            type: 'MultiPoint',
                            coordinates: [[0, 0], [0, 0]]
                        }
                    },
                    6,
                    {}
                );
            }, /carmen:addressnumber\[i\] array must be equal to geometry.geometries\[i\] array/);

            q.end();
        }
    );

    t.test(
        'indexdocs.standardize - carmen:addressnumber MultiPoint => GeometryCollection',
        q => {
            let res = indexdocs.standardize(
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main street',
                        'carmen:center': [0, 0],
                        'carmen:addressnumber': [9]
                    },
                    geometry: {
                        type: 'MultiPoint',
                        coordinates: [[0, 0]]
                    }
                },
                6,
                {}
            );

            q.deepEquals(res, {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0, 0],
                    'carmen:addressnumber': [[9]],
                    'carmen:zxy': ['6/32/32']
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [{ type: 'MultiPoint', coordinates: [[0, 0]] }]
                }
            });
            q.end();
        }
    );

    t.test('indexdocs.standardize - carmen:addressnumber lowercased', q => {
        let res = indexdocs.standardize(
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0, 0],
                    'carmen:addressnumber': ['9A']
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0, 0]]
                }
            },
            6,
            {}
        );

        q.deepEquals(res, {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': [['9a']],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{ type: 'MultiPoint', coordinates: [[0, 0]] }]
            }
        });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype invalid', q => {
        q.throws(t => {
            indexdocs.standardize(
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main street',
                        'carmen:center': [0, 0],
                        'carmen:rangetype': 'tiger'
                    },
                    geometry: {
                        type: 'MultiPoint',
                        coordinates: [[0, 0]]
                    }
                },
                6,
                {}
            );
        }, /ITP results must be a LineString, MultiLineString, or GeometryCollection/);

        q.end();
    });

    t.test(
        'indexdocs.standardize - carmen:rangetype LineString => GeometryCollection',
        q => {
            let res = indexdocs.standardize(
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main street',
                        'carmen:center': [0, 0],
                        'carmen:rangetype': 'tiger',
                        'carmen:parityl': 'E',
                        'carmen:parityr': 'O',
                        'carmen:lfromhn': '2',
                        'carmen:ltohn': '100',
                        'carmen:rfromhn': '1',
                        'carmen:rtohn': '101'
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: [[0, 0], [1, 1]]
                    }
                },
                6,
                {}
            );

            q.deepEquals(res, {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0, 0],
                    'carmen:rangetype': 'tiger',
                    'carmen:parityl': [['E']],
                    'carmen:parityr': [['O']],
                    'carmen:lfromhn': [['2']],
                    'carmen:ltohn': [['100']],
                    'carmen:rfromhn': [['1']],
                    'carmen:rtohn': [['101']],
                    'carmen:zxy': ['6/32/31', '6/32/32']
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        {
                            type: 'MultiLineString',
                            coordinates: [[[0, 0], [1, 1]]]
                        }
                    ]
                }
            });
            q.end();
        }
    );

    t.test(
        'indexdocs.standardize - carmen:rangetype MultiLineString => GeometryCollection',
        q => {
            let res = indexdocs.standardize(
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main street',
                        'carmen:center': [0, 0],
                        'carmen:rangetype': 'tiger',
                        'carmen:parityl': ['E'],
                        'carmen:parityr': ['O'],
                        'carmen:lfromhn': ['2'],
                        'carmen:ltohn': ['100'],
                        'carmen:rfromhn': ['1'],
                        'carmen:rtohn': ['101']
                    },
                    geometry: {
                        type: 'MultiLineString',
                        coordinates: [[[0, 0], [1, 1]]]
                    }
                },
                6,
                {}
            );

            q.deepEquals(res, {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0, 0],
                    'carmen:rangetype': 'tiger',
                    'carmen:parityl': [['E']],
                    'carmen:parityr': [['O']],
                    'carmen:lfromhn': [['2']],
                    'carmen:ltohn': [['100']],
                    'carmen:rfromhn': [['1']],
                    'carmen:rtohn': [['101']],
                    'carmen:zxy': ['6/32/31', '6/32/32']
                },
                geometry: {
                    type: 'GeometryCollection',
                    geometries: [
                        {
                            type: 'MultiLineString',
                            coordinates: [[[0, 0], [1, 1]]]
                        }
                    ]
                }
            });
            q.end();
        }
    );

    t.test('indexdocs.standardize - carmen:zxy exceeds 10000 covers', q => {
        // Build a zxy list with covers of letying distance from center.
        let central = ['6/32/32', '6/33/33', '6/31/31', '6/32/30', '6/30/32'];
        let covers = [];
        let i;
        for (i = 0; i < 10000; i++) {
            covers.push('6/40/40');
        }
        for (i = 0; i < 100; i++)
            central.forEach(central => {
                covers.push(central);
            });

        let res = indexdocs.standardize(
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0, 0],
                    'carmen:zxy': covers
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            6,
            {}
        );

        q.deepEqual(
            res.properties['carmen:zxy'].length,
            10000,
            'truncates carmen:zxy to 10000'
        );
        central.forEach(cover => {
            t.deepEqual(
                res.properties['carmen:zxy'].filter(zxy => {
                    return zxy === cover;
                }).length,
                100,
                'sort preserves covers closest to center: ' + cover
            );
        });
        q.end();
    });

    t.end();
});

tape('indexdocs.verifyCenter', t => {
    t.equal(
        indexdocs.verifyCenter([0, 0], [[0, 0, 0]]),
        true,
        'center in tiles'
    );
    t.equal(
        indexdocs.verifyCenter([0, -45], [[0, 0, 1], [1, 0, 1]]),
        false,
        'center outside tiles'
    );
    t.equal(
        indexdocs.verifyCenter([0, null], [[32, 32, 6]]),
        false,
        'handle null lon'
    );
    t.equal(
        indexdocs.verifyCenter([null, 0], [[32, 32, 6]]),
        false,
        'handle null lat'
    );
    t.equal(
        indexdocs.verifyCenter([null, null], [[32, 32, 6]]),
        false,
        'handle null lon,lat'
    );
    t.end();
});

tape('indexdocs.runChecks', t => {
    t.throws(() => {
        indexdocs.runChecks({});
    }, /doc has no id/);

    t.throws(() => {
        indexdocs.runChecks({
            id: 1,
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        });
    }, /doc has no carmen:text on id:1/);

    t.throws(() => {
        indexdocs.runChecks({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street'
            }
        });
    }, /"geometry" member required on id:1/);

    //GeometryCollection with a single geometry is caught and not thrown from GeoJSONHint
    t.equal(
        indexdocs.runChecks({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': [9, 10, 7]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiPoint',
                        coordinates: [[1, 1], [2, 2], [0, 0]]
                    }
                ]
            }
        }),
        undefined
    );

    t.throws(() => {
        indexdocs.runChecks(
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Main Street',
                    'carmen:center': [0, 0]
                },
                geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
            },
            12
        );
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    let coords = [
        Array.apply(null, Array(50001)).map((ele, i) => {
            return [1.1 + 0.001 * i, 1.1];
        })
    ];
    coords[0].push([1.1, 1.1]);

    t.throws(() => {
        indexdocs.runChecks(
            rewind({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Main Street',
                    'carmen:center': [0, 0]
                },
                geometry: { type: 'Polygon', coordinates: coords }
            }),
            12
        );
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.throws(() => {
        indexdocs.runChecks(
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Main Street',
                    'carmen:center': [0, 0]
                },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [[new Array(30e3)], [new Array(30e3)]]
                }
            },
            12
        );
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    t.throws(() => {
        indexdocs.runChecks(
            rewind({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Main Street',
                    'carmen:center': [0, 0]
                },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [coords, coords]
                }
            }),
            12
        );
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.equal(
        indexdocs.runChecks(
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Main Street',
                    'carmen:center': [0, 0]
                },
                geometry: { type: 'Point', coordinates: [0, 0] }
            },
            12
        ),
        undefined
    );
    t.end();
});

tape('indexdocs.generateFrequency', t => {
    let docs = [
        {
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:score': 2
            },
            geometry: {}
        },
        {
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Road',
                'carmen:score': 1
            },
            geometry: {}
        }
    ];
    let geocoder_tokens = token.createReplacer({ street: 'st', road: 'rd' });
    t.deepEqual(indexdocs.generateFrequency(docs, {}), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        road: [1],
        street: [1]
    });
    // @TODO should 'main' in this case collapse down to 2?
    t.deepEqual(indexdocs.generateFrequency(docs, geocoder_tokens), {
        __COUNT__: [8],
        __MAX__: [2],
        main: [4],
        rd: [1],
        st: [1],
        street: [1],
        road: [1]
    });
    t.end();
});
