// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    province: new mem(null, () => {}),
    postcode: new mem(null, () => {}),
    city: new mem(null, () => {}),
    street: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);
tape('index province', t => {
    let province = {
        id: 1,
        properties: {
            'carmen:text': 'connecticut, court',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.province, province, t.end);
});
tape('index city', t => {
    let city = {
        id: 1,
        properties: {
            'carmen:text': 'windsor',
            'carmen:zxy': ['6/32/32', '6/34/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index street', t => {
    let street = {
        id: 1,
        properties: {
            'carmen:text': 'windsor court',
            'carmen:zxy': ['6/34/32'],
            'carmen:center': [360 / 32, 0]
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
// city beats street at context sort
tape('windsor court (limit 2)', t => {
    c.geocode('windsor court', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
// street beats city
tape('windsor court windsor', t => {
    c.geocode('windsor court windsor', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'windsor court, windsor');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
