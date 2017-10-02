const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    street: new mem(null, () => {})
};

const c = new Carmen(conf);

tape('index feature', t => {
    let range = [];
    for (let i = 1; i < 100; i++) range.push(i);
    range.forEach(i => {
        t.test('addFeature', tt => {
            queueFeature(
                conf.street,
                {
                    id: i,
                    properties: {
                        'carmen:text': 'Main Street',
                        'carmen:zxy': ['6/14/18'],
                        'carmen:center': [-100, 60],
                        'carmen:score': 2
                    }
                },
                () => {
                    tt.end();
                }
            );
        });
    });
    t.end();
});

tape('index feature', t => {
    let feature = {
        id: 102,
        properties: {
            'carmen:text': 'Main Street',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:score': 1
        }
    };
    queueFeature(conf.street, feature, t.end);
});

tape('index feature', t => {
    let feature = {
        id: 103,
        properties: {
            'carmen:text': 'Date Line Street',
            'carmen:zxy': ['2/0/1'],
            'carmen:center': [-180, 40],
            'carmen:score': 1
        }
    };
    queueFeature(conf.street, feature, t.end);
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

// run query with invalid bbox, expect error
tape('fake bbox', t => {
    c.geocode(
        'Main St',
        { bbox: [-1.0, -1.0, 1.0], allow_dupes: true },
        (err, res) => {
            t.equal(err && err.code, 'EINVALID', 'bbox array length = 3');
        }
    );
    c.geocode(
        'Main St',
        { bbox: [-1.0, -1.0, 1.0, 'a'], allow_dupes: true },
        (err, res) => {
            t.equal(err && err.code, 'EINVALID', 'non-numeric bbox param');
        }
    );
    c.geocode(
        'Main St',
        { bbox: [-180, -90, 180, 91], allow_dupes: true },
        (err, res) => {
            t.equal(err && err.code, 'EINVALID', 'maxY out-of-bounds');
        }
    );
    t.end();
});

// run query without bbox filter, expect both features back
tape('no bbox', t => {
    c.geocode('Main St', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 5);
        t.end();
    });
});

// run query with bbox fitler, expect only one feature back
tape('with bbox', t => {
    c.geocode(
        'Main St',
        { bbox: [-1.0, -1.0, 1.0, 1.0], allow_dupes: true },
        (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
