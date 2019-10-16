'use strict';
const indexdocs = require('../../../lib/indexer/indexdocs.js');
const grid = require('../../../lib/util/grid.js');
const tape = require('tape');
const token = require('../../../lib/text-processing/token.js');
const rewind = require('geojson-rewind');
const fs = require('fs');
const path = require('path');

tape('indexdocs.loadDoc', (t) => {
    const simple_replacer = token.createSimpleReplacer({});
    const complex_replacer = token.createComplexReplacer({});

    const patch = { grid:{}, docs:[], text:[] };
    const freq = {};
    const tokens = ['main', 'st'];
    const zoom = 12;
    const doc = {
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
            coordinates: [0,0]
        }
    };

    freq['__COUNT__'] = [101];
    freq['__MAX__'] = [200];
    freq[tokens[0]] = [1];
    freq[tokens[1]] = [100];

    // Indexes single doc.
    const err = indexdocs.loadDoc(freq, patch, doc, { lang: { has_languages: false, autopopulate: {} } }, zoom, simple_replacer, complex_replacer);
    t.ok(typeof err !== 'number', 'no error');

    t.deepEqual(Object.keys(patch.grid).length, 2, '2 patch.grid entries');
    t.deepEqual(Array.from(patch.grid[Object.keys(patch.grid)[0]].keys()), ['default'], '1 language in patch.grid[0]');
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
    t.deepEqual(patch.text, ['main st', 'main']);

    t.end();
});

tape('indexdocs.standardize', (t) => {
    t.test('indexdocs.standardize - carmen:center & carmen:zxy calculated', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, 6, {});

        q.deepEquals(res, { geometry: { coordinates: [0, 0], type: 'Point' }, id: 1, properties: { 'carmen:center': [0, 0], 'carmen:text': 'main street', 'carmen:zxy': ['6/32/32'] }, type: 'Feature' });
        q.end();
    });

    t.test('indexdocs.standardize - geometry that breaks tilecover is fixed', (q) => {
        const usaRow = fs.readFileSync(path.resolve(__dirname, '../../fixtures/docs.jsonl'), 'utf8').split('\n')[4];
        const brokenUsa = JSON.parse(usaRow);
        // push an empty polygon onto the end of the multypolygon
        brokenUsa.geometry.coordinates[0].push([
            [-100, 27],
            [-100, 27],
            [-100, 27],
            [-100, 27]
        ]);
        q.doesNotThrow(() => indexdocs.standardize(brokenUsa, 6, {}));

        const brokenCollection = JSON.parse(usaRow);
        brokenCollection.geometry = {
            type: 'GeometryCollection',
            geometries: [
                brokenUsa.geometry
            ]
        };
        q.doesNotThrow(() => indexdocs.standardize(brokenCollection, 6, {}));

        q.end();
    });

    t.test('indexdocs.standardize - Must be MultiPoint or GeometryCollection', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0,0]
                }
            }, 6, {});
        }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - Must be MultiPoint or GeometryCollection', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0,0]
                }
            }, 6, {});
        }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber parallel arrays must equal', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,0], [0,0]]
                }
            }, 6, {});
        }, /carmen:addressnumber\[i\] array must be equal to geometry.geometries\[i\] array/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber MultiPoint => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:addressnumber': [9]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:addressnumber':[[9]],'carmen:zxy':['6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiPoint','coordinates':[[0,0]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber lowercased', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9A']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:addressnumber':[['9a']],'carmen:zxy':['6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiPoint','coordinates':[[0,0]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype invalid', (q) => {
        q.throws((t) => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:rangetype': 'tiger'
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,0]]
                }
            }, 6, {});
        }, /ITP results must be a LineString, MultiLineString, or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype LineString => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
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
                coordinates: [[0,0], [1,1]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:rangetype':'tiger','carmen:parityl':[['E']],'carmen:parityr':[['O']],'carmen:lfromhn':[['2']],'carmen:ltohn':[['100']],'carmen:rfromhn':[['1']],'carmen:rtohn':[['101']],'carmen:zxy':['6/32/31','6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiLineString','coordinates':[[[0,0],[1,1]]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype MultiLineString => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
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
                coordinates: [[[0,0], [1,1]]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:rangetype':'tiger','carmen:parityl':[['E']],'carmen:parityr':[['O']],'carmen:lfromhn':[['2']],'carmen:ltohn':[['100']],'carmen:rfromhn':[['1']],'carmen:rtohn':[['101']],'carmen:zxy':['6/32/31','6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiLineString','coordinates':[[[0,0],[1,1]]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:zxy exceeds 10000 covers', (q) => {
        // Build a zxy list with covers of letying distance from center.
        const central = ['6/32/32','6/33/33','6/31/31','6/32/30','6/30/32'];
        const covers = [];
        let i;
        for (i = 0; i < 10000; i++) { covers.push('6/40/40'); }
        for (i = 0; i < 100; i++) central.forEach((central) => {
            covers.push(central);
        });

        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:zxy': covers
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, 6, {});

        q.deepEqual(res.properties['carmen:zxy'].length, 10000, 'truncates carmen:zxy to 10000');
        central.forEach((cover) => {
            t.deepEqual(res.properties['carmen:zxy'].filter((zxy) => { return zxy === cover; }).length, 100, 'sort preserves covers closest to center: ' + cover);
        });
        q.end();
    });

    t.end();
});

