const indexdocs = require('../lib/indexer/indexdocs.js');
const grid = require('../lib/util/grid.js');
const tape = require('tape');
// const termops = require('../lib/util/termops.js');
const token = require('../lib/util/token.js');
// const rewind = require('geojson-rewind');
const addrTransform = require('../lib/util/feature.js').addrTransform;

tape('indexdocs.loadDoc', (t) => {
    let token_replacer = token.createReplacer({});
    let patch;
    // let tokens;
    let freq;
    let zoom;
    let doc;
    let err;

    patch = { grid:{}, docs:[], text:[] };
    freq = {};
    tokens = ['rue', 'paul'];
    zoom = 12;
    doc = {
            type:"Feature",
            properties:{
                    "carmen:text":"Rue Paul",
                    "carmen:addressnumber":[
                        null,
                        ["2","3","4","5","6","8","10"]
                    ],
                    "carmen:rangetype":"tiger",
                    "carmen:parityl":[
                        ["O"],
                        null
                    ],
                    "carmen:lfromhn":[
                        [11],
                        null
                    ],
                    "carmen:ltohn":[
                        [1],
                        null
                    ],
                    "carmen:parityr":[
                        ["E"],
                        null
                    ],
                    "carmen:rfromhn":[
                        [20],
                        null
                    ],
                    "carmen:rtohn":[
                        [0],
                        null
                    ],
                    "carmen:geocoder_stack":"fr",
                    "carmen:center":[1.556204,47.27494],
                    'carmen:zxy': ['6/32/32', '6/33/33'],
                    'carmen:score': 100
            },
            geometry:{
                    "type":"GeometryCollection",
                    "geometries":[
                        {"type":"MultiLineString",
                        "coordinates":[
                            [
                                [1.556727,47.274879],
                                [1.556037,47.274981],
                                [1.555809,47.274992]
                            ]
                        ]
                    },
                    {
                        "type":"MultiPoint",
                        "coordinates":[
                            [1.55587,47.275018],
                            [1.556204,47.27494],
                            [1.556075,47.274995],
                            [1.556458,47.274905],
                            [1.556211,47.274976],
                            [1.556399,47.27498],
                            [1.556455,47.274935]
                            ]
                        }
                    ]
            },
            debug:[
                {
                    "type":"featurecollection",
                    "features":[
                        {
                            "type":"Feature",
                            "properties":{"start":true,"left":true},
                            "geometry":{
                                "type":"Point",
                                "coordinates":[1.556458,47.274905]
                            }
                        },
                        {
                            "type":"Feature",
                            "properties":{"end":true,"left":true},
                            "geometry":{
                                "type":"Point",
                                "coordinates":[1.556204,47.27494]
                            }
                        },
                        {
                            "type":"Feature",
                            "properties":{"start":true,"right":true
                        },
                        "geometry":{
                            "type":"Point",
                            "coordinates":[1.556455,47.274935]
                            }
                        },
                        {
                        "type":"Feature",
                        "properties":{"end":true,"right":true},
                        "geometry":{
                            "type":"Point",
                            "coordinates":[1.55587,47.275018]
                            }
                        }
                    ]
                }],
            id:1
        };

    freq["__COUNT__"] = [0];
    freq["__MAX__"] = [0];

    doc = addrTransform(doc);

    // Indexes single doc.
    err = indexdocs.loadDoc(freq, patch, doc, { lang: { has_languages: false } }, zoom, token_replacer);
    t.ok(typeof err !== 'number', 'no error');
    t.deepEqual(Object.keys(patch.grid).length, 3, '3 patch.grid entries'); //
    t.deepEqual(Array.from(patch.grid[Object.keys(patch.grid)[0]].keys()), [ 'default' ], '1 language in patch.grid[0]');
    t.deepEqual(patch.grid[Object.keys(patch.grid)[0]].get('default').length, 2, '2 grids for language "all" in patch.grid[0]');
    t.deepEqual(grid.decode(patch.grid[Object.keys(patch.grid)[0]].get('default')[0]), {
        id: 1,
        relev: 1,
        score: 7, // log scales score of 100 based on max score value of 200
        x: 32,
        y: 32
    }, 'patch.grid[0][0]');
    t.deepEqual(patch.docs.length, 1);
    t.deepEqual(patch.docs[0], doc);
    t.deepEqual(patch.text,  [ '## rue paul', 'rue paul', '# rue paul' ]);

    t.end();
});
