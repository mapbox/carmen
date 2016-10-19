var Pbf = require('pbf');
var geobuf = require('geobuf');
var cover = require('tile-cover');
var tilebelt = require('tilebelt');
var extent = require('turf-extent');
var queue = require('d3-queue').queue;

var termops = require('./termops');

module.exports = {};
module.exports.seek = seek;
module.exports.shard = shard;
module.exports.transform = transform;
module.exports.putFeatures = putFeatures;
module.exports.addrTransform = addrTransform;
module.exports.getFeatureById = getFeatureById;
module.exports.getFeatureByCover = getFeatureByCover;

function addrTransform(doc) {
    var c_it;
    //All values in an addresscluster should be lowercase so that the lowercased input query always matches the addresscluster
    //All addressnumber type features are also converted into GeometryCollections
    if (doc.properties['carmen:addressnumber'] && doc.geometry) {
        if (doc.geometry.type === 'MultiPoint') {
            doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']];
            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [
                    doc.geometry
                ]
            }
        } else if (doc.geometry.type !== 'GeometryCollection') {
            return 'carmen:addressnumber must be MultiPoint or GeometryCollection';
        }

        if (doc.properties['carmen:addressnumber'].length !== doc.geometry.geometries.length) {
            return 'carmen:addressnumber array must be equal to geometry.geometries array';
        }

        for (c_it = 0; c_it < doc.properties['carmen:addressnumber'].length; c_it++) {
            if (!doc.properties['carmen:addressnumber'][c_it] || !doc.properties['carmen:addressnumber'][c_it].length) continue;

            if (doc.properties['carmen:addressnumber'][c_it].length !== doc.geometry.geometries[c_it].coordinates.length) {
                return 'carmen:addressnumber[i] array must be equal to geometry.geometries[i] array';
            }

            if (doc.geometry.geometries[c_it].type !== 'MultiPoint') {
                return 'non-null carmen:addressnumbers must parallel with MultiPoint geometries in GeometryCollection';
            }

            for (var addr_it = 0; addr_it < doc.properties['carmen:addressnumber'][c_it].length; addr_it++) {
                doc.properties['carmen:addressnumber'][c_it][addr_it] =
                    typeof doc.properties['carmen:addressnumber'][c_it][addr_it] === 'string' ?
                    doc.properties['carmen:addressnumber'][c_it][addr_it].toLowerCase() :
                    doc.properties['carmen:addressnumber'][c_it][addr_it];
            }
        }
    }

    //All ITP (like PT) are converted to GeometryCollections internally
    if (doc.properties['carmen:rangetype'] && doc.geometry) {
        if (doc.geometry.type === 'LineString' || doc.geometry.type === 'MultiLineString') {
            ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                doc.properties['carmen:'+type] = doc.geometry.type === 'LineString' ?  [[doc.properties['carmen:'+type]]] : [doc.properties['carmen:'+type]];
            });

            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiLineString',
                    coordinates: doc.geometry.type === 'LineString' ? [doc.geometry.coordinates] : doc.geometry.coordinates
                }]
            }
        } else if (doc.geometry.type !== 'GeometryCollection') {
            return 'ITP results must be a LineString, MultiLineString, or GeometryCollection';
        }

        for (c_it = 0; c_it < doc.geometry.geometries.length; c_it++) {
            if (doc.geometry.geometries[c_it].type === 'LineString') return 'ITP geometries in a GeometryCollection must be MultiLineStrings';

            ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                doc.properties['carmen:'+type][c_it] = doc.properties['carmen:'+type][c_it] ? doc.properties['carmen:'+type][c_it] : [];
            });
        }
    }

    return doc;
}

