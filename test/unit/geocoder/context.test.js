'use strict';
const Carmen = require('../../..');
const context = require('../../../lib/geocoder/context');
const test = require('tape');
const zlib = require('zlib');
const path = require('path');
const mapnik = require('mapnik');
const addFeature = require('../../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
const queue = require('d3-queue').queue;
const mem = require('../../../lib/sources/api-mem');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

test('contextVector deflate', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [0,0]
                },
                'properties': {
                    'carmen:center': [-99.693234, 37.245325],
                    'carmen:text': 'United States of America, United States, America, USA, US',
                    'iso2': 'US',
                    'population': 307212123,
                    'title': 'United States of America'
                }
            }
        ]
    }), 'data');
    const buffer = zlib.deflateSync(vtile.getData());
    const source = {
        getTile: (z, x, y, cb) => {
            return cb(null, buffer);
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
        t.ifError(err);

        t.deepEqual(data.properties['carmen:vtquerydist'] < 0.0001, true);
        delete data.properties['carmen:vtquerydist'];

        t.deepEqual(data, {
            properties: {
                'carmen:types': ['test'],
                'carmen:stack': undefined,
                'carmen:conflict': undefined,
                'carmen:center': [-99.6932, 37.2453],
                'carmen:extid': 'test.1',
                'carmen:index': 'testA',
                'carmen:idx': 0,
                'carmen:geomtype': 'Point',
                'carmen:tmpid': 1,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        t.end();
    });
});

test('contextVector gzip', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [0,0]
                },
                'properties': {
                    'carmen:center': [-99.693234, 37.245325],
                    'carmen:text': 'United States of America, United States, America, USA, US',
                    'iso2': 'US',
                    'population': 307212123,
                    'title': 'United States of America'
                }
            }
        ]
    }), 'data');
    const buffer = zlib.gzipSync(vtile.getData());
    const source = {
        getTile: (z, x, y, cb) => {
            return cb(null, buffer);
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
        t.ifError(err);

        t.deepEqual(data.properties['carmen:vtquerydist'] < 0.0001, true);
        delete data.properties['carmen:vtquerydist'];

        t.deepEqual(data, {
            properties: {
                'carmen:types': ['test'],
                'carmen:stack': undefined,
                'carmen:conflict': undefined,
                'carmen:center': [-99.6932, 37.2453],
                'carmen:extid': 'test.1',
                'carmen:index': 'testA',
                'carmen:idx': 0,
                'carmen:geomtype': 'Point',
                'carmen:tmpid': 1,
                'carmen:text': 'United States of America, United States, America, USA, US',
                'iso2': 'US',
                'population': 307212123,
                'title': 'United States of America'
            }
        });
        t.end();
    });
});

test('contextVector badbuffer', (t) => {
    context.getTile.cache.reset();

    const source = {
        getTile: (z,x,y,cb) => {
            return cb(null, new Buffer('lkzvjlkajsdf'));
        },
        geocoder_layer: 'data',
        maxzoom: 0,
        minzoom: 0,
        name: 'test',
        type: 'test',
        id: 'testA',
        idx: 0
    };
    context.contextVector(source, -97.4707, 39.4362, false, {}, null, false, false, undefined, (err, data) => {
        t.equal(err.toString(), 'Error: Could not detect compression of vector tile');
        t.end();
    });
});

// Carmen should gracefully ignore empty VT buffers
test('contextVector empty VT buffer', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.end();
        });
    });
});

test('nearestPoints empty VT buffer', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.nearestPoints(source, 0, 0, false, (err, data) => {
            t.ifError(err);
            t.deepEqual(data, []);
            t.end();
        });
    });
});

