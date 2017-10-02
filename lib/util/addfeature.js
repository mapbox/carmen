const queue = require('d3-queue').queue;
const index = require('../../lib/index');
const mapnik = require('mapnik');
const path = require('path');
const cover = require('@mapbox/tile-cover');
const tilebelt = require('@mapbox/tilebelt');
const split = require('split');

mapnik.register_datasource(
    path.join(mapnik.settings.paths.input_plugins, 'ogr.input')
);
mapnik.register_datasource(
    path.join(mapnik.settings.paths.input_plugins, 'geojson.input')
);

module.exports = {};
module.exports.queueFeature = queueFeature;
module.exports.queueVT = queueVT;
module.exports.buildQueued = buildQueued;
module.exports.setOptions = setOptions;
module.exports.resetLogs = resetLogs;

let options = {};

function setOptions(opts = {}) {
    options = opts;
}

function queueFeature(source, doc, callback) {
    if (!Array.isArray(doc)) doc = [doc];
    source.__pending = source.__pending || {};
    source.__pending[false] = source.__pending[false] || [];
    source.__pending[false] = source.__pending[false].concat(doc);
    callback(null);
}

function queueVT(source, doc, callback) {
    if (!Array.isArray(doc)) doc = [doc];
    source.__pending = source.__pending || {};
    source.__pending[true] = source.__pending[true] || [];
    source.__pending[true] = source.__pending[true].concat(doc);
    callback(null);
}

function buildQueued(source, callback) {
    const q = queue(1);
    [false, true].forEach(vtile_only => {
        source.__pending = source.__pending || {};
        if (
            source.__pending[vtile_only] &&
            source.__pending[vtile_only].length
        ) {
            q.defer(cb => {
                _addFeature(
                    source,
                    source.__pending[vtile_only],
                    vtile_only,
                    cb
                );
            });
        }
    });
    q.awaitAll(err => {
        delete source.__pending;
        return callback(err);
    });
}

function zxyArray(input) {
    return input.properties['carmen:zxy'].map(zxy => {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0], 10);
        zxy[1] = parseInt(zxy[1], 10);
        zxy[2] = parseInt(zxy[2], 10);
        return zxy;
    });
}

function _addFeature(source, docs, vtile_only, callback) {
    let zxys;
    docs.forEach(input => {
        input.type = 'Feature';

        if (!input.properties['carmen:zxy']) {
            if (input.geometry.type === 'GeometryCollection') {
                input.properties['carmen:zxy'] = [];
                let tiles = [];
                for (
                    let feat_it = 0;
                    feat_it < input.geometry.geometries.length;
                    feat_it++
                ) {
                    tiles = tiles.concat(
                        cover.tiles(input.geometry.geometries[feat_it], {
                            min_zoom: source.maxzoom,
                            max_zoom: source.maxzoom
                        })
                    );
                }
                tiles.forEach(tile => {
                    input.properties['carmen:zxy'].push(
                        tile[2] + '/' + tile[0] + '/' + tile[1]
                    );
                });
            } else {
                input.properties['carmen:zxy'] = cover
                    .tiles(input.geometry, {
                        min_zoom: source.maxzoom,
                        max_zoom: source.maxzoom
                    })
                    .map(zxy => {
                        return zxy[2] + '/' + zxy[0] + '/' + zxy[1];
                    });
            }

            zxys = zxyArray(input);
        } else if (!input.geometry) {
            zxys = zxyArray(input);

            let i = zxys.length;
            let zxyCoords = [];
            while (i--) {
                zxyCoords[i] = tilebelt.tileToGeoJSON([
                    zxys[i][1],
                    zxys[i][2],
                    zxys[i][0]
                ]).coordinates;
            }

            input.geometry = {
                type: 'MultiPolygon',
                coordinates: zxyCoords
            };
        } else {
            zxys = zxyArray(input);
        }

        input.geometry = input.geometry || {
            type: 'Point',
            coordinates: input.properties['carmen:center']
        };
    });

    // Set maxzoom on source if not set
    if (isNaN(source.maxzoom)) source.maxzoom = zxys[0][0];

    const output = split();
    const transformQ = new queue(1);
    let startQ = false;
    output.on('data', res => {
        if (res) transformQ.defer(vectorize, JSON.parse(res), source);
    });
    output.on('end', () => {
        if (!startQ) startQ = true;
        else transformQ.awaitAll(end);
    });
    output.on('error', err => {
        return callback(err);
    });

    index.update(
        source,
        docs,
        {
            zoom: source.maxzoom,
            output: output,
            tokens: options.tokens
        },
        err => {
            if (err) return callback(err);
            if (vtile_only) return callback();

            index.store(source, err => {
                if (err) return callback(err);

                if (!startQ) startQ = true;
                else transformQ.awaitAll(end);
            });
        }
    );

    function end(err) {
        return callback(err);
    }
}

function vectorize(feat, source, done) {
    const q = new queue();

    let zxys = cover
        .tiles(feat.geometry, {
            min_zoom: source.maxzoom,
            max_zoom: source.maxzoom
        })
        .map(xyz => {
            let x = xyz[0];
            let y = xyz[1];
            let z = xyz[2];
            if (z < 0 || x < 0 || y < 0) return false;
            if (x >= Math.pow(2, z) || y >= Math.pow(2, z)) return false;
            return [z, x, y];
        })
        .filter(Boolean);

    for (let i = 0; i < zxys.length; i++)
        q.defer((zxy, done) => {
            source.getTile(zxy[0], zxy[1], zxy[2], (err, res) => {
                if (err) {
                    addData();
                } else {
                    let tmpTile = new mapnik.VectorTile(zxy[0], zxy[1], zxy[2]);
                    tmpTile.setData(res, err => {
                        if (err) {
                            addData();
                        } else {
                            addData(tmpTile);
                        }
                    });
                }
            });

            function addData(currentTile) {
                let feats;
                if (currentTile && !currentTile.empty()) {
                    feats = JSON.parse(currentTile.toGeoJSONSync('data'))
                        .features;
                    feats.push(feat);
                } else {
                    feats = [feat];
                }

                const vtile = new mapnik.VectorTile(zxy[0], zxy[1], zxy[2]);
                vtile.addGeoJSON(
                    JSON.stringify(
                        {
                            type: 'FeatureCollection',
                            features: feats
                        },
                        null,
                        2
                    ),
                    'data'
                );
                vtile.getData({ compression: 'gzip' }, (err, buffer) => {
                    if (err) return done(err);
                    source.putTile(zxy[0], zxy[1], zxy[2], buffer, err => {
                        done(err);
                    });
                });
            }
        }, zxys[i]);

    q.awaitAll(err => {
        return done(err);
    });
}

function resetLogs(conf) {
    Object.keys(conf).forEach(key => {
        conf[key]._original.logs.getGeocoderData = [];
        conf[key]._original.logs.getTile = [];
    });
}
