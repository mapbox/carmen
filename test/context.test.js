var Carmen = require('..');
var context = require('../lib/context');
var test = require('tape');
var zlib = require('zlib');
var path = require('path');
var mapnik = require('mapnik');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
var queue = require('d3-queue').queue;
var mem = require('../lib/api-mem');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

test('contextVector deflate', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [ 0,0 ]
                },
                "properties": {
                    'carmen:center': [ -99.693234, 37.245325 ],
                    'carmen:text': 'United States of America, United States, America, USA, US',
                    'iso2': 'US',
                    'population': 307212123,
                    'title': 'United States of America'
                }
            }
        ]
    }), "data");
    var buffer = zlib.deflateSync(vtile.getData());
    var source = {
        getTile: function(z, x, y, callback) {
            return callback(null, buffer);
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
        assert.ifError(err);

        assert.deepEqual(data.properties['carmen:vtquerydist'] < 0.0001, true);
        delete data.properties['carmen:vtquerydist'];

        assert.deepEqual(data, {
            properties: {
                'carmen:types': ['test'],
                'carmen:stack': undefined,
                'carmen:conflict': undefined,
                'carmen:center': [ -99.6932, 37.2453 ],
                'carmen:extid': 'test.1',
                'carmen:index': 'testA',
                'carmen:geomtype': 1,
                'carmen:tmpid': 1,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        assert.end();
    });
});

test('contextVector gzip', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [ 0,0 ]
                },
                "properties": {
                    'carmen:center': [ -99.693234, 37.245325 ],
                    'carmen:text': 'United States of America, United States, America, USA, US',
                    'iso2': 'US',
                    'population': 307212123,
                    'title': 'United States of America'
                }
            }
        ]
    }), "data");
    var buffer = zlib.gzipSync(vtile.getData());
    var source = {
        getTile: function(z, x, y, callback) {
            return callback(null, buffer);
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
        assert.ifError(err);

        assert.deepEqual(data.properties['carmen:vtquerydist'] < 0.0001, true);
        delete data.properties['carmen:vtquerydist'];

        assert.deepEqual(data, {
            properties: {
                'carmen:types': ['test'],
                'carmen:stack': undefined,
                'carmen:conflict': undefined,
                'carmen:center': [ -99.6932, 37.2453 ],
                'carmen:extid': 'test.1',
                'carmen:index': 'testA',
                'carmen:geomtype': 1,
                'carmen:tmpid': 1,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        assert.end();
    });
});

test('contextVector badbuffer', function(t) {
    context.getTile.cache.reset();

    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, new Buffer('lkzvjlkajsdf'));
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, -97.4707, 39.4362, false, {}, null, false, false, function(err, data) {
        t.equal(err.toString(), 'Error: Could not detect compression of vector tile');
        t.end();
    });
});

//Carmen should gracefully ignore empty VT buffers
test('contextVector empty VT buffer', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.end();
        });
    });
});

test('nearestPoints empty VT buffer', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.nearestPoints(source, 0, 0, false, function(err, data) {
            assert.ifError(err);
            assert.deepEqual(data, []);
            assert.end();
        });
    });
});

test('nearestPoints scoreFilter', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { id: 2, "carmen:text": "A", "carmen:score": 40, "carmen:center": "0,0" }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { id: 3, "carmen:text": "B", "carmen:score": 60, "carmen:center": "0,0" }
            }
        ]
    }), "data");

    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            maxscore: 100,
            minscore: 0,
            scoreranges: {
                landmark: [ 0.5, 1]
            },
            name: 'poi',
            type: 'poi',
            id: 'testA',
            idx: 0
        };
        assert.pass('* now testing context.nearestPoints() without scoreFilter');
        context.nearestPoints(source, 0, 0, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data.length, 2, 'got two features back');
            for (var i = 0; i < 2; i++)
                for (var j = 0; j < 2; j++)
                    assert.equal(data[i][j], 0, 'coordinate ' + i + ',' + j + ' is zero');
            assert.ok(data[0].hasOwnProperty('tmpid'), 'feature 0 has tmpid');
            assert.ok(data[1].hasOwnProperty('tmpid'), 'feature 1 has tmpid');
            assert.ok(data[1].hasOwnProperty('distance'), 'feature 0 has distance');
            assert.ok(data[1].hasOwnProperty('distance'), 'feature 1 has distance');

            assert.pass('* now testing context.nearestPoints() with scoreFilter');
            context.nearestPoints(source, 0, 0, [50, 100], function(err, data) {
                assert.ifError(err);
                assert.equal(data.length, 1, 'got one feature back');
                assert.equal(data[0].tmpid, 3, 'higher-scoring feature retrieved');
                assert.end();
            });
        });
    });
});

test('contextVector ignores negative score', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "carmen:text": "A", "carmen:score": -1 }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "carmen:text": "B" }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data.properties['carmen:text'], 'B');
            assert.end();
        });
    });
});

test('contextVector only negative score', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "carmen:text": "A", "carmen:score": -1 }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data, false);
            assert.end();
        });
    });
});

test('contextVector matched negative score', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "id": 1, "carmen:text": "A", "carmen:score": -1 }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, { 1:{} }, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data.properties['carmen:text'], 'A');
            assert.end();
        });
    });
});

