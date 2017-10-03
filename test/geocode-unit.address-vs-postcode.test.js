// Pits an housenumber/street name/city query
// vs a similarly matching city/state/postcode result

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        region: new mem({maxzoom: 6 }, () => {}),
        place: new mem({maxzoom: 6 }, () => {}),
        postcode: new mem({maxzoom: 6 }, () => {}),
        address: new mem({maxzoom: 6,  geocoder_address:1}, () => {}),
    };
    const c = new Carmen(conf);

    tape('index region', (assert) => {
        queueFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text': 'Massachusetts, MA',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index region', (assert) => {
        queueFeature(conf.region, {
            id:2,
            properties: {
                'carmen:text': 'Illinois, IL',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('index place', (assert) => {
        // Quincy IL
        queueFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text': 'Quincy',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('index place', (assert) => {
        // Quincy MA
        queueFeature(conf.place, {
            id:2,
            properties: {
                'carmen:text': 'Quincy',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index postcode', (assert) => {
        // 02169 Quincy Mass
        queueFeature(conf.postcode, {
            id:1,
            properties: {
                'carmen:text': '02169',
                'carmen:center': [10,0]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[10,0]]
            }
        }, assert.end);
    });

    tape('index address', (assert) => {
        // 02169 Maine St Quincy IL
        queueFeature(conf.address, {
            id:1,
            properties: {
                'carmen:text': 'Maine St',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['02169']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, assert.end);
    });

    tape('build', (assert) => { buildQueued(conf.region, assert.end); });
    tape('build', (assert) => { buildQueued(conf.place, assert.end); });
    tape('build', (assert) => { buildQueued(conf.postcode, assert.end); });
    tape('build', (assert) => { buildQueued(conf.address, assert.end); });

    tape('Search', (assert) => {
        c.geocode('Quincy MA 02169', {}, (err, res) => {
            assert.ifError(err);
            assert.deepEqual(res.features[0].place_name, '02169, Quincy, Massachusetts', 'should match postcode/place/state first');
            assert.end();
        });
    });

    tape('Search', (assert) => {
        c.geocode('0216', {}, (err, res) => {
            assert.ifError(err);
            assert.deepEqual(res.features[0].place_name, '02169, Quincy, Massachusetts', 'should match autocomplete to a postcode');
            assert.end();
        });
    });

})();


tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
