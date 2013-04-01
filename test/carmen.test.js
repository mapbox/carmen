var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var S3 = Carmen.S3();
var MBTiles = Carmen.MBTiles();

// Use BACKEND=<backend> env var to specify the carmen backend to be tested.
var backend = (process.env.BACKEND||'mbtiles').toLowerCase();
if (backend !== 'mbtiles' && backend !== 's3') {
    console.warn('Backend %s unknown.', backend);
    process.exit(1);
} else {
    console.warn('Testing %s backend.', backend);
}

if (backend === 'mbtiles') var carmen = new Carmen({
    country: {
        weight: 2,
        source: new MBTiles(__dirname + '/../tiles/ne-countries.mbtiles', function(){})
    },
    province: {
        weight: 1.5,
        source: new MBTiles(__dirname + '/../tiles/ne-provinces.mbtiles', function(){})
    },
    place: {
        source: new MBTiles(__dirname + '/../tiles/osm-places.mbtiles', function(){})
    },
    zipcode: {
        context: false,
        source: new MBTiles(__dirname + '/../tiles/tiger-zipcodes.mbtiles', function(){}),
        filter: function(token) { return /[0-9]{5}/.test(token); }
    }
});

if (backend === 's3') try {
    var s3cfg = require('fs').readFileSync(require('path').join(process.env.HOME, '.s3cfg'), 'utf8');
    var awsKey = s3cfg.match(/access_key = (.*)/)[1];
    var awsSecret = s3cfg.match(/secret_key = (.*)/)[1];
    var carmen = new Carmen({
        country: {
            weight: 2,
            source: new S3({data:{
                "grids": [ "http://mapbox-carmen.s3.amazonaws.com/fixtures/ne-countries/{z}/{x}/{y}.grid.json" ],
                "_carmen": "http://mapbox-carmen.s3.amazonaws.com/fixtures/ne-countries",
                "maxzoom": 8,
                "awsKey": awsKey,
                "awsSecret": awsSecret
            }}, function(){})
        },
        province: {
            weight: 1.5,
            source: new S3({data:{
                "grids": [ "http://mapbox-carmen.s3.amazonaws.com/fixtures/ne-provinces/{z}/{x}/{y}.grid.json" ],
                "_carmen": "http://mapbox-carmen.s3.amazonaws.com/fixtures/ne-provinces",
                "maxzoom": 9,
                "awsKey": awsKey,
                "awsSecret": awsSecret
            }}, function(){})
        },
        place: {
            source: new S3({data:{
                "grids": [ "http://mapbox-carmen.s3.amazonaws.com/fixtures/osm-places/{z}/{x}/{y}.grid.json" ],
                "_carmen": "http://mapbox-carmen.s3.amazonaws.com/fixtures/osm-places",
                "maxzoom": 11,
                "awsKey": awsKey,
                "awsSecret": awsSecret
            }}, function(){})
        },
        zipcode: {
            context: false,
            source: new S3({data:{
                "grids": [ "http://mapbox-carmen.s3.amazonaws.com/fixtures/tiger-zipcodes/{z}/{x}/{y}.grid.json" ],
                "_carmen": "http://mapbox-carmen.s3.amazonaws.com/fixtures/tiger-zipcodes",
                "maxzoom": 10
            }}, function(){}),
            filter: function(token) { return /[0-9]{5}/.test(token); }
        }
    });
} catch(err) {
    console.warn('Could not read AWS credentials from .s3cfg.');
    console.warn('S3 backend will not be tested.');
}

function okay(type, a, b, margin) {
    var margin = margin || 0.01;
    var typecheck = type === 'place'
        ? _(['city', 'town', 'village']).include(a.type)
        : a.type === type;
    return typecheck &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
};

function loadFixture(path, sample) {
    var fixtures = _(fs.readFileSync(path, 'utf8').split('\n')).chain()
        .compact()
        .map(function(line) {
            var p = line.split(',');
            if (p[0]) return {
                name: p[0],
                lon: parseFloat(p[1]),
                lat: parseFloat(p[2])
            };
        })
        .compact()
        .value();
    if (sample) fixtures = _(_(fixtures).shuffle().slice(0, sample))
        .sortBy(function(r) { return r.name });
    return fixtures;
};

function loadContext(path) {
    return _(fs.readFileSync(path, 'utf8').split('\n')).chain()
        .compact()
        .map(function(line) {
            var p = line.split('|');
            return { query: p[0], result: p.slice(1) };
        })
        .compact()
        .value();
};

var fixtures = {};
fixtures.country = loadFixture(__dirname + '/../fixtures/test-countries.csv');
fixtures.province = loadFixture(__dirname + '/../fixtures/test-provinces.csv');
fixtures.zipcode = loadFixture(__dirname + '/../fixtures/test-zipcodes.csv', 400);
fixtures.place = loadFixture(__dirname + '/../fixtures/test-places.csv', 200);

