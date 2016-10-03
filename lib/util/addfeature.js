var queue = require('d3-queue').queue;
var index = require('../../lib/index');
var mapnik = require('mapnik');
var path = require('path');
var cover = require('tile-cover');
var tilebelt = require('tilebelt');
var split = require('split');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

module.exports = addFeature;
module.exports.vt = addVT;

var options = {};

module.exports.setOptions = function(opts) {
    options = opts;
}

function addFeature(source, doc, callback) {
    return _addFeature(source, doc, false, callback);
}

function addVT(source, doc, callback) {
    return _addFeature(source, doc, true, callback);
}

function zxyArray(input) {
    return input.properties['carmen:zxy'].map(function(zxy) {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0],10);
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        return zxy
    });
}

function _addFeature(source, input, vtile_only, callback) {
    input.type = 'Feature';

    var zxys;
    if (!input.properties['carmen:zxy']) {
        input.properties['carmen:zxy'] = cover.tiles(input.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom}).map(function(zxy) {
            return zxy[2] + '/' + zxy[0] + '/' + zxy[1]
        });

        zxys = zxyArray(input);
    } else if (!input.geometry) {
        zxys = zxyArray(input);

        var i = zxys.length;
        var zxyCoords = [];
        while (i--) {
            zxyCoords[i] = tilebelt.tileToGeoJSON([zxys[i][1], zxys[i][2], zxys[i][0]]).coordinates;
        }

        input.geometry = {
            type: "MultiPolygon",
            coordinates: zxyCoords
        }
    } else {
        zxys = zxyArray(input);
    }

    // Set maxzoom on source if not set
    if (isNaN(source.maxzoom)) source.maxzoom = zxys[0][0];

    input.geometry = input.geometry || {
        type: 'Point',
        coordinates: input.properties['carmen:center']
    };

    if (options.tokens) {
        var tokens = Object.keys(options.tokens);
        for (var tokens_it = 0; tokens_it < tokens.length; tokens_it++) {
            source.geocoder_tokens[tokens[tokens_it]] = options.tokens[tokens[tokens_it]];
        }
    }

    var output = split();
    var transformQ = new queue(1);
    var startQ = false;
    output.on('data', function(res) {
        if (res) transformQ.defer(vectorize, JSON.parse(res), source);
    });
    output.on('end', function() {
        if (!startQ) startQ = true;
        else transformQ.awaitAll(end)
    });
    output.on('error', function(err) {
        return callback(err);
    });

    index.update(source, [input], {
        zoom: zxys[0][0],
        output: output
    }, function(err) {
        if (err) return callback(err);
        if (vtile_only) return callback();

        index.store(source, function(err) {
            if (err) return callback(err);

            if (!startQ) startQ = true;
            else transformQ.awaitAll(end)
        });
    });

    function end(err) {
        return callback(err);
    }

};

function vectorize(feat, source, done) {
    var q = new queue();

    var zxys = cover.tiles(feat.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom}).map(function(xyz) {
        var x = xyz[0];
        var y = xyz[1];
        var z = xyz[2];
        if (z < 0 || x < 0 || y < 0) return false;
        if (x >= Math.pow(2,z) || y >= Math.pow(2,z)) return false;
        return [ z, x, y ];
    }).filter(Boolean);

    for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
        source.getTile(zxy[0],zxy[1],zxy[2], function(err, res) {
            if (err) {
                addData();
            } else {
                var tmpTile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
                tmpTile.setData(res,function(err) {
                    if (err) {
                        addData();
                    } else {
                        addData(tmpTile);
                    }
                });
            }
        });

        function addData(currentTile) {
            var feats;
            if (currentTile && !currentTile.empty()) {
                feats = JSON.parse(currentTile.toGeoJSONSync('data')).features;
                feats.push(feat);
            } else {
                feats = [feat]
            }

            var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
            vtile.addGeoJSON(JSON.stringify({
                type: 'FeatureCollection',
                features: feats
            }, null, 2), 'data');
            vtile.getData({compression:'gzip'}, function(err, buffer) {
                if (err) return done(err);
                source.putTile(zxy[0],zxy[1],zxy[2], buffer, function(err) {
                    done(err);
                });
            });
        }
    }, zxys[i]);

    q.awaitAll(function(err) {
        return done(err);
    });
}
