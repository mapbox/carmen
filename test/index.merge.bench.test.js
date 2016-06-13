var Carmen = require('..');
var index = require('../lib/index');
var phrasematch = require('../lib/phrasematch');
var mem = require('../lib/api-mem');
var tape = require('tape');

// Creates an index with fuzzed data
function fuzzIndex(limit, callback) {
    var conf = { street: new mem({ maxzoom:14 }, function() {}) };
    var c = new Carmen(conf);
    var docs = require('fs').readFileSync(__dirname + '/../bench/fixtures/lake-streetnames.txt', 'utf8')
        .split('\n')
        .filter(function(text) { return !!text; })
        .sort(function(a, b) {
            return Math.random() - Math.random();
        });
    var features = [];
    for (var i = 0; i < limit; i++) {
        var text = docs[i % docs.length];
        var lat = Math.random() * 85 * (Math.random() < 0.5 ? -1 : 1);
        var lon = Math.random() * 180 * (Math.random() < 0.5 ? -1 : 1);
        features.push({
            id: Math.floor(Math.random() * Math.pow(2,25)),
            type: 'Feature',
            properties: {
                'carmen:text': text,
                'carmen:center': [lon, lat]
            },
            geometry: { type:'Point', coordinates:[lon,lat] },
            bbox: []
        });
    }
    index.update(conf.street, features, { zoom:14 }, function(err) {
        if (err) return callback(err);
        index.store(conf.street, function(err) {
            if (err) return callback(err);
            callback(null, c, conf.street);
        });
    });
}

var sources = {};

tape('setup a', function(assert) {
    var start = +new Date;
    fuzzIndex(50000, function(err, geocoder, a) {
        var time = +new Date - start;
        assert.ifError(err, 'completed indexing a in ' + time + 'ms');
        sources.a = a;
        assert.end();
    });
});

tape('setup b', function(assert) {
    var start = +new Date;
    fuzzIndex(50000, function(err, geocoder, b) {
        var time = +new Date - start;
        assert.ifError(err, 'completed indexing b in ' + time + 'ms');
        sources.b = b;
        assert.end();
    });
});

tape('merge a + b = c', function(assert) {
    var conf = { street: new mem({ maxzoom:14 }, function() {}) };
    var c = new Carmen(conf);
    c.merge(sources.a, sources.b, conf.street, {}, function(err, stats) {
        assert.ifError(err);
        assert.ok(stats.freq, 'merged freq in ' + stats.freq + 'ms');
        assert.ok(stats.grid, 'merged grid in ' + stats.grid + 'ms');
        assert.ok(stats.feature, 'merged feature in ' + stats.feature + 'ms');
        assert.ok(stats.stat, 'merged stat in ' + stats.stat + 'ms');
        assert.end();
    });
});