var summary = function(label, stats, verbose) {
    console.warn('');
    console.warn('  %s %s% (%s/%s) at %sms/query', label, (stats.okay/stats.total*100).toFixed(1), stats.okay, stats.total, (((+new Date) - stats.start)/stats.total).toFixed(1));

    if (!verbose) return;
    _(stats.failed).each(function(group, type) {
        console.warn('');
        console.warn('  ' + type);
        console.warn('  ' + new Array(type.length + 1).join('-'));
        _(group).each(function(results, name) {
            var results = results.join(', ');
            if (results.length > 40) results = results.substr(0,40) + '...';
            console.warn('  %s => %s', name, results);
        });
    });
}

describe('error condition', function() {
    it('should detect missing index', function(done) {
        var source = new MBTiles(__dirname +'/../fixtures/no-index.mbtiles',function(){
            var bad = new Carmen({'foo': {source: source}});
            bad.geocode('foo', function(err, res) {
                assert.notEqual(err, null, 'Missing index ignored');
                assert.equal(err.message, 'SQLITE_ERROR: no such table: carmen');
                done();
            });
        })
    });
});

var context = loadContext(__dirname + '/../fixtures/test-context.csv');
describe('context', function() {
    var stats = {
        start: + new Date,
        total: 0,
        okay: 0,
        failed: {}
    };
    _(context).each(function(row) {
        it(row.query, function(done) {
            carmen.geocode(row.query, function(err, res) {
                assert.ifError(err);
                stats.total++;
                var names = _(res.results[0]).chain()
                    .pluck('name')
                    .value();
                var inResults = _(row.result).isEqual(names);
                if (inResults) {
                    stats.okay++;
                } else {
                    stats.failed.context = stats.failed.context || {};
                    stats.failed.context[row.query] = names;
                }
                done();
            });
        });
    });
    after(function() {
        summary('context', stats, true);
    });
});

describe('centroid', function() {
    var stats = {
        start: + new Date,
        total: 0,
        okay: 0,
        failed: {}
    };
    _(fixtures.country.slice(60,70)).each(function(row) {
        it (row.name, function(done) {
            carmen.geocode(row.name, function(err, res) {
                assert.ifError(err);
                carmen.centroid(res.results[0][0].id, function(err, res) {
                    assert.ifError(err);
                    assert.ok(okay('country', {
                        name:row.name,
                        type:'country',
                        lon:res[0],
                        lat:res[1]
                    }, row, 5));
                    done();
                });
            });
        });
    });
});

_(fixtures).each(function(fixture, type) {
    if (!carmen.indexes[type] || !carmen.indexes[type].query) return;

    describe('geocode ' + type, function() {
        var stats = {
            start: + new Date,
            total: 0,
            okay: 0,
            failed: {}
        };
        _(fixture).each(function(row) {
            it(row.name, function(done) {
                carmen.geocode(row.name, function(err, res) {
                    assert.ifError(err);
                    stats.total++;
                    var inResults = _(res.results).chain()
                        .pluck('0')
                        .any(function(r) { return okay(type, r, row) })
                        .value();
                    if (inResults) {
                        stats.okay++;
                    } else {
                        stats.failed[type] = stats.failed[type] || {};
                        stats.failed[type][row.name] = _(res.results).chain()
                            .pluck('0')
                            .map(function(r) { return r.type + '.' + r.name })
                            .uniq()
                            .value();
                    }
                    done();
                });
            });
        });
        after(function() {
            summary('geocode ' + type, stats);
        });
    });
});

_(fixtures).each(function(fixture, type) {
    if (!carmen.indexes[type] || !carmen.indexes[type].context) return;

    describe('reverse', function() {
        var stats = {
            start: + new Date,
            total: 0,
            okay: 0,
            failed: {}
        };
        _(fixture).each(function(row) {
            var coords = row.lon +','+ row.lat;
            it(coords, function(done) {
                carmen.geocode(coords, function(err, res) {
                    assert.ifError(err);
                    stats.total++;

                    var inResults = _(res.results[0]).chain()
                        .any(function(r) { return row.name == r.name })
                        .value();
                    if (inResults) {
                        stats.okay++;
                    } else {
                        stats.failed[type] = stats.failed[type] || {};
                        stats.failed[type][row.name] = _(res.results[0]).chain()
                            .map(function(r) { return r.type + '.' + r.name })
                            .uniq()
                            .value();
                    }
                    done();
                });
            });
        });
        after(function() {
            summary('reverse ' + type, stats);
        });
    });
});
