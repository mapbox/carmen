const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem({ maxzoom: 6 }, () => {})
};

const c = new Carmen(conf);
tape('index emoji country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            },
            properties: {
                // Line smiley
                'carmen:text': decodeURIComponent('%E2%98%BA'),
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index non-emoji country', t => {
    queueFeature(
        conf.country,
        {
            id: 2,
            geometry: {
                type: 'Point',
                coordinates: [10, 10]
            },
            properties: {
                // Line smiley
                'carmen:text': 'Anarres',
                'carmen:center': [10, 10]
            }
        },
        t.end
    );
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

tape('should not find emoji feaure', t => {
    // Line smiley
    c.geocode(decodeURIComponent('%E2%98%BA'), {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 0, 'finds no features');
        t.end();
    });
});

tape('should not find feaure (atm or ever -- different emoji)', t => {
    // Filled smiley
    c.geocode(decodeURIComponent('%E2%98%BB'), {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 0, 'finds no features');
        t.end();
    });
});

tape('should handle a query including emoji', t => {
    // Black star
    const query = 'Anarres ' + decodeURIComponent('%E2%98%85');
    c.geocode(query, {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].id, 'country.2', 'finds Anarres');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
