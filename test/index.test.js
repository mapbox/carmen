var fs = require('fs');
var path = require('path');
var Stream = require('stream');
var util = require('util');
var Carmen = require('..');
var index = require('../lib/index');
var MBTiles = require('mbtiles');
var mem = require('../lib/api-mem');

var UPDATE = process.env.UPDATE;
var test = require('tape');
var termops = require('../lib/util/termops');
var token = require('../lib/util/token');

test('index - streaming interface', function(assert) {
    var inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/small-docs.json'), { encoding: 'utf8' });

    var outputStream = new Stream.Writable();
    outputStream._write = function(chunk, encoding, done) {
        var doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) assert.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    var conf = {
        to: new mem([], null, function() {})
    };

    var carmen = new Carmen(conf);
    assert.test('index docs.json', function(q) {
        carmen.index(null, conf.to, {
            config: {
                zoom: 6
            },
            index: conf.to,
            input: inputStream,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    assert.test('ensure index was successful', function(q) {
        carmen.analyze(conf.to, function(err, stats) {
            q.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem-analyze-small.json', JSON.stringify(stats, null, 4));
            q.deepEqual(require('./fixtures/mem-analyze-small.json'), stats);
            q.end();
        });
    });
    assert.end();
});

test('index.generateStats', function(assert) {
    var docs = [{
        type: "Feature",
        properties: {
            "carmen:text": 'main street',
            "carmen:score": 2
        },
        geometry: {}
    },{
        type: "Feature",
        properties: {
            "carmen:text": 'Main Road',
            "carmen:score": 1
        },
        geometry: {}
    }];
    var geocoder_tokens = token.createReplacer({'street':'st','road':'rd'});
    assert.deepEqual(index.generateFrequency(docs, {}), {
        0: [ 4 ],           // 4 total
        1: [ 2 ],           // 2 maxscore
        1247264641460936: [ 1 ],  // 1 road
        1804046053253033:  [ 1 ],  // 1 street
        609659059851264: [ 2 ]   // 2 main
    });
    // @TODO should 'main' in this case collapse down to 2?
    assert.deepEqual(index.generateFrequency(docs, geocoder_tokens), {
        0: [ 8 ],           // 8 total
        1: [ 2 ],           // 2 maxscore
        1247264641460936: [ 1 ], 
        1804046053253033: [ 1 ],         
        3363289958149993: [ 1 ],  // 1 road
        441841902895320: [ 1 ],  // 1 street
        609659059851264: [ 4 ]   // 4 main
    });
    assert.end();
});

test('index.update -- error', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/docs.json'));
    var conf = { to: new mem(docs, null, function() {}) };
    var carmen = new Carmen(conf);
    var zoom = 6;
    t.test('update 1', function(q) {
        index.update(conf.to, [{
            id: 1,
            type: "Feature",
            properties: {
                'carmen:text': 'main st',
                'carmen:score': 10,
                'carmen:center': [0,0]
            },
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        }], zoom, function(err) {
            q.ifError(err);
            q.deepEqual(conf.to._geocoder.get('freq', 0), [2]);
            q.deepEqual(conf.to._geocoder.get('freq', 1), [10]);
            q.end();
        });
    });
    t.test('update 2', function(q) {
        index.update(conf.to, [{
            id: 1,
            type: "Feature",
            properties: {
                'carmen:text': 'main st',
                'carmen:score': 0,
                'carmen:center': [0,0],
            },
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        }], zoom, function(err) {
            q.ifError(err);
            q.deepEqual(conf.to._geocoder.get('freq', 0), [4]);
            q.deepEqual(conf.to._geocoder.get('freq', 1), [10]);
            q.end();
        });
    });
    t.end();
});

test('index.update freq', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/docs.json'));
    var conf = { to: new mem(null, function() {}) };
    var carmen = new Carmen(conf);
    var zoom = 6;
    t.test('error no id', function(q) {
        index.update(conf.to, [{ properties: { 'carmen:text': 'main st' } }], zoom, function(err) {
            q.equal('Error: doc has no id', err.toString());
            q.end();
        });
    });
    t.test('error no carmen:center', function(q) {
        index.update(conf.to, [{ id: 1, type: 'Feature', properties: { 'carmen:text': 'main st' } }], zoom, function(err) {
            q.equal('Error: "geometry" property required on id:1', err.toString());
            q.end();
        });
    });
    t.test('indexes single doc', function(q) {
        index.update(conf.to, [{ id: 1, type: 'Feature', properties: { 'carmen:text': 'main st', 'carmen:center':[0,0]}, geometry: { type: 'Point', coordinates: [0,0] } }], zoom, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    t.test('indexes doc with geometry and no carmen:center', function(q) {
        index.update(conf.to, [{ id:1, type: 'Feature', properties: { 'carmen:text': 'main st' }, geometry:{ type:'Point', coordinates: [-75.598211,38.367333]}}], zoom, function(err) {
            q.equal('Error: doc has no carmen:center on id:1', err.toString());
            q.end();
        });
    });
    t.test('indexes doc with geometry and carmen:center', function(q) {
        index.update(conf.to, [{ id:1, type: 'Feature', properties: { 'carmen:text': 'main st', 'carmen:center': [-75.598211,38.367333] }, geometry:{ type: 'Point', coordinates: [-75.598211,38.367333]}}], zoom, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    t.end();
});

test('index', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/docs.json'));
    var conf = {
        from: new mem(docs, {maxzoom:6}, function() {}),
        to: new mem(docs, null, function() {})
    };
    var carmen = new Carmen(conf);
    t.test('indexes a document', function(q) {
        carmen.index(conf.from, conf.to, {}, function(err) {
            q.ifError(err);
            // Updates the mem.json fixture on disk.
            var memJson = __dirname + '/fixtures/mem-' + conf.to._dictcache.properties.type + '.json';
            if (UPDATE) fs.writeFileSync(memJson, JSON.stringify(conf.to.serialize(), null, 4));
            q.equal(JSON.stringify(conf.to.serialize()).length, JSON.stringify(require(memJson)).length);
            q.end();
        });
    });
    t.test('analyzes index', function(q) {
        carmen.analyze(conf.to, function(err, stats) {
            q.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem-analyze.json', JSON.stringify(stats, null, 4));
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });
    t.test('loadall index', function(q) {
        conf.to._geocoder.unloadall('freq');
        q.ok(!conf.to._geocoder.has('freq', 0));
        carmen.loadall(conf.to, 'freq', 1, function(err) {
            q.ifError(err);
            q.ok(conf.to._geocoder.has('freq', 0));
            q.end();
        });
    });
    t.test('loadall (concurrency 10)', function(q) {
        conf.to._geocoder.unloadall('freq');
        q.ok(!conf.to._geocoder.has('freq', 0));
        carmen.loadall(conf.to, 'freq', 10, function(err) {
            q.ifError(err);
            q.ok(conf.to._geocoder.has('freq', 0));
            q.end();
        });
    });
    t.test('loadall (concurrency 0.5)', function(q) {
        conf.to._geocoder.unloadall('freq');
        q.ok(!conf.to._geocoder.has('freq', 0));
        carmen.loadall(conf.to, 'freq', 0.5, function(err) {
            q.ifError(err);
            q.ok(conf.to._geocoder.has('freq', 0));
            q.end();
        });
    });
    t.test('loadall stat ignores Dict', function(q) {
        q.ok(!conf.to._geocoder.hasDict('stat', 0));
        carmen.loadall(conf.to, 'stat', 1, function(err) {
            q.ifError(err);
            q.ok(!conf.to._geocoder.hasDict('stat', 0));
            q.end();
        });
    });
    t.test('unloadall index', function(q) {
        carmen.unloadall(conf.to, 'freq', function(err) {
            q.ifError(err);
            q.equal(conf.to._geocoder.has('freq', 0), false);
            q.end();
        });
    });
    t.end();
});

test('error -- zoom too high', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/docs.json'));
    var conf = {
        from: new mem(docs, {maxzoom: 15}, function() {}),
        to: new mem(docs, null, function() {})
    };
    var carmen = new Carmen(conf);
    carmen.index(conf.from, conf.to, {}, function(err) {
        t.equal('Error: zoom must be less than 15 --- zoom was 15', err.toString());
        t.end();
    });
});

test('error -- zoom too low', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/docs.json'));
    var conf = {
        from: new mem(docs, {maxzoom: -1}, function() {}),
        to: new mem(docs, {maxzoom:10}, function() {})
    };
    var carmen = new Carmen(conf);
    carmen.index(conf.from, conf.to, {}, function(err) {
        t.equal('Error: zoom must be greater than 0 --- zoom was -1', err.toString());
        t.end();
    });
});

test('index phrase collection', function(assert) {
    var conf = { test:new mem(null, {maxzoom:6}, function() {}) };
    var c = new Carmen(conf);
    var docs = [{
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text': 'a',
            'carmen:center': [0,0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }, {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text': 'a',
            'carmen:center': [0,0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }];
    index.update(conf.test, docs, 6, afterUpdate);
    function afterUpdate(err) {
        assert.ifError(err);
        var id1 = termops.encodePhrase('a', true);
        var id2 = termops.encodePhrase('a', false);
        assert.deepEqual(conf.test._geocoder.list('grid',Math.floor(id1/68719476736)), [ id1.toString(), id2.toString() ], '2 phrases');
        assert.deepEqual(conf.test._geocoder.get('grid',id1), [ 6755949230424065, 6755949230424066 ], 'grid has 2 zxy+feature ids');
        assert.deepEqual(conf.test._geocoder.get('grid',id2), [ 6755949230424065, 6755949230424066 ], 'grid has 2 zxy+feature ids');
        assert.end();
    }
});

test('error -- _geometry too high resolution', function(t) {
    var docs = JSON.parse(fs.readFileSync(__dirname+'/fixtures/hugedoc.json'));
    var conf = {
        from: new mem(docs, {maxzoom: 6}, function() {}),
        to: new mem(docs, null, function() {})
    };
    var carmen = new Carmen(conf);
    carmen.index(conf.from, conf.to, {}, function(err) {
        t.equal('Error: Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1', err.toString());
        t.end();
    });
});

test('error -- _zxy too large tile-cover', function(t) {
    var tiles = [];
    for (var i = 0; i < 10002; i++) { tiles.push('6/32/32'); }
    var docs = [{
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32']
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }, {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0,0],
            'carmen:zxy': tiles
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }];
    var conf = {
        from: new mem(docs, {maxzoom: 6}, function() {}),
        to: new mem(docs, null, function() {})
    };
    var carmen = new Carmen(conf);
    carmen.index(conf.from, conf.to, {}, function(err) {
        t.equal('Error: zxy exceeded 10000, doc id:1', err.toString());
        t.end();
    });
});

test('index.cleanDocs', function(assert) {
    var docs;
    var sourceWithAddress = {geocoder_address:true};
    var sourceWithoutAddress = {geocoder_address:false};

    assert.equal(typeof index.cleanDocs(sourceWithAddress, [{ geometry:{}} ])[0].geometry, 'object', 'with address: preserves geometry');
    assert.equal(typeof index.cleanDocs(sourceWithoutAddress, [{geometry:{}}])[0].geometry, 'undefined', 'without address: removes geometry');
    assert.equal(typeof index.cleanDocs(sourceWithAddress, [{geometry:{},properties: { 'carmen:addressnumber':{}} }])[0]._geometry, 'undefined', 'with carmen:addressnumber: preserves geometry');
    assert.end();
});

test('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

