const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const country = new mem(null, () => {});
const conf = { country: country };
const a = new Carmen(conf);

tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:text': 'america',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
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
tape('geocodes', t => {
    a.geocode('america', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'america');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});
tape('sets cache/dictcache', t => {
    t.ok(country._geocoder, 'sets source._geocoder on original instance');
    t.ok(country._dictcache, 'sets source._dictcache on original instance');
    t.equal(
        country._geocoder,
        a.indexes.country._geocoder,
        'clone cache === source cache'
    );
    t.equal(
        country._dictcache,
        a.indexes.country._dictcache,
        'clone dictcache === source dictcache'
    );
    const b = new Carmen({ country: country });
    t.equal(
        b.indexes.country._geocoder,
        a.indexes.country._geocoder,
        'a cache === b cache'
    );
    t.equal(
        b.indexes.country._dictcache,
        a.indexes.country._dictcache,
        'a dictcache === b dictcache'
    );
    t.end();
});
tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
