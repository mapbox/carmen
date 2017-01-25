var Carmen = require('..');
var mem = require('../lib/api-mem');
var index = require('../lib/index');
var docs = require('./fixtures/mem-docs.json');
var test = require('tape');

test('copy', function(t) {
    var conf = {
        from: new mem(null, function() {}),
        to: new mem(null, function() {})
    };
    var carmen = new Carmen(conf);
    var zoom = 6;

    t.test('update', function(q) {
        index.update(conf.from, docs, { zoom: zoom }, function(err) {
            if (err) q.fail();
            index.store(conf.from, function() {
                q.end();
            });
        });
    });

    t.test('blank', function(q) {
        carmen.analyze(conf.to, function(err, stats) {
            q.ifError(err);
            q.deepEqual(stats, {
                byRelev: { '0.4': 0, '0.6': 0, '0.8': 0, '1.0': 0 },
                byScore: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                degen: 0,
                ender: 0,
                total: 0
            });
            q.end();
        });
    });

    t.test('copies', function(q) {
        carmen.copy(conf.from, conf.to, function(err) {
            q.ifError(err);
            var memFixture = require('./fixtures/mem-' + conf.to._dictcache.properties.type + '.json');
            q.deepEqual(JSON.stringify(conf.to.serialize()).length, JSON.stringify(memFixture).length);
            q.end();
        });
    });

    t.test('analyzes copy', function(q) {
        carmen.analyze(conf.to, function(err, stats) {
            q.ifError(err);
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });

    t.end();
});

