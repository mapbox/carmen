const tape = require('tape');
const zlib = require('zlib');
const DawgCache = require('../lib/util/dawg');
const termops = require('../lib/util/termops');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
// const context = require('../lib/context');


// be able to add a specific feature
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// create basic outline for a feature to be searched
const conf = {
    country: new mem({
        maxzoom: 6,
        geocoder_address: 0,
        geocoder_languages: ['en'],
    }, () => {}),
    city: new mem({
        maxzoom: 6,
        geocoder_address: 0,
        geocoder_languages: ['en'],
    }, () => {}),
    street: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_languages: ['en'],
    }, () => {}),
    landmark: new mem({
        maxzoom: 6,
        geocoder_address: 0,
        geocoder_languages: ['en'],
    }, () => {}),
};


const c = new Carmen(conf);

// create feature to be searched for country, city, street, and landmark
tape('index Wall St', (t) => {
    let street = {
        "id":1,
        "properties": {
            'carmen:text':'Wall St',
            'carmen:text_en':'Wall St',
            "carmen:center":  [ -74.01034355163574, 40.706912973264785 ]
        },
        "geometry": {
            "type": "Point",
            "coordinates": [
                -74.01034355163574,
                40.706912973264785
            ]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('index city', (t) => {
    let city = {
        "id":1,
        "properties": {
            'carmen:text':'New York',
            'carmen:text_en': 'New York',
            "carmen:center":  [ -74.01047229766846, 40.70716509319156 ]
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -74.0105152130127,
                        40.70792146442606
                    ],
                    [
                        -74.01156663894653,
                        40.707043102014715
                    ],
                    [
                        -74.0103006362915,
                        40.70640872195707
                    ],
                    [
                        -74.00937795639038,
                        40.70714069841032
                    ],
                    [
                        -74.0105152130127,
                        40.70792146442606
                    ]
                ]
            ]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index Christ the Redeemer', (t) => {
    let landmark = {
        "id":1,
        "properties": {
            'carmen:text':'Christ the Redeemer',
            'carmen:text_en':'Christ the Redeemer',
            "carmen:center":  [ -50.80078125, -10.444597722834875 ]
        },
        "geometry": {
            "type": "Point",
            "coordinates": [
                -50.80078125,
                -10.444597722834875

            ]
        }
    };
    queueFeature(conf.landmark, landmark, t.end);
});
tape('index Brazil', (t) => {
    let country = {
        "id":1,
        "properties": {
            'carmen:text':'Brazil',
            'carmen:text_en':'Brazil',
            "carmen:center":  [ -49.9658203125, -10.481333461113326 ]
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -55.54687499999999,
                        -14.647368383896618
                    ],
                    [
                        -44.384765625,
                        -14.647368383896618
                    ],
                    [
                        -44.384765625,
                        -6.315298538330033
                    ],
                    [
                        -55.54687499999999,
                        -6.315298538330033
                    ],
                    [
                        -55.54687499999999,
                        -14.647368383896618
                    ]
                ]
            ]
        }
    };
    queueFeature(conf.country, country, t.end);
});

// queue features built
tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

// create and load DawgCache
tape('create', (t) => {
    const dict = new DawgCache();
    t.ok(dict, "dawg created")
    t.end();
});

tape('dump/load DawgCache', (t) => {
    const dict = new DawgCache();
    dict.setText("a1");
    dict.setText("a2");
    dict.setText("a3");
    dict.setText("a4");


    zlib.gzip(dict.dump(), (err, zdata) => {
        t.ifError(err);
        t.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
        zlib.gunzip(zdata, (err, data) => {
            t.ifError(err);
            let loaded = new DawgCache(data);
            // lookupprefix = false
            for (let i = 1; i <= 4; i++) {
                var phrase = loaded.hasPhrase(`a${i}`, false, true);
                console.log(typeof phrase);
                t.deepEqual(phrase, { exact_match: true, final: true, text: `a${i}` }, `return { exact_match: true, final: true, text: a${i}}`);
            }
            // fuzzy search addition
            t.deepEqual(loaded.hasPhrase("a45", false, true), { exact_match: false, final: true, text: 'a4' }, 'not a45');
            // fuzzy search deletion
            t.deepEqual(loaded.hasPhrase("a", false, true), null, 'not a');
            t.deepEqual(loaded.hasPhrase("a", true, true), { exact_match: true, final: true, text: 'a' }, 'has a as degen');

            t.end();
        });
    });
});

// // index contents
// tape('test index contents for new york', (assert) => {
//     assert.equal(Array.from(conf.city._dictcache)[0], 'new york', 'test index contents for new york');
//     assert.end();
// });
//
// tape('test index contents for wallst', (assert) => {
//     assert.equal(Array.from(conf.street._dictcache)[0], 'wallst', 'test index contents for wallst');
//     assert.end();
// });
//
// // query in carmen
// tape('query for "wall st new york"', (assert) => {
//     c.geocode('wall st new york', { limit_verify:1 }, (err, res) => {
//         assert.deepEqual(res.features[0].place_name, 'Wall St, New York', 'query for "wall st new york" returns "Wall St"');
//         assert.end();
//     });
// });
//
// tape('query for "wallst new york"', (assert) => {
//     c.geocode('wallst new york', { limit_verify:1 }, (err, res) => {
//         assert.equal(res.features.length > 0, true, 'query for "wallst new york" returns any feature');
//         assert.deepEqual(res.features[0].place_name, 'Wall St, New York', 'query for "wallst new york" returns "Wall St"');
//         assert.end();
//     });
// });
//
// //landmark search with geocoder_address = 0
// tape('query for "christ the redeemer, brazil"', (assert) => {
//     c.geocode('christ the redeemer brazil', { limit_verify:1 }, (err, res) => {
//         assert.deepEqual(res.features[0].place_name, 'Christ the Redeemer, Brazil', 'query for "christ the redeemer brazil" returns "Christ the Redeemer, Brazil"');
//         assert.end();
//     });
// });
// tape('test index contents for dict/christtheredeemer', (assert) => {
//     assert.equal(Array.from(conf.landmark._dictcache)[0], 'christtheredeemer', 'test index contents for christ the redeemer');
//     assert.end();
// });
//
// //language flag test to trigger during getMatchingText();
// tape('language fallback query: Wall St', (t) => {
//     c.geocode('Wall St', { language: 'ar'}, (err, res) => {
//         t.equal('Wall St', res.features[0].text, 'Fallback to English');
//         t.equal('en', res.features[0].language, 'Language returned is English');
//         t.ifError(err, 'no error');
//         t.end();
//     });
// });
// tape('language fallback query: Christ the Redeemer', (t) => {
//     c.geocode('Christ the Redeemer', { language: 'ar'}, (err, res) => {
//         t.equal('Christ the Redeemer', res.features[0].text, 'Fallback to English');
//         t.equal('en', res.features[0].language, 'Language returned is English');
//         t.ifError(err, 'no error');
//         t.end();
//     });
// });
