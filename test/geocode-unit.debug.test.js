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
    city: new mem(null, () => {}),
    street: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);
tape('index province', t => {
    let province = {
        id: 1,
        properties: {
            'carmen:text': 'new york, ny',
            'carmen:zxy': ['6/32/32', '6/34/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.province, province, t.end);
});
tape('index city 1', t => {
    let city = {
        id: 2,
        properties: {
            'carmen:text': 'new york, ny',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index city 2', t => {
    let city = {
        id: 3,
        properties: {
            'carmen:text': 'tonawanda',
            'carmen:zxy': ['6/34/32'],
            'carmen:center': [14.0625, -2.8079929095776683]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index street 1', t => {
    let street = {
        id: 4,
        properties: {
            'carmen:text': 'west st',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('index street 2', t => {
    let street = {
        id: 5,
        properties: {
            'carmen:text': 'west st',
            'carmen:zxy': ['6/34/32'],
            'carmen:center': [14.0625, -2.8079929095776683]
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
tape('west st, tonawanda, ny', t => {
    c.geocode(
        'west st tonawanda ny',
        { limit_verify: 1, debug: 4 },
        (err, res) => {
            t.ifError(err);
            t.equal(res.debug.id, 4, 'debugs id');
            t.equal(res.debug.extid, 4, 'debugs extid');

            t.deepEqual(
                Object.keys(res.debug),
                [
                    'id',
                    'extid',
                    'phrasematch',
                    'spatialmatch',
                    'spatialmatch_position',
                    'verifymatch'
                ],
                'debug keys'
            );

            t.deepEqual(
                res.debug.phrasematch,
                {
                    province: { ny: 0.25 },
                    city: { ny: 0.25, tonawanda: 0.25 },
                    street: { 'west st': 0.5 }
                },
                'debugs matched phrases'
            );

            // Found debug feature in spatialmatch results @ position 1
            t.deepEqual(res.debug.spatialmatch.covers[0].text, 'west st');
            t.deepEqual(
                res.debug.spatialmatch.covers[0].relev,
                0.3333333333333333
            );
            t.deepEqual(res.debug.spatialmatch.covers[1].text, 'ny');
            t.deepEqual(
                res.debug.spatialmatch.covers[1].relev,
                0.3333333333333333
            );
            t.deepEqual(res.debug.spatialmatch_position, 1);

            // Debug feature not found in verifymatch
            t.deepEqual(res.debug.verifymatch, null);
            t.end();
        }
    );
});
tape('west st, tonawanda, ny', t => {
    c.geocode(
        'west st tonawanda ny',
        { limit_verify: 1, debug: 5 },
        (err, res) => {
            t.ifError(err);
            t.equal(res.debug.id, 5, 'debugs id');
            t.equal(res.debug.extid, 5, 'debugs extid');

            t.deepEqual(
                Object.keys(res.debug),
                [
                    'id',
                    'extid',
                    'phrasematch',
                    'spatialmatch',
                    'spatialmatch_position',
                    'verifymatch',
                    'verifymatch_position'
                ],
                'debug keys'
            );

            t.deepEqual(
                res.debug.phrasematch,
                {
                    province: { ny: 0.25 },
                    city: { ny: 0.25, tonawanda: 0.25 },
                    street: { 'west st': 0.5 }
                },
                'debugs matched phrases'
            );

            // Found debug feature in spatialmatch results @ position 1
            t.deepEqual(res.debug.spatialmatch.covers[0].id, 5);
            t.deepEqual(res.debug.spatialmatch.covers[0].text, 'west st');
            t.deepEqual(
                res.debug.spatialmatch.covers[0].relev,
                0.3333333333333333
            );
            t.deepEqual(res.debug.spatialmatch.covers[1].text, 'ny');
            t.deepEqual(
                res.debug.spatialmatch.covers[1].relev,
                0.3333333333333333
            );
            t.deepEqual(res.debug.spatialmatch.covers[2].text, 'tonawanda');
            t.deepEqual(
                res.debug.spatialmatch.covers[2].relev,
                0.3333333333333333
            );
            t.deepEqual(res.debug.spatialmatch_position, 0);

            // Debug feature not found in verifymatch
            t.deepEqual(res.debug.verifymatch[0].id, 5);
            t.deepEqual(
                res.debug.verifymatch[0].properties['carmen:text'],
                'west st'
            );
            t.deepEqual(res.debug.verifymatch_position, 0);
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