tape('indexdocs.verifyCenter', (t) => {
    t.equal(indexdocs.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    t.equal(indexdocs.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    t.equal(indexdocs.verifyCenter([0,null], [[32,32,6]]), false, 'handle null lon');
    t.equal(indexdocs.verifyCenter([null,0], [[32,32,6]]), false, 'handle null lat');
    t.equal(indexdocs.verifyCenter([null,null], [[32,32,6]]), false, 'handle null lon,lat');
    t.end();
});

tape('indexdocs.runChecks', (t) => {
    t.throws(() => {
        indexdocs.runChecks({});
    }, /doc has no id/);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc has no carmen:text on id:1/);

    // we don't expect this one to throw because it has lots of synonyms but is not an address
    t.doesNotThrow(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, '11 synonyms is fine if it\'s not an address');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:addressnumber': [null, ['1175', '1180', '1212', '1326']]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if an address number is present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:rangetype': 'tiger'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if a range type is present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:addressnumber': [null, ['1175', '1180', '1212', '1326']],
                'carmen:rangetype': 'tiger'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if both are present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street'
            }
        });
    }, /"geometry" member required on id:1/);

    // GeometryCollection with a single geometry is caught and not thrown from GeoJSONHint
    t.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0],
            'carmen:addressnumber': [9,10,7],
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [0,0]]
            }]
        }
    }), undefined);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
        }, 12);
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    const coords = [Array.apply(null, Array(50001)).map((ele, i) => {return [1.1 + 0.001 * i,1.1];})];
    coords[0].push([1.1,1.1]);

    t.throws(() => {
        indexdocs.runChecks(rewind({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'Polygon', coordinates: coords }
        }), 12);
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
        }, 12);
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    t.throws(() => {
        indexdocs.runChecks(rewind({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    coords,
                    coords
                ]
            }
        }), 12);
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }, 12), undefined);
    t.end();
});

tape('indexdocs.generateFrequency', (t) => {
    const docs = [{
        type: 'Feature',
        properties: {
            'carmen:text': 'main street',
            'carmen:score': 2
        },
        geometry: {}
    },{
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Road',
            'carmen:score': 1
        },
        geometry: {}
    }];
    const geocoder_tokens = token.createSimpleReplacer({ 'street':'st','road':'rd' });
    t.deepEqual(indexdocs.generateFrequency(docs, token.createSimpleReplacer({})), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        road: [1],
        street: [1]
    });
    // @TODO should 'main' in this case collapse down to 2?
    t.deepEqual(indexdocs.generateFrequency(docs, geocoder_tokens), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        rd: [1],
        st: [1]
    });
    t.end();
});

