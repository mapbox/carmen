// Confirm that translations are not included in the autocomplete index

const tape = require('tape');
const Carmen = require('..');
const cxxcache = require('../lib/util/cxxcache');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const runTests = mode => {
    const conf = {
        region: new mem(
            { maxzoom: 6, geocoder_languages: ['en', 'hu'] },
            () => {}
        )
    };
    const c = new Carmen(conf);
    tape('index first region', t => {
        queueFeature(
            conf.region,
            {
                id: 1,
                properties: {
                    'carmen:text': 'South Carolina',
                    'carmen:text_en': 'South Carolina',
                    'carmen:text_hu': 'Dél-Karolina',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index second region', t => {
        queueFeature(
            conf.region,
            {
                id: 2,
                properties: {
                    'carmen:text': 'Delaware',
                    'carmen:text_en': 'Delaware',
                    'carmen:text_hu': 'Delaware',
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

    if (mode == 'lazy') {
        // on the second run through the tests, force carmen-cache to use lazy
        // instead of in-memory caching
        tape('reload cache', t => {
            let cache = c.byidx[0]._geocoder;

            ['freq', 'grid'].forEach(type => {
                const rocksdb =
                    c.byidx[0].getBaseFilename() + '.' + type + '.rocksdb';

                cache[type].pack(rocksdb);
                cache[type] = new cxxcache.RocksDBCache(
                    cache[type].id,
                    rocksdb
                );
            });

            t.end();
        });
    }

    tape('de', t => {
        c.geocode('de', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 2, '2 results');
            t.deepEqual(
                res.features[0].place_name,
                'Delaware',
                'found: Delaware'
            );
            t.deepEqual(res.features[0].id, 'region.2');

            t.deepEqual(
                res.features[1].place_name,
                'South Carolina',
                'found: South Carolina (in second place)'
            );
            t.deepEqual(res.features[1].id, 'region.1');
            t.ok(
                res.features[0].relevance - res.features[1].relevance >= 0.05,
                'South Carolina has a relevance penalty vs. Delaware'
            );

            t.end();
        });
    });
    tape('de (language: en)', t => {
        c.geocode('de', { language: 'en' }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 2, '2 results');
            t.deepEqual(
                res.features[0].place_name,
                'Delaware',
                'found: Delaware'
            );
            t.deepEqual(res.features[0].id, 'region.2');

            t.deepEqual(
                res.features[1].place_name,
                'South Carolina',
                'found: South Carolina (in second place)'
            );
            t.deepEqual(res.features[1].id, 'region.1');
            t.ok(
                res.features[0].relevance - res.features[1].relevance >= 0.05,
                'South Carolina has a relevance penalty vs. Delaware'
            );

            t.end();
        });
    });
    tape('de (language: hu)', t => {
        c.geocode('de', { language: 'hu' }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 2, '2 results');
            t.deepEqual(
                res.features[0].place_name,
                'Dél-Karolina',
                "found: Dél-Karolina (South Carolina's Hungarian name)"
            );
            t.deepEqual(res.features[0].id, 'region.1');

            t.deepEqual(
                res.features[1].place_name,
                'Delaware',
                'found: Delaware (in second place)'
            );
            t.deepEqual(res.features[1].id, 'region.2');

            t.ok(
                res.features[0].relevance - res.features[1].relevance < 0.1,
                'Delaware has no relevance penalty vs. South Carolina/Dél-Karolina because Delaware is also called "Delaware" in Hungarian'
            );

            t.end();
        });
    });
    tape('de (language: hu-HU)', t => {
        c.geocode('de', { language: 'hu-HU' }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 2, '2 results');
            t.deepEqual(
                res.features[0].place_name,
                'Dél-Karolina',
                "found: Dél-Karolina (South Carolina's Hungarian name)"
            );
            t.deepEqual(res.features[0].id, 'region.1');

            t.deepEqual(
                res.features[1].place_name,
                'Delaware',
                'found: Delaware (in second place)'
            );
            t.deepEqual(res.features[1].id, 'region.2');

            t.ok(
                res.features[0].relevance - res.features[1].relevance < 0.1,
                'Delaware has no relevance penalty vs. South Carolina/Dél-Karolina because Delaware is also called "Delaware" in Hungarian'
            );

            t.end();
        });
    });
    tape('delaware', t => {
        c.geocode('delaware', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(
                res.features[0].place_name,
                'Delaware',
                'found: Delaware'
            );
            t.deepEqual(res.features[0].id, 'region.2');
            t.end();
        });
    });
    tape('sou', t => {
        c.geocode('sou', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(
                res.features[0].place_name,
                'South Carolina',
                'found: South Carolina'
            );
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });
    tape('south carolina', t => {
        c.geocode('south carolina', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(
                res.features[0].place_name,
                'South Carolina',
                'found: South Carolina'
            );
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });
    tape('del karolina', t => {
        c.geocode('del karolina', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(
                res.features[0].place_name,
                'South Carolina',
                'found: South Carolina'
            );
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });

    if (mode == 'memory_cache') runTests('lazy');
};

runTests('memory_cache');

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
