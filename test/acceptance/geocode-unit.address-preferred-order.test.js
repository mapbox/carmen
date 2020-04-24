'use strict';
// Test that address indexes can express a preferred housenumber order

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const confFirst = {
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_name: 'address',
        geocoder_expected_number_order: 'first'
    }, () => {})
};

const confLast = {
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_name: 'address',
        geocoder_expected_number_order: 'first'
    }, () => {})
};

const addressFeature = {
    'type': 'Feature',
    'id': 12345,
    'geometry': {
        'type': 'MultiPoint',
        'coordinates': [
            [-76.9, 38.8],
            [-76.91, 38.81]
        ]
    },
    'properties': {
        'carmen:score': 1,
        'carmen:geocoder_stack': 'us',
        'carmen:addressnumber': ['522', '541'],
        'carmen:center': [-76.905, 38.805],
        'carmen:text': '15th Street Northeast'
    }
};

const cFirst = new Carmen(confFirst);
tape('index address in first index', (t) => {
    queueFeature(confFirst.address, addressFeature, t.end);
});

const cLast = new Carmen(confLast);
tape('index address in first index', (t) => {
    queueFeature(confLast.address, addressFeature, t.end);
});

tape('build queued features', (t) => {
    const q = queue();
    for (const conf of [confFirst, confLast]) {
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
    }
    q.awaitAll(t.end);
});

tape('full address first-preferred (541 + #522)', (t) => {
    cFirst.geocode('541 15th Street Northeast #522', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected first-position housenumber');
        t.equal(res.features[0].relevance, 0.633333, 'penalty from coverage');
        t.end();
    });
});

tape('full address first-preferred (522 + #541)', (t) => {
    cFirst.geocode('522 15th Street Northeast #541', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '522', 'selected first-position housenumber');
        t.equal(res.features[0].relevance, 0.633333, 'penalty from coverage');
        t.end();
    });
});

tape('full address first-preferred (541 alone first)', (t) => {
    cFirst.geocode('541 15th Street Northeast', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected only housenumber');
        t.equal(res.features[0].relevance, 1, 'no penalty');
        t.end();
    });
});

tape('full address first-preferred (541 alone last)', (t) => {
    cFirst.geocode('15th Street Northeast 541', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected only housenumber');
        t.assert(res.features[0].relevance > 0.5 && res.features[0].relevance < 1, 'penalty from bad position only');
        t.end();
    });
});

tape('full address last-preferred (541 + #522)', (t) => {
    cLast.geocode('541 15th Street Northeast #522', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected last-position housenumber');
        t.equal(res.features[0].relevance, 0.633333, 'penalty from coverage');
        t.end();
    });
});

tape('full address last-preferred (522 + #541)', (t) => {
    cLast.geocode('522 15th Street Northeast #541', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '522', 'selected last-position housenumber');
        t.equal(res.features[0].relevance, 0.633333, 'penalty from coverage');
        t.end();
    });
});

tape('full address last-preferred (541 alone first)', (t) => {
    cLast.geocode('541 15th Street Northeast', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected only housenumber');
        t.equal(res.features[0].relevance, 1, 'no penalty');
        t.end();
    });
});

tape('full address last-preferred (541 alone last)', (t) => {
    cLast.geocode('15th Street Northeast 541', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '541', 'selected only housenumber');
        t.assert(res.features[0].relevance > 0.5 && res.features[0].relevance < 1, 'penalty from bad position only');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