test('contextVector grabbed exclusive ID', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { id: 4, "carmen:text": "A", "carmen:score": -1 }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { id: 5, "carmen:text": "B" }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {_exclusive: true, 4: true}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data.properties['carmen:text'], 'A');
            assert.end();
        });
    });
});

test('contextVector restricts distance', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    // o-----x <-- query
    // |\    |     the distance in this case is millions of miles
    // | \   |     (24364904ish)
    // |  \  |
    // |   \ |
    // |    \|
    // +-----o
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "LineString", "coordinates": [ [-180,85],[180,-85] ] },
                "properties": { "carmen:text": "A" }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 170, 80, false, {}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data, false);
            assert.end();
        });
    });
});

(function() {
    // +-----+ <-- query is equidistant from two features
    // |     |
    // | o o |
    // |  x  |
    // |     |
    // |     |
    // +-----+

    var geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [-0.001,0.001] },
                "properties": { "id":1, "carmen:text": "A" }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [0.001,0.001] },
                "properties": { "id":2, "carmen:text": "B" }
            }
        ]
    };
    var vtileA = new mapnik.VectorTile(0,0,0);
    vtileA.addGeoJSON(JSON.stringify(geojson),"data");

    geojson.features.reverse();
    var vtileB = new mapnik.VectorTile(0,0,0);
    vtileB.addGeoJSON(JSON.stringify(geojson),"data");

    test('contextVector sorts ties A', function(assert) {
        context.getTile.cache.reset();

        zlib.gzip(vtileA.getData(), function(err, buffer) {
            assert.ifError(err);
            var source = {
                getTile: function(z,x,y,callback) {
                    return callback(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
                assert.ifError(err);
                assert.equal(data.properties['carmen:text'], 'A');
                assert.end();
            });
        });
    });

    test('contextVector sorts ties A', function(assert) {
        context.getTile.cache.reset();

        zlib.gzip(vtileB.getData(), function(err, buffer) {
            assert.ifError(err);
            var source = {
                getTile: function(z,x,y,callback) {
                    return callback(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
                assert.ifError(err);
                assert.equal(data.properties['carmen:text'], 'A');
                assert.end();
            });
        });
    });

    test('contextVector sorts ties B (matched)', function(assert) {
        context.getTile.cache.reset();

        zlib.gzip(vtileB.getData(), function(err, buffer) {
            assert.ifError(err);
            var source = {
                getTile: function(z,x,y,callback) {
                    return callback(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, { 2:true }, null, false, false, function(err, data) {
                assert.ifError(err);
                assert.equal(data.properties['carmen:text'], 'B');
                assert.end();
            });
        });
    });
})();

test('contextVector caching', function(assert) {
    context.getTile.cache.reset();

    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [0,0] },
                "properties": { "carmen:text": "A" }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        var hit, miss;
        hit = context.getTile.cacheStats.hit;
        miss = context.getTile.cacheStats.miss;
        context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data.properties['carmen:extid'], 'test.1');
            assert.equal(context.getTile.cacheStats.hit - hit, 0, 'hits +0');
            assert.equal(context.getTile.cacheStats.miss - miss, 1, 'miss +1');
            hit = context.getTile.cacheStats.hit;
            miss = context.getTile.cacheStats.miss;
            context.contextVector(source, 0, 0, false, {}, null, false, false, function(err, data) {
                assert.ifError(err);
                assert.equal(data.properties['carmen:extid'], 'test.1');
                assert.equal(context.getTile.cacheStats.hit - hit, 1, 'hits +1');
                assert.equal(context.getTile.cacheStats.miss - miss, 0, 'miss +0');
                assert.end();
            });
        });
    });
});

test('Context eliminates correct properties', function(assert) {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {}),
        region: new mem({maxzoom: 6 }, function() {})
    };
    var c = new Carmen(conf);

    var country = {
        id: 1,
        properties: {
            'carmen:text': 'united states',
            'carmen:center': [0,0],
            'carmen:zxy':['6/32/32'],
            'id': '2',
            'idaho_potatoes': 'are an important agricultural resource',
            'short_code': 'us'
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    };
    var region = {
        id: 2,
        properties: {
            'carmen:text': 'maine',
            'carmen:center': [0,0],
            'carmen:zxy':['6/32/32']
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    };

    var q = queue(1);
    q.defer(function(cb) { queueFeature(conf.country, country, cb); });
    q.defer(function(cb) { queueFeature(conf.region, region, cb); });
    q.defer(function(cb) { buildQueued(conf.country, cb); });
    q.defer(function(cb) { buildQueued(conf.region, cb); });
    q.awaitAll(function() {
        c._open(function() {
            context(c, [0, 0], { full: false }, function(err, contexts) {
                assert.ifError(err);
                var contextObj = contexts.pop();
                assert.deepEqual(Object.keys(contextObj.properties).sort(), ['carmen:extid', 'carmen:tmpid', 'carmen:index', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:types', 'carmen:center', 'carmen:text', 'idaho_potatoes', 'short_code'].sort(), 'found expected keys on country object');
                contextObj = contexts.pop();
                assert.deepEqual(Object.keys(contextObj.properties).sort(), ['carmen:extid', 'carmen:tmpid', 'carmen:index', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:types', 'carmen:center', 'carmen:text'].sort(), 'found expected keys on region object');
                assert.end();
            });
        });
    });
});

test('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
