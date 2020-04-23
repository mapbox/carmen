'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    region: new mem({ maxzoom: 6 }, () => {}),
    postcode: new mem({ geocoder_ignore_order: true, maxzoom: 12 }, () => {}),
    place: new mem({ maxzoom: 12 }, () => {}),
    address: new mem({
        maxzoom: 14,
        geocoder_address: 1,
    }, () => {})
};
const c = new Carmen(conf);

// the region contains everything; each place contains one postcode, and the
// address is just over the line into one of the place/postcode pairs

tape('index region', (t) => {
    const region = {
        id:1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 50,
            'carmen:text':'georgia,xeorxia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index postcode 1', (t) => {
    const postcode = {
        id:1,
        properties: {
            'carmen:text':'80138',
            'carmen:center': [-5,-5],
            'carmen:score': 50
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-6,-6],
                [-6,-4],
                [-4,-4],
                [-4,-6],
                [-6,-6],
            ]]
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

tape('index postcode 2', (t) => {
    const postcode = {
        id:2,
        properties: {
            'carmen:text':'80139',
            'carmen:center': [-3,-5],
            'carmen:score': 50
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-4,-6],
                [-4,-4],
                [-2,-4],
                [-2,-6],
                [-4,-6],
            ]]
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

tape('index place 1', (t) => {
    const place = {
        id:1,
        properties: {
            'carmen:text':'athens,xeorxia',
            'carmen:center': [-5,-5],
            'carmen:score': 50
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-6,-6],
                [-6,-4],
                [-4,-4],
                [-4,-6],
                [-6,-6],
            ]]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index place 2', (t) => {
    const place = {
        id:2,
        properties: {
            'carmen:text':'atlanta',
            'carmen:center': [-3,-5],
            'carmen:score': 50
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-4,-6],
                [-4,-4],
                [-2,-4],
                [-2,-6],
                [-4,-6],
            ]]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index address', (t) => {
    const address = {
        id:1,
        properties: {
            'carmen:text':'Main St',
            'carmen:center':[-3.99,-5.5],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[-3.99,-5.5]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('build queued features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('Check correctly aligned one', (t) => {
    c.geocode('100 main st atlanta georgia 80139', { limit_verify: 10 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 4);
        t.equals(res.features[0].relevance, 1);
        t.equals(res.features[0].place_name, '100 Main St, atlanta, 80139, georgia', 'got back full address first');
        t.end();
    });
});

tape('Check misaligned one', (t) => {
    c.geocode('100 main st athens georgia 80138', { limit_verify: 10 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 4);
        t.assert(res.features[0].relevance < 1, 'relevance < 1');
        t.assert(res.features[0].relevance > res.features[1].relevance, 'near-aligned relevance beats city relevance');
        t.equals(res.features[0].place_name, '100 Main St, atlanta, 80139, georgia', 'got back full address first');
        t.end();
    });
});

// @FIXME limit
// tape('Check version with synonym', (t) => {
//     c.geocode('100 main st xeorxia 80139', { limit_verify: 10 }, (err, res) => {
//         // "xeorxia" is both a synonym for our region feature (which correctly aligns)
//         // and our place feature "athens" (which does not). We should still get the
//         // full relevance here, because the word "xeorxia" should be claimed by the
//         // correctly-aligned feature rather than the near-miss
//         t.ifError(err);
//         t.equals(res.features.length, 1);
//         t.equals(res.features[0].relevance, 1);
//         t.equals(res.features[0].place_name, '100 Main St, atlanta, 80139, georgia', 'got back full address first');
//         t.end();
//     });
// });

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
