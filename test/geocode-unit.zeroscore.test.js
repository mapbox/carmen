// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    // make maxscore a string to simulate how carmen will encounter it after pulling it from the meta table in an mbtiles file
    place: new mem(
        {
            geocoder_name: 'place',
            maxzoom: 6,
            minscore: '0',
            maxscore: '0',
            geocoder_stack: 'us'
        },
        () => {}
    )
};

const c = new Carmen(conf);

tape('index place', t => {
    queueFeature(
        conf.place,
        {
            id: 1,
            properties: {
                'carmen:score': 0,
                'carmen:text': 'Chicago',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        () => {
            buildQueued(conf.place, t.end);
        }
    );
});

// this should have been indexed properly despite having a zero score in an index with zero maxscore
tape('geocode against an all-zero-score index', t => {
    c.geocode('chicago', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