tape('indexdocs.getNonOutlierBounds', (t) => {

    t.equal(
        indexdocs.getNonOutlierBounds(
            [[
                '9',
                '35',
                '51',
                '63',
                '64',
                '71',
                '85',
                '86',
                '97',
                '100',
                '131',
                '146',
                '166',
                '382',
                '384',
                '406',
                '432',
                '447',
                '504',
                '509',
                '529',
                '540',
                '551',
                '557',
                '564',
                '577',
                '580',
                '633',
                '680',
                '688',
                '693',
                '735',
                '737',
                '740',
                '753',
                '5000', // Expected outlier
            ]],
        )[4],
        1,
        'Single outlier detected',
    );

    t.equal(
        indexdocs.getNonOutlierBounds(
            [[
                '8',
                '13',
                '15',
                '16',
                '17',
                '20',
                '32',
                '38',
                '49',
                '60',
                '64',
                '66',
                '68',
                '70',
                '72',
                '74',
                '76',
                '78',
                '79',
                '80',
                '81',
                '82',
                '84',
                '90',
                '92',
                '93',
                '99',
                '100',
                '101',
                '115',
                '116',
                '165',
                '173',
                '183',
                '199',
                '248',
                '290',
                '304',
                '340',
                '360',
                '371',
                '375',
                '380',
                '400',
                '405',
                '410',
                '416',
                '418',
                '420',
                '422',
                '426',
                '430',
                '432',
                '436',
                '444',
                '446',
                '448',
                '450',
                '452',
                '454',
                '456',
                '458',
                '486',
                '489',
                '490',
                '491',
                '493',
                '495',
                '496',
                '497',
                '499',
                '502',
                '503',
                '508',
                '509',
                '511',
                '514',
                '515',
                '517',
                '520',
                '523',
                '525',
                '526',
                '527',
                '532',
                '535',
                '536',
                '539',
                '541',
                '542',
                '545',
                '547',
                '548',
                '551',
                '552',
                '553',
                '554',
                '557',
                '558',
                '559',
                '560',
                '563',
                '564',
                '565',
                '566',
                '569',
                '570',
                '571',
                '572',
                '575',
                '576',
                '577',
                '578',
                '581',
                '582',
                '583',
                '584',
                '587',
                '590',
                '591',
                '593',
                '595',
                '596',
                '597',
                '599',
                '600',
                '601',
                '602',
                '603',
                '604',
                '606',
                '608',
                '610',
                '611',
                '612',
                '614',
                '615',
                '616',
                '618',
                '627',
                '629',
                '631',
                '633',
                '635',
                '637',
                '639',
                '641',
                '643',
                '645',
                '647',
                '649',
                '650',
                '651',
                '652',
                '653',
                '654',
                '656',
                '657',
                '658',
                '660',
                '661',
                '662',
                '664',
                '665',
                '666',
                '667',
                '668',
                '669',
                '670',
                '672',
                '674',
                '676',
                '678',
                '680',
                '682',
                '684',
                '686',
                '688',
                '690',
                '692',
                '694',
                '696',
                '698',
                '699',
                '702',
                '706',
                '708',
                '716',
                '736',
                '737',
                '738',
                '740',
                '742',
                '744',
                '747',
                '748',
                '749',
                '750',
                '751',
                '752',
                '753',
                '754',
                '756',
                '761',
                '762',
                '763',
                '765',
                '766',
                '769',
                '770',
                '771',
                '772',
                '774',
                '777',
                '779',
                '783',
                '785',
                '788',
                '819',
                '820',
                '841',
                '870',
                '872',
                '874',
                '875',
                '902',
                '904',
                '906',
                '908',
                '926',
                '928',
                '930',
                '932',
                '968',
                '970',
                '972',
                '974',
                '992',
                '994',
                '996',
                '998',
            ]],
        )[4],
        0,
        'No outlier detected',
    );

    t.equal(
        indexdocs.getNonOutlierBounds(
            [[
                '3219', // Expected Outlier!
                '4130', // Expected Outlier!
                '4632',
                '4638',
                '4646',
                '4647',
                '4667',
                '4672',
                '4707',
                '4739',
                '4809',
                '4810',
                '4911',
                '4924',
                '4936',
                '4937',
                '4940',
                '4954',
                '4955',
                '4964',
                '4965',
            ]],
        )[4],
        2,
        'Two outliers detected',
    );

    t.end();
});
