'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    country: new mem(null, () => {}),
    region: new mem(null, () => {}),
    postcode: new mem(null, () => {}),
    place: new mem(null, () => {}),
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_tokens: { 'Drive': 'Dr' },
        geocoder_format: '{{country.name}}, {{region.name}}{{place.name}}{{address.name}}{{address.number}}'
    }, () => {})
};
const c = new Carmen(conf);

tape('index country', (t) => {
    const country = {
        id:1,
        properties: {
            'carmen:text':'United States',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', (t) => {
    const region = {
        id:1,
        properties: {
            'carmen:text':'Colorado',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index postcode', (t) => {
    const postcode = {
        id:1,
        properties: {
            'carmen:text':'80138',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

tape('index place', (t) => {
    const place = {
        id:1,
        properties: {
            'carmen:text':'Parker',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index address', (t) => {
    const address = {
        id:1,
        properties: {
            'carmen:text':'S Pikes Peak Dr',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['11027']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
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

tape('Check relevance scoring', (t) => {
    c.geocode('11027 S. Pikes Peak Drive #201', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].relevance, 0.611111, 'Apt. number lowers relevance');
    });
    c.geocode('11027 S. Pikes Peak Drive', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].relevance, 1.00, 'High relevance with no apartment number');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
