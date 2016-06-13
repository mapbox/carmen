var queue = require('d3-queue').queue;
var termops = require('./termops');
var tilebelt = require('tilebelt');
var cover = require('tile-cover');
var extent = require('turf-extent');

module.exports = {};
module.exports.transform = transform;
module.exports.seek = seek;
module.exports.shard = shard;
module.exports.getFeatureByCover = getFeatureByCover;
module.exports.getFeatureById = getFeatureById;
module.exports.putFeatures = putFeatures;

//Old syle documents use a flat heiarchy - transform them into geojson
function transform(feat) {
    keys = Object.keys(feat);
    l = keys.length
    var doc = {
        type: 'Feature',
        properties: {}
    };
    while (l--) {
        if (keys[l] === '_id') {
            doc.id = feat._id;
        } else if (keys[l] === '_geometry' && !doc.geometry && feat._geometry) {
            doc.geometry = feat._geometry;
        } else if (keys[l] === '_cluster' && feat._cluster) {
            doc.geometry = {
                type: "MultiPoint",
                coordinates: []
            }
            var cluster = typeof feat._cluster === 'string' ? JSON.parse(feat._cluster) : feat._cluster;
            doc.properties['carmen:addressnumber'] = [];
            var addresses = Object.keys(cluster);
            for (var i = 0; i < addresses.length; i++) {
                var coord = typeof cluster[addresses[i]] === 'string' ? JSON.parse(cluster[addresses[i]]).coordinates : cluster[addresses[i]].coordinates;
                doc.geometry.coordinates.push(coord);
                doc.properties['carmen:addressnumber'].push(addresses[i]);
            }
        } else if (keys[l] === '_bbox') {
            doc.bbox = feat._bbox;
        } else if (keys[l].indexOf('_') === 0) {
            doc.properties[keys[l].replace('_', 'carmen:')] = feat[keys[l]];
        } else {
            doc.properties[keys[l]] = feat[keys[l]];
        }
    }

    if (!doc.geometry && feat._zxy) {
        var zxys = []
        for (var i = 0; i < feat._zxy.length; i++) {
            zxy = feat._zxy[i].split('/');
            zxy[0] = parseInt(zxy[0],10);
            zxy[1] = parseInt(zxy[1],10);
            zxy[2] = parseInt(zxy[2],10);
            zxys.push(zxy)
        }

        var i = zxys.length;
        while (i--) {
            zxys[i] = tilebelt.tileToGeoJSON([zxys[i][1], zxys[i][2], zxys[i][0]]).coordinates;
        }

        doc.geometry = {
            type: "MultiPolygon",
            coordinates: zxys
        }
    }

    if (!doc.bbox && doc.geometry && (doc.geometry.type === 'MultiPolygon' || doc.geometry.type === 'Polygon')) {
        doc.bbox = extent(doc);
    }

    return doc;
}

// version: 0
// Seek to individual entry in JSON shard without doing a JSON.parse()
// against the entire shard. This is a performance optimization.
function seek(buffer, id) {
    buffer = typeof buffer === 'string' ? buffer : buffer.toString();

    var start = buffer.indexOf('"'+id+'":"{');
    if (start === -1) return false;

    start = buffer.indexOf('"{', start);
    var end = buffer.indexOf('}"', start);
    var entry = buffer.slice(start, end+2);

    return JSON.parse(JSON.parse(entry));
}

function getHash(source, hash, callback) {
    source.getGeocoderData('feature', hash, function(err, buffer) {
        if (err) return callback(err);
        if (!buffer || !buffer.length) return callback();

        var data;
        try {
            data = JSON.parse(buffer);
        } catch (err) {
            return callback(err);
        }
        callback(null, data);
    });
}

function getFeatureByCover(source, cover, callback) {
    getHash(source, cover.id, function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, cover.id, source.id);
            return callback();
        }

        var zxy = source.zoom + '/' + cover.x + '/' + cover.y;
        var feature;
        for (var id in loaded) {
            if (loaded[id]._text) { loaded[id] = transform(loaded[id]); }
            if (loaded[id].properties['carmen:zxy'].indexOf(zxy) === -1) continue;
            feature = loaded[id];
            break;
        }

        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, cover.id, source.id);
            return callback();
        }

        //Convert old style features to new
        return callback(null, feature);
    });
}

function getFeatureById(source, id, callback) {
    if (source.version === 0)
        return getFeatureByLegacyId(source, id, callback);

    getHash(source, termops.feature(id), function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }

        var feature = loaded && loaded[id];
        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }
        if (feature._text) { feature = transform(feature); }
        return callback(null, feature);
    });
}

function getFeatureByLegacyId(source, id, callback) {
    var hash = termops.feature(id);
    var s = shard(source.shardlevel, hash);
    source.getGeocoderData('feature', s, function(err, buffer) {
        if (err) return callback(err);
        var loaded;
        try {
            loaded = seek(buffer, hash);
        } catch (err) {
            return callback(err);
        }
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }

        var feature = loaded && loaded[id];
        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }
        if (feature._text) { feature = transform(feature); }
        return callback(null, feature);
    });
}

function putFeatures(source, docs, callback) {
    var byshard = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        if (doc._text) doc = transform(doc);
        if (!doc.properties['carmen:zxy']) {
            tiles = cover.tiles(doc.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom});
            doc.properties['carmen:zxy'] = [];
            tiles.forEach(function(tile) {
                doc.properties['carmen:zxy'].push(tile[2]+'/'+tile[0]+'/'+tile[1]);
            });
        }
        var s = termops.feature(doc.id);
        byshard[s] = byshard[s] || [];
        byshard[s].push(doc);
    }
    var q = queue(100);
    for (var s in byshard) q.defer(function(s, docs, callback) {
        source.getGeocoderData('feature', s, function(err, buffer) {
            if (err) return callback(err);
            try {
                var current = buffer && buffer.length ? JSON.parse(buffer) : {};
            } catch (err) {
                return callback(err);
            }
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                current[doc.id] = doc;
                // Strip temporary indexing attributes from feature docs.
                delete doc.properties['carmen:hash'];
                delete doc.properties['carmen:grid'];
            }
            source.putGeocoderData('feature', s, JSON.stringify(current), callback);
        });
    }, s, byshard[s]);
    q.awaitAll(callback);
}

// Return the shard for a given shardlevel + id.
function shard(level, id) {
    if (id === undefined) return false;
    var mod = Math.pow(16,level+1);
    var interval = Math.min(64, Math.pow(16, 4-level));
    return Math.floor((id%(interval*mod))/interval);
}
