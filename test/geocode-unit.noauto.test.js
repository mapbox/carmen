// Test score handling across indexes

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Confirm that disabling autocomplete works, and that in situations where an autocomplete
// result scores highest, the winner changes depending on whether or not autocomplete is enabled
(() => {
    const conf = { place: new mem(null, () => {}) };
    const c = new Carmen(conf);
    tape('index first place', t => {
        let place = {
            id: 1,
            properties: {
                'carmen:score': 100,
                'carmen:text': 'abcde',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index second place', t => {
        let place = {
            id: 2,
            properties: {
                'carmen:score': 10,
                'carmen:text': 'abc',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, () => {
            buildQueued(conf.place, t.end);
        });
    });
    tape('abc - with autocomplete', t => {
        c.geocode('abc', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'abcde',
                'abcde wins for abc with autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('abc - no autocomplete', t => {
        c.geocode('abc', { limit_verify: 1, autocomplete: 0 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'abc',
                'abc wins for abc without autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.2');
            t.end();
        });
    });
    tape('abcde - with autocomplete', t => {
        c.geocode('abcde', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'abcde',
                'abcde wins for abcde with autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('abcde - no autocomplete', t => {
        c.geocode('abcde', { limit_verify: 1, autocomplete: 0 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'abcde',
                'abcde wins for abcde without autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('ab - with autocomplete', t => {
        c.geocode('ab', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'abcde',
                'abcde wins for ab with autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('ab - no autocomplete', t => {
        c.geocode('ab', { limit_verify: 1, autocomplete: 0 }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                0,
                'ab matches nothing without autocomplete'
            );
            t.end();
        });
    });
})();

// test autocomplete where tokenization is implicated
(() => {
    const conf = { place: new mem(null, () => {}) };
    const c = new Carmen(conf);
    tape('index place', t => {
        let place = {
            id: 1,
            properties: {
                'carmen:score': 100,
                'carmen:text': 'place one',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, () => {
            buildQueued(conf.place, t.end);
        });
    });
    tape('place - with autocomplete', t => {
        c.geocode('place', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'place one',
                'place matches with autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('place - no autocomplete', t => {
        c.geocode('place', { limit_verify: 1, autocomplete: 0 }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                0,
                'place matches nothing without autocomplete'
            );
            t.end();
        });
    });
    tape('one - with autocomplete', t => {
        c.geocode('one', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                0,
                'one matches nothing with autocomplete'
            );
            t.end();
        });
    });
    tape('one - no autocomplete', t => {
        c.geocode('one', { limit_verify: 1, autocomplete: 0 }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                0,
                'one matches nothing without autocomplete'
            );
            t.end();
        });
    });
    tape('place o - with autocomplete', t => {
        c.geocode('place o', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(
                res.features[0].place_name,
                'place one',
                'abcde wins for abc with autocomplete'
            );
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('place o - no autocomplete', t => {
        c.geocode(
            'place o',
            { limit_verify: 1, autocomplete: 0 },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    0,
                    'place o matches nothing without autocomplete'
                );
                t.end();
            }
        );
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
