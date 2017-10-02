const Carmen = require('..');
const mem = require('../lib/api-mem');
const index = require('../lib/index');
const docs = require('./fixtures/mem-docs.json');
const test = require('tape');

test('copy', t => {
    const conf = {
        from: new mem({ maxzoom: 6, geocoder_languages: ['zh'] }, () => {}),
        to: new mem({ maxzoom: 6, geocoder_languages: ['zh'] }, () => {})
    };
    const carmen = new Carmen(conf);

    t.test('update', q => {
        index.update(conf.from, docs, { zoom: 6 }, err => {
            if (err) q.fail();
            index.store(conf.from, () => {
                q.end();
            });
        });
    });

    t.test('blank', q => {
        carmen.analyze(conf.to, (err, stats) => {
            q.ifError(err);
            q.deepEqual(stats, {
                byRelev: { '0.4': 0, '0.6': 0, '0.8': 0, '1.0': 0 },
                byScore: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                total: 0
            });
            q.end();
        });
    });

    t.test('copies', q => {
        carmen.copy(conf.from, conf.to, err => {
            q.ifError(err);
            const memFixture = require('./fixtures/mem-' +
                conf.to._dictcache.properties.type +
                '.json');
            q.deepEqual(
                JSON.stringify(conf.to.serialize()).length,
                JSON.stringify(memFixture).length
            );
            q.end();
        });
    });

    t.test('analyzes copy', q => {
        carmen.analyze(conf.to, (err, stats) => {
            q.ifError(err);
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });

    t.end();
});
