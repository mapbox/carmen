'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem(null, () => {}),
    region: new mem(null, () => {}),
    place: new mem(null, () => {}),
    address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_address_order: 'descending', geocoder_format: '{{country.name}}, {{region.name}}{{place.name}}{{address.name}}{{address.number}}' }, () => {})
};
const c = new Carmen(conf);

tape('index country', (t) => {
    const country = {
        id:1,
        properties: {
            'carmen:text':'Japan',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', (t) => {
    const region = {
        id:2,
        properties: {
            'carmen:text':'和歌山県',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index place 1', (t) => {
    const place = {
        id:3,
        properties: {
            'carmen:text':'岩出市',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index address 1', (t) => {
    const address = {
        id:4,
        properties: {
            'carmen:text':'中黒',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['632']
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

tape('Check order, 岩出市中黒632', (t) => {
    c.geocode('岩出市中黒632', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1, "Descending order doesn't lower relevance");
        t.end();
    });
});

tape('Check order, 632 中黒 岩出市', (t) => {
    c.geocode('632 中黒 岩出市', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].address, '632', 'Gets correct address');
        t.equal(res.features[0].relevance, 0.99, 'Unexpected ascending lowers relevance');
        t.end();
    });
});

tape('Check order, 632 中黒 Japan 岩出市', (t) => {
    c.geocode('632 中黒 Japan 岩出市', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].address, '632', 'Gets correct address');
        t.equal(res.features[0].relevance, 0.918571, 'Mixed-up order lowers relevance');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
