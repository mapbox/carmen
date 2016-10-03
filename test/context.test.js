var fs = require('fs');
var Carmen = require('..');
var context = require('../lib/context');
var test = require('tape');
var zlib = require('zlib');
var path = require('path');
var mapnik = require('mapnik');
var addFeature = require('../lib/util/addfeature');
var queue = require('d3-queue').queue;
var mem = require('../lib/api-mem');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

test('contextVector deflate', function(t) {
    context.getTile.cache.reset();

    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbf'), {
                'content-type': 'application/x-protobuf',
                'content-encoding': 'deflate'
            });
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 1
    };
    context.contextVector(source, -97.4707, 39.4362, false, {}, null, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            properties: {
                'carmen:center': [ -99.693234, 37.245325 ],
                'carmen:extid': 'test.5',
                'carmen:dbidx': 1,
                'carmen:vtquerydist': 0,
                'carmen:geomtype': 3,
                'carmen:tmpid': Math.pow(2,25) + 5,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        t.end();
    });
});

test('contextVector gzip', function(t) {
    context.getTile.cache.reset();

    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbfz'), {
                'content-type': 'application/x-protobuf',
                'content-encoding': 'gzip'
            });
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 1
    };
    context.contextVector(source, -97.4707, 39.4362, false, {}, null, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            properties: {
                'carmen:center': [ -99.693234, 37.245325 ],
                'carmen:dbidx': 1,
                'carmen:extid': 'test.5',
                'carmen:tmpid': Math.pow(2,25) + 5,
                'carmen:vtquerydist': 0,
                'carmen:geomtype': 3,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        t.end();
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
    context.contextVector(source, -97.4707, 39.4362, false, {}, null, function(err, data) {
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
        context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
        context.nearestPoints(source, 0, 0, function(err, data) {
            assert.ifError(err);
            assert.deepEqual(data, []);
            assert.end();
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
                "properties": { "_text": "A", "_score": -1 }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "_text": "B" }
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
        context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
                "properties": { "_text": "A", "_score": -1 }
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
        context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
                "properties": { "_id": 1, "_text": "A", "_score": -1 }
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
        context.contextVector(source, 0, 0, false, { 1:{} }, null, function(err, data) {
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
                "properties": { "_text": "A" }
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
        context.contextVector(source, 170, 80, false, {}, null, function(err, data) {
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
                "properties": { "_id":1, "_text": "A" }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [0.001,0.001] },
                "properties": { "_id":2, "_text": "B" }
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
            context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
            context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
            context.contextVector(source, 0, 0, false, { 2:true }, null, function(err, data) {
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
                "properties": { "_text": "A" }
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
        context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
            assert.ifError(err);
            assert.equal(data.properties['carmen:extid'], 'test.1');
            assert.equal(context.getTile.cacheStats.hit - hit, 0, 'hits +0');
            assert.equal(context.getTile.cacheStats.miss - miss, 1, 'miss +1');
            hit = context.getTile.cacheStats.hit;
            miss = context.getTile.cacheStats.miss;
            context.contextVector(source, 0, 0, false, {}, null, function(err, data) {
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
    q.defer(function(cb) { addFeature(conf.country, country, cb); });
    q.defer(function(cb) { addFeature(conf.region, region, cb); });
    q.awaitAll(function() {
        c._open(function() {
            context(c, 0, 0, { full: false }, function(err, contexts) {
                assert.ifError(err);
                var contextObj = contexts.pop();
                assert.deepEqual(Object.keys(contextObj.properties), ['carmen:extid', 'carmen:tmpid', 'carmen:dbidx', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:center', 'carmen:text', 'idaho_potatoes', 'short_code'], 'found expected keys on country object');
                contextObj = contexts.pop();
                assert.deepEqual(Object.keys(contextObj.properties), ['carmen:extid', 'carmen:tmpid', 'carmen:dbidx', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:center', 'carmen:text'], 'found expected keys on region object');
                assert.end();
            });
        });
    });
});

test('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
