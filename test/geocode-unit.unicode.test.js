//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    test: new mem({ maxzoom: 6 }, () => {})
};
const c = new Carmen(conf);
tape('index 京都市', t => {
    queueFeature(
        conf.test,
        {
            id: 1,
            properties: {
                'carmen:text': '京都市',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index москва', t => {
    queueFeature(
        conf.test,
        {
            id: 2,
            properties: {
                'carmen:text': 'москва',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index josé', t => {
    queueFeature(
        conf.test,
        {
            id: 3,
            properties: {
                'carmen:text': 'josé',
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

tape('京 => 京都市', t => {
    c.geocode('京', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('京都市 => 京都市', t => {
    c.geocode('京都市', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('jing !=> 京都市', t => {
    c.geocode('jing', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features.length, 0, 'CJK transliteration disabled 1');
        t.end();
    });
});
tape('jing du shi !=> 京都市', t => {
    c.geocode('jing du shi', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features.length, 0, 'CJK transliteration disabled 2');
        t.end();
    });
});
// partial unidecoded terms do not match
tape('ji => no results', t => {
    c.geocode('ji', { limit_verify: 1 }, (err, res) => {
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('м => москва', t => {
    c.geocode('м', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('москва => москва', t => {
    c.geocode('москва', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('m => москва', t => {
    c.geocode('m', { limit_verify: 1 }, (err, res) => {
        t.equal(res.features.length, 0, 'm (no results)');
        t.end();
    });
});
tape('moskva => москва', t => {
    c.geocode('moskva', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features.length, 0, 'moskva (no results)');
        t.end();
    });
});

tape('j => josé', t => {
    c.geocode('j', { limit_verify: 1 }, (err, res) => {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('jose => josé', t => {
    c.geocode('jose', { limit_verify: 1 }, (err, res) => {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('josé => josé', t => {
    c.geocode('josé', { limit_verify: 1 }, (err, res) => {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