//Old syle documents use a flat heiarchy - transform them into geojson
function transform(feat) {
    var keys = Object.keys(feat);
    var l = keys.length
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
                type: 'GeometryCollection',
                geometries: [{
                    type: "MultiPoint",
                    coordinates: []
                }]
            }
            var cluster = typeof feat._cluster === 'string' ? JSON.parse(feat._cluster) : feat._cluster;
            doc.properties['carmen:addressnumber'] = [[]];
            var addresses = Object.keys(cluster);
            for (var i = 0; i < addresses.length; i++) {
                var coord = typeof cluster[addresses[i]] === 'string' ? JSON.parse(cluster[addresses[i]]).coordinates : cluster[addresses[i]].coordinates;
                doc.geometry.geometries[0].coordinates.push(coord);
                doc.properties['carmen:addressnumber'][0].push(addresses[i]);
            }
        } else if (keys[l] === '_bbox') {
            doc.bbox = feat._bbox;
        } else if (keys[l].indexOf('_') === 0) {
            doc.properties[keys[l].replace('_', 'carmen:')] = feat[keys[l]];
        } else {
            doc.properties[keys[l]] = feat[keys[l]];
        }
    }

    if (doc.properties['carmen:rangetype']) {
        doc.properties['carmen:parityl'] = [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:parityl'] : [doc.properties['carmen:parityl']] ]
        doc.properties['carmen:parityr'] = [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:parityr'] : [doc.properties['carmen:parityr']]]
        doc.properties['carmen:lfromhn'] = [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:lfromhn'] : [doc.properties['carmen:lfromhn']]]
        doc.properties['carmen:ltohn'] =   [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:ltohn'] : [doc.properties['carmen:ltohn']]]
        doc.properties['carmen:rfromhn'] = [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:rfromhn'] : [doc.properties['carmen:rfromhn']]]
        doc.properties['carmen:rtohn'] =   [ doc.geometry.type === 'MultiLineString' ? doc.properties['carmen:rtohn'] : [doc.properties['carmen:rtohn']]]

        doc.geometry = {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: doc.geometry.type === 'MultiLineString' ? doc.geometry.coordinates : [doc.geometry.coordinates]
            }]
        }
    }

    if (!doc.geometry && feat._zxy) {
        var zxys = []
        for (var j = 0; j < feat._zxy.length; j++) {
            var zxy = feat._zxy[j].split('/');
            zxy[0] = parseInt(zxy[0],10);
            zxy[1] = parseInt(zxy[1],10);
            zxy[2] = parseInt(zxy[2],10);
            zxys.push(zxy)
        }

        var k = zxys.length;
        while (k--) {
            zxys[k] = tilebelt.tileToGeoJSON([zxys[k][1], zxys[k][2], zxys[k][0]]).coordinates;
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
            loaded[id] = geobuf.decode(new Pbf(Buffer(loaded[id], 'base64')));

            if (loaded[id]._text) { loaded[id] = transform(loaded[id]); }
            else {
                loaded[id] = addrTransform(loaded[id]);
                if (typeof loaded[id] === 'string') return callback(loaded[id]);
            }

            if (loaded[id].properties['carmen:zxy'].indexOf(zxy) === -1) continue;
            feature = loaded[id];
            break;
        }

        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, cover.id, source.id);
            return callback();
        }

        if (!feature.properties['carmen:center'] && feature.geometry.type === 'Point') {
            feature.properties['carmen:center'] = feature.geometry.coordinates;
        }

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

        feature = geobuf.decode(new Pbf(Buffer(loaded[id], 'base64')));

        if (feature._text) { feature = transform(feature); }
        else {
            feature = addrTransform(feature);
            if (typeof feature === 'string') return callback(feature);
        }

        if (!feature.properties['carmen:center']) {
            feature.properties['carmen:center'] = feature.geometry.coordinates;
        }

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
        else { feature = addrTransform(feature); }

        return callback(null, feature);
    });
}

function putFeatures(source, docs, callback) {
    var byshard = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        if (doc._text) doc = transform(doc);
        else {
            doc = addrTransform(doc);
            if (typeof doc === 'string') return callback(doc);
        }

        if (!doc.properties['carmen:zxy']) {
            var tiles = cover.tiles(doc.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom});
            doc.properties['carmen:zxy'] = [];
            tiles.forEach(function(tile) {
                doc.properties['carmen:zxy'].push(tile[2]+'/'+tile[0]+'/'+tile[1]);
            });
        }
        var sh = termops.feature(doc.id);
        byshard[sh] = byshard[sh] || [];
        byshard[sh].push(doc);
    }
    var q = queue(100);
    for (var s in byshard) q.defer(function(s, docs, callback) {
        source.getGeocoderData('feature', s, function(err, buffer) {
            if (err) return callback(err);
            var current;
            try {
                current = buffer && buffer.length ? JSON.parse(buffer) : {};
            } catch (err) {
                return callback(err);
            }
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];

                // Strip temporary indexing attributes from feature docs.
                if (!doc.geometry) {
                    doc.geometry = {
                        type: 'Point',
                        coordinates: doc.properties['carmen:center']
                    }
                    delete doc.properties['carmen:center'];
                }
                delete doc.properties['carmen:hash'];
                delete doc.properties['carmen:grid'];

                current[doc.id] = Buffer(geobuf.encode(doc, new Pbf())).toString('base64');
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
