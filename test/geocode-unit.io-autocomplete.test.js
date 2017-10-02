// Unit tests for IO-deduping when loading grid shards during spatialmatch.
// Setups up multiple indexes representing logical equivalents.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
const conf = {
    place: new mem(
        { maxzoom: 6, geocoder_name: 'place', timeout: 10 },
        () => {}
    )
};
const c = new Carmen(conf);

tape('ready', t => {
    c._open(t.end);
});

tape('index place', t => {
    let docs = [];
    for (let i = 1; i < 100; i++) {
        let text = Math.random()
            .toString()
            .split('.')
            .pop()
            .toString(36);
        docs.push({
            id: i,
            properties: {
                'carmen:text': 'aa' + text,
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        });
    }
    queueFeature(conf.place, docs, () => {
        buildQueued(conf.place, t.end);
    });
});

function reset() {
    context.getTile.cache.reset();
    conf.place._original.logs.getGeocoderData = [];
    conf.place._original.logs.getTile = [];
}

tape('io', t => {
    reset();
    c.geocode('aa', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 5, 'returns 5 features');
        let loaded = c.indexes.place._original.logs.getGeocoderData.filter(
            id => {
                return /grid/.test(id);
            }
        ).length;
        t.deepEqual(loaded <= 10, true, '<= 10 shards loaded: ' + loaded);
        t.end();
    });
});

tape('index.teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