test('nearestPoints scoreFilter', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { id: 2, 'carmen:text': 'A', 'carmen:score': 40, 'carmen:center': '0,0' }
            },
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { id: 3, 'carmen:text': 'B', 'carmen:score': 60, 'carmen:center': '0,0' }
            }
        ]
    }), 'data');

    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            maxscore: 100,
            minscore: 0,
            scoreranges: {
                landmark: [0.5, 1]
            },
            name: 'poi',
            type: 'poi',
            id: 'testA',
            idx: 0
        };
        t.pass('* now testing context.nearestPoints() without scoreFilter');
        context.nearestPoints(source, 0, 0, false, (err, data) => {
            t.ifError(err);
            t.equal(data.length, 2, 'got two features back');
            for (let i = 0; i < 2; i++)
                for (let j = 0; j < 2; j++)
                    t.equal(data[i][j], 0, 'coordinate ' + i + ',' + j + ' is zero');
            t.ok(data[0].hasOwnProperty('tmpid'), 'feature 0 has tmpid');
            t.ok(data[1].hasOwnProperty('tmpid'), 'feature 1 has tmpid');
            t.ok(data[1].hasOwnProperty('distance'), 'feature 0 has distance');
            t.ok(data[1].hasOwnProperty('distance'), 'feature 1 has distance');

            t.pass('* now testing context.nearestPoints() with scoreFilter');
            context.nearestPoints(source, 0, 0, [50, 100], (err, data) => {
                t.ifError(err);
                t.equal(data.length, 1, 'got one feature back');
                t.equal(data[0].tmpid, 3, 'higher-scoring feature retrieved');
                t.end();
            });
        });
    });
});

test('contextVector ignores negative score', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { 'carmen:text': 'A', 'carmen:score': -1 }
            },
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { 'carmen:text': 'B' }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data.properties['carmen:text'], 'B');
            t.end();
        });
    });
});

test('contextVector only negative score', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { 'carmen:text': 'A', 'carmen:score': -1 }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data, false);
            t.end();
        });
    });
});

test('contextVector matched negative score', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { 'id': 1, 'carmen:text': 'A', 'carmen:score': -1 }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, { 1:{} }, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data.properties['carmen:text'], 'A');
            t.end();
        });
    });
});

test('contextVector grabbed exclusive ID', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { id: 4, 'carmen:text': 'A', 'carmen:score': -1 }
            },
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { id: 5, 'carmen:text': 'B' }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 0, 0, false, { _exclusive: true, 4: true }, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data.properties['carmen:text'], 'A');
            t.end();
        });
    });
});

test('contextVector restricts distance', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    // o-----x <-- query
    // |\    |     the distance in this case is millions of miles
    // | \   |     (24364904ish)
    // |  \  |
    // |   \ |
    // |    \|
    // +-----o
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'LineString', 'coordinates': [[-180,85],[180,-85]] },
                'properties': { 'carmen:text': 'A' }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 170, 80, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data, false);
            t.end();
        });
    });
});

test('contextVector near miss polygons', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[
                        [-40, -40],
                        [-40, 40],
                        [40, 40],
                        [40, -40],
                        [-40, -40],
                    ]],
                },
                'properties': { 'carmen:text': 'A' },
            },
        ],
    }), 'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        context.contextVector(source, 39, 39, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data['properties']['carmen:text'], 'A');
        });
        context.contextVector(source, 40.0001, 40.0001, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data, false);
            t.end();
        });
    });
});

