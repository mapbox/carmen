var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var index = require('../lib/index');
var memFixture = require('./fixtures/mem.json');
var MBTiles = require('mbtiles'),
    mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;
var test = require('tape');

test('index.update', function(t) {
    var to = new mem(null, function() {});
    var carmen = new Carmen({ to: to });
    t.test('error no _id', function(q) {
        index.update(to, [{_text:'main st'}], function(err) {
            q.equal('Error: doc has no _id', err.toString());
            q.end();
        });
    });
    t.test('error no _center', function(q) {
        index.update(to, [{_text:'main st',_id:1,_zxy:['0/0/0']}], function(err) {
            q.equal('Error: doc has no _center on _id:1', err.toString());
            q.end();
        });
    });
    t.test('indexes single doc', function(q) {
        index.update(to, [{_text:'main st',_id:1,_zxy:['0/0/0'],_center:[0,0]}], function(err) {
            q.ifError(err);
            q.end();
        });
    });
    t.end();
});

test('index', function(t) {
    var from = new mem(null, function() {});
    var to = new mem(null, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });
    t.test('indexes a document', function(q) {
        carmen.index(from, to, {}, function(err) {
            q.ifError(err);
            // Updates the mem.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem.json', JSON.stringify(to.serialize(), null, 4));
            q.deepEqual(to.serialize(), memFixture);
            q.end();
        });
    });
    t.test('verifies index', function(q) {
        carmen.verify(to, function(err, stats) {
            q.ifError(err);
            q.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 261, 265 ] }, stats[0]);
            q.deepEqual({ relation: [ 'term', 'grid' ], count: [ 261, 265 ] }, stats[1]);
            q.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 265, 410 ] }, stats[2]);
            q.end();
        });
    });
    t.test('analyzes index', function(q) {
        carmen.analyze(to, function(err, stats) {
            q.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem-analyze.json', JSON.stringify(stats, null, 4));
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });
    t.test('loadall index', function(q) {
        to._geocoder.unloadall('degen');
        to._geocoder.unloadall('term');
        to._geocoder.unloadall('phrase');
        to._geocoder.unloadall('grid');
        q.ok(!to._geocoder.has('degen', 0));
        q.ok(!to._geocoder.has('term', 0));
        q.ok(!to._geocoder.has('phrase', 0));
        q.ok(!to._geocoder.has('grid', 0));
        carmen.loadall(to, 1, function(err) {
            q.ifError(err);
            q.ok(to._geocoder.has('degen', 0));
            q.ok(to._geocoder.has('term', 0));
            q.ok(to._geocoder.has('phrase', 0));
            q.ok(to._geocoder.has('grid', 0));
            q.end();
        });
    });
    t.test('wipes index', function(q) {
        carmen.wipe(to, function(err) {
            q.ifError(err);
            carmen.verify(to, function(err, stats) {
                q.deepEqual({
                    freq: { '0': '' },
                    term: { '0': '' },
                    phrase: { '0': '' },
                    grid: { '0': '' },
                    degen: { '0': '' },
                    feature: { '0': '{}', '1':'{}', '2':'{}', '3':'{}' }
                }, to.serialize().shards);
                q.end();
            });
        });
    });
    t.end();
});
