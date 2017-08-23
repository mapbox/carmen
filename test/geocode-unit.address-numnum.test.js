// Test for a termops.maskAddress bug where a housenumber (115) could be
// interpolated for on the same street name (115) without having a matching
// query token.
const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem({maxzoom: 6}, () => {}),
        postcode: new mem({maxzoom: 6}, () => {}),
        address: new mem({maxzoom: 6, geocoder_address: 1}, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (assert) => {
        queueFeature(conf.address, {
            id:1,
            properties: {
                'carmen:text':'115',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '200',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,0.5]]
            }
        }, () => {
            buildQueued(conf.address, assert.end);
        });
    });
    tape('index postcode', (assert) => {
        queueFeature(conf.postcode, {
            id:3,
            properties: {
                'carmen:text': '115 37',
                'carmen:center': [-0.5,-0.5]
            },
            geometry: {
                type: 'Point',
                coordinates: [-0.5,-0.5]
            }
        }, () => {
            buildQueued(conf.postcode, assert.end);
        });
    });
    tape('index country', (assert) => {
        queueFeature(conf.country, {
            id:2,
            properties: {
                'carmen:text': 'Sweden',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-1,-1],
                    [-1, 1],
                    [ 1, 1],
                    [ 1,-1],
                    [-1,-1]
                ]]
            }
        }, () => {
            buildQueued(conf.country, assert.end);
        });
    });
    tape('test "115 37 sweden" matches postcode, then address', (assert) => {
        c.geocode('115 37 Sweden', {}, (err, res) => {
            assert.ifError(err);
            assert.deepEqual(res.features[0].place_name, '115 37, Sweden');
            assert.deepEqual(res.features[0].place_type, ['postcode']);
            assert.deepEqual(res.features[1].place_name, '37 115, Sweden');
            assert.deepEqual(res.features[1].place_type, ['address']);
            assert.end();
        });
    });
    tape('test "115 115 sweden" matches address', (assert) => {
        c.geocode('115 115 Sweden', {}, (err, res) => {
            assert.ifError(err);
            assert.deepEqual(res.features[0].place_name, '115 115, Sweden');
            assert.deepEqual(res.features[0].place_type, ['address']);
            assert.end();
        });
    });
})();

tape('teardown', (assert) => {
    context.getTile.cache.reset();
    assert.end();
});