(() => {
    // +-----+ <-- query is equidistant from two features
    // |     |
    // | o o |
    // |  x  |
    // |     |
    // |     |
    // +-----+

    const geojson = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [-0.001,0.001] },
                'properties': { 'id':1, 'carmen:text': 'A' }
            },
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0.001,0.001] },
                'properties': { 'id':2, 'carmen:text': 'B' }
            }
        ]
    };
    const vtileA = new mapnik.VectorTile(0,0,0);
    vtileA.addGeoJSON(JSON.stringify(geojson),'data');

    geojson.features.reverse();
    const vtileB = new mapnik.VectorTile(0,0,0);
    vtileB.addGeoJSON(JSON.stringify(geojson),'data');

    test('contextVector sorts ties A', (t) => {
        context.getTile.cache.reset();

        zlib.gzip(vtileA.getData(), (err, buffer) => {
            t.ifError(err);
            const source = {
                getTile: (z,x,y,cb) => {
                    return cb(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
                t.ifError(err);
                t.equal(data.properties['carmen:text'], 'A');
                t.end();
            });
        });
    });

    test('contextVector sorts ties A', (t) => {
        context.getTile.cache.reset();

        zlib.gzip(vtileB.getData(), (err, buffer) => {
            t.ifError(err);
            const source = {
                getTile: (z,x,y,cb) => {
                    return cb(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
                t.ifError(err);
                t.equal(data.properties['carmen:text'], 'A');
                t.end();
            });
        });
    });

    test('contextVector sorts ties B (matched)', (t) => {
        context.getTile.cache.reset();

        zlib.gzip(vtileB.getData(), (err, buffer) => {
            t.ifError(err);
            const source = {
                getTile: (z,x,y,cb) => {
                    return cb(null, buffer);
                },
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                type: 'test',
                id: 'testA',
                idx: 0
            };
            context.contextVector(source, 0, 0, false, { 2:true }, null, false, false, undefined, (err, data) => {
                t.ifError(err);
                t.equal(data.properties['carmen:text'], 'B');
                t.end();
            });
        });
    });
})();

test('contextVector caching', (t) => {
    context.getTile.cache.reset();

    const vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': { 'type': 'Point', 'coordinates': [0,0] },
                'properties': { 'carmen:text': 'A' }
            }
        ]
    }),'data');
    zlib.gzip(vtile.getData(), (err, buffer) => {
        t.ifError(err);
        const source = {
            getTile: (z,x,y,cb) => {
                return cb(null, buffer);
            },
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            type: 'test',
            id: 'testA',
            idx: 0
        };
        let hit, miss;
        hit = context.getTile.cacheStats.hit;
        miss = context.getTile.cacheStats.miss;
        context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
            t.ifError(err);
            t.equal(data.properties['carmen:extid'], 'test.1');
            t.equal(context.getTile.cacheStats.hit - hit, 0, 'hits +0');
            t.equal(context.getTile.cacheStats.miss - miss, 1, 'miss +1');
            hit = context.getTile.cacheStats.hit;
            miss = context.getTile.cacheStats.miss;
            context.contextVector(source, 0, 0, false, {}, null, false, false, undefined, (err, data) => {
                t.ifError(err);
                t.equal(data.properties['carmen:extid'], 'test.1');
                t.equal(context.getTile.cacheStats.hit - hit, 1, 'hits +1');
                t.equal(context.getTile.cacheStats.miss - miss, 0, 'miss +0');
                t.end();
            });
        });
    });
});

test('Context eliminates correct properties', (t) => {
    const conf = {
        country: new mem({ maxzoom:6 }, () => {}),
        region: new mem({ maxzoom: 6 }, () => {})
    };
    const c = new Carmen(conf);

    const country = {
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
    const region = {
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

    const q = queue(1);
    q.defer((cb) => { queueFeature(conf.country, country, cb); });
    q.defer((cb) => { queueFeature(conf.region, region, cb); });
    q.defer((cb) => { buildQueued(conf.country, cb); });
    q.defer((cb) => { buildQueued(conf.region, cb); });
    q.awaitAll(() => {
        c._open(() => {
            context(c, [0, 0], { full: false }, (err, contexts) => {
                t.ifError(err);
                let contextObj = contexts.pop();
                t.deepEqual(Object.keys(contextObj.properties).sort(), ['carmen:extid', 'carmen:tmpid', 'carmen:index', 'carmen:idx', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:types', 'carmen:center', 'carmen:text', 'idaho_potatoes', 'short_code'].sort(), 'found expected keys on country object');
                contextObj = contexts.pop();
                t.deepEqual(Object.keys(contextObj.properties).sort(), ['carmen:extid', 'carmen:tmpid', 'carmen:index', 'carmen:idx', 'carmen:vtquerydist', 'carmen:geomtype', 'carmen:types', 'carmen:center', 'carmen:text'].sort(), 'found expected keys on region object');
                t.end();
            });
        });
    });
});





test('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
