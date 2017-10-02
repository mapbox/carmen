// Unit tests for backy stacking of features ("lessingstrasse 50825 koln vs lessingstrasse koln 50825")

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    postcode: new mem(null, () => {}),
    city: new mem(null, () => {}),
    street: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);
tape('index postcode', t => {
    let doc = {
        id: 1,
        properties: {
            'carmen:text': '50825',
            'carmen:zxy': ['6/32/32', '6/33/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.postcode, doc, t.end);
});
tape('index city', t => {
    let city = {
        id: 1,
        properties: {
            'carmen:text': 'koln',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index street 1', t => {
    let street = {
        id: 1,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('index street 2', t => {
    let street = {
        id: 2,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/33/32'],
            'carmen:center': [360 / 64 + 0.001, 0]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('build queued features', t => {
    const q = queue();
    Object.keys(conf).forEach(c => {
        q.defer(cb => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});
tape('lessingstrasse koln 50825', t => {
    c.geocode('lessingstrasse koln 50825', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 1);
        t.end();
    });
});
tape('lessingstrasse 50825 koln', t => {
    c.geocode('lessingstrasse 50825 koln', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 0.8333333333333333);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
