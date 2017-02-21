var mp25 = Math.pow(2,25);
var mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    queue = require('d3-queue').queue,
    Locking = require('@mapbox/locking'),
    addressCluster = require('./pure/addresscluster'),
    addressItp = require('./pure/addressitp');
var cover = require('tile-cover');
var proximity = require('./util/proximity');

// Returns a hierarchy of features ("context") for a given lon, lat pair.
//
// This is used for reverse geocoding: given a point, it returns possible
// regions that contain it.
//
// @param {Object} geocoder: geocoder instance
// @param {Array} position: [lon, lat]
// @param {Object} options: optional options object
// @param {Function} callback
module.exports = function(geocoder, position, options, callback) {
    options = options || {};

    var context = [];
    var indexes = geocoder.indexes;
    var index_ids = Object.keys(indexes);
    var maxidx = typeof options.maxidx === 'number' ? options.maxidx : index_ids.length;
    var full = options.full || false;
    var matched = options.matched || {};
    var language = options.language || false;
    var subtypeLookup = getSubtypeLookup(options.types || []);

    index_ids = index_ids.slice(0, maxidx);

    // No-op context.
    if (!index_ids.length) return callback(null, context);

    var q = queue();

    var lon = position[0];
    var lat = position[1];

    for (var index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        var source = indexes[index_ids[index_ids_it]];
        var bounds = source.bounds;
        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2]) {

            // calculate score range for this index, if:
            // - context call is associated w/ a reverse geocode
            // - we are filtering on the parent type (eg poi)
            // - there is a scorerange entry on this index for the child type (eg landmark)
            var scoreRange = false;
            if (options.full && subtypeLookup[source.type] && source.scoreranges[subtypeLookup[source.type]])
                scoreRange = [
                    source.scoreranges[subtypeLookup[source.type]][0] * source.maxscore,
                    source.scoreranges[subtypeLookup[source.type]][1] * source.maxscore
                ];

            // targetFeature = look for specific feature as top-most
            // * lower-level indexes must still be queried for context
            //   but should not be told to look for the target feature
            // * indexes near the top which have the same type
            //   as but are not the target feature index should be skipped
            var exclusiveMatched = false;
            if (options.targetFeature && (source.type === indexes[index_ids[index_ids.length - 1]].type)) {
                // if we have a target feature, only query the index containing it + its parents
                if (source.id !== options.targetFeature[0]) continue;
                exclusiveMatched = { _exclusive: true };
                exclusiveMatched[options.targetFeature[1]] = true;
            }

            q.defer(contextVector, source, lon, lat, full, exclusiveMatched || matched, language, scoreRange);
        }
    }

    q.awaitAll(function(err, loaded) {
        if (err) return callback(err);
        return callback(null, stackFeatures(geocoder, loaded, options));
    });
};

// convenience object for checking type filter for entries like poi.landmark
// type filter + subtype filter (eg poi + poi.landmark) should filter
// for the union set
function getSubtypeLookup(types) {
    var subtypeLookup = {};
    for (var type_i = 0; type_i < types.length; type_i++) {
        var splitType = types[type_i].split('.');
        if ((splitType.length === 2) && !subtypeLookup[splitType[0]])
            subtypeLookup[splitType[0]] = splitType[1];
        else
            subtypeLookup[splitType[0]] = true;
    }
    return subtypeLookup;
}

function stackFeatures(geocoder, loaded, options) {
    if (!loaded.length) return [];

    var context = [];
    var memo = {};
    var firstType = false;

    loaded = loaded.reverse();

    var subtypeLookup = getSubtypeLookup(options.types || []);

    for (var i = 0; i < loaded.length; i++) {
        if (!loaded[i]) continue;

        var feature = loaded[i];
        var stack = feature.properties['carmen:stack'];

        for (var l = feature.properties['carmen:types'].length - 1; l >= 0; l--) {
            var type = feature.properties['carmen:types'][l];
            var conflict = feature.properties['carmen:conflict'] || type;

            // Disallow shifting a feature's type to occupy the maxtype
            // The maxtype is set on forward geocodes by the matched feature
            // in verifyMatch. Since it's not part of the context loading
            // process it's a type that must be additionally accounted for.
            if (options.maxtype && options.maxtype === type) continue;

            if (options.full && !firstType) {
                // Filter context results by stack
                if (options.stacks && stack && Array.isArray(stack)) {
                    if (stack.filter(function(i) {
                        return options.stacks.indexOf(i) !== -1;
                    }).length === 0) break;
                }
                // Filter context results by type
                if (options.types && !subtypeLookup[type]) {
                    continue;
                }
            }

            if (memo[type] === undefined) {
                memo[type] = feature;
                memo[conflict] = feature;
                if (!firstType) firstType = type;
                // Reconstruct extid based on selected type
                feature.properties['carmen:extid'] = type + '.' + feature.properties['carmen:extid'].split('.').pop();
                break;
            } else if (memo[type] && loaded[i].properties['carmen:geomtype'] !== 3) {
                // Don't replace a stacked feature that is closer to the queried point
                if (feature.properties['carmen:vtquerydist'] >= memo[type].properties['carmen:vtquerydist']) continue;

                // A conflicting feature cannot bump out a wanted type
                if (options.full && options.types && !subtypeLookup[type]) continue;

                // Remove all references to previously stacked feature
                for (var b in memo) if (memo[b] === memo[type]) delete memo[b];
                // Stack new feature
                memo[type] = feature;
                memo[conflict] = feature;
                // Reconstruct extid based on selected type
                feature.properties['carmen:extid'] = type + '.' + feature.properties['carmen:extid'].split('.').pop();
                break;
            }
        }
    }

    var types = Object.keys(memo);
    for (var k = 0; k < types.length; k++) {
        var toAdd = memo[types[k]];
        if (!toAdd) continue;
        if (context.indexOf(toAdd) !== -1) continue;

        // Strip out context-logic properties for now
        delete toAdd.properties['carmen:stack'];
        delete toAdd.properties['carmen:conflict'];

        context.push(toAdd);
    }

    return context;
}

// Returns an array of lon, lat pairs of features closest to the query point.
// This is used as a first pass when reverse geocoding multiple results when limit
// type is set. Each point is then reverse geocoded separately.
//
// @param {Object} geocoder: geocoder instance
// @param {Float} lon: input longitude
// @param {Float} lat: input latitude
// @param {String} type: source type
// @param {Number} limit: number of points to return
// @param {Function} callback
function nearest(geocoder, lon, lat, type, limit, callback) {
    var indexes = geocoder.indexes;
    var index_ids = Object.keys(indexes);
    var q = queue();

    var typeSplit = type.split('.');
    type = typeSplit[0];

    for (var index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        var source = indexes[index_ids[index_ids_it]];
        var bounds = source.bounds;

        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2]) {
            if (type !== source.type) continue;

            var scoreFilter = false;
            if (typeSplit.length === 2 && source.scoreranges && source.scoreranges[typeSplit[1]]) {
                scoreFilter = [
                    source.scoreranges[typeSplit[1]][0] * source.maxscore,
                    source.scoreranges[typeSplit[1]][1] * source.maxscore
                ];
            }

            q.defer(nearestPoints, source, lon, lat, scoreFilter);
        }
    }

    q.awaitAll(function(err, res) {
        if (err) return callback(err);
        var combined = [];
        for (var res_it = 0; res_it < res.length; res_it++) {
            combined = combined.concat(res[res_it]);
        }
        combined.sort(function(a, b) { return a.distance - b.distance; });
        combined = combined.slice(0, limit);
        return callback(null, combined);
    });
}

var getTile = Locking(function(options, unlock) {
    var source = options.source;
    var z = parseInt(options.z,10);
    var x = parseInt(options.x,10);
    var y = parseInt(options.y,10);
    source.getTile(z, x, y, function(err, zpbf) {
        if (err && err.message !== 'Tile does not exist') return unlock(err);
        if (!zpbf) return unlock(null, false);

        var compression = false;
        if (zpbf[0] == 0x78 && zpbf[1] == 0x9C) {
            compression = 'inflate';
        } else if (zpbf[0] == 0x1F && zpbf[1] == 0x8B) {
            compression = 'gunzip';
        }
        if (!compression) return unlock(new Error('Could not detect compression of vector tile'));

        var vt = new mapnik.VectorTile(z, x, y);
        vt.setData(zpbf,function(err) {
            if (err) return unlock(err);
            if (vt.empty()) return unlock(null, false);
            return unlock(null, vt);
        })
    });
}, { max: 1024 });
getTile.setVtCacheSize = function(size) {
    getTile.cache.max = size;
}

module.exports.getTile = getTile;
module.exports.nearest = nearest;
module.exports.nearestPoints = nearestPoints;
module.exports.contextVector = contextVector;
module.exports.stackFeatures = stackFeatures;

function tileCover(source, lon, lat, cb) {
    var tiles = cover.tiles({
        type: 'Point',
        coordinates: [lon,lat]
    }, {
        min_zoom: source.maxzoom,
        max_zoom: source.maxzoom
    });
    var options = {
        source: source,
        z: source.maxzoom,
        x: tiles[0][0],
        y: tiles[0][1]
    };
    options.toJSON = function() {
        return source.id + ':' + options.z + '/' + options.x + '/' + options.y;
    };
    getTile(options, cb);
}

// For a source return an array of nearest feature hit points/center points as
// a flat array of lon,lat coordinates.
function nearestPoints(source, lon, lat, scoreFilter, callback) {
    tileCover(source, lon, lat, query);

    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, []);

        // Uses a 1000m (web mercator units tol)
        vt.query(lon, lat, {
            tolerance: 1000,
            layer: source.geocoder_layer
        }, afterQuery);
    }

    function afterQuery(err, results) {
        if (err) return callback(err);
        if (!results || !results.length) return callback(null, []);

        var loaded = [];
        for (var results_it = 0; results_it < results.length; results_it++) {
            var result = results[results_it];
            var attr = result.attributes();

            var score = attr['carmen:score'];
            if (score === undefined) score = 0;
            if (score < 0) continue;
            if (scoreFilter && (score <= scoreFilter[0] || score > scoreFilter[1])) continue;

            var hit;
            if (result.x_hit) {
                hit = [result.x_hit, result.y_hit];
                hit.distance = result.distance;
                hit.source_id = source.id;
                hit.tmpid = (source.idx*mp25) + termops.feature(attr.id);
            } else if (attr['carmen:center']) {
                hit = attr['carmen:center'][0] === '[' ?
                    JSON.parse(attr['carmen:center']) :
                    attr['carmen:center'].split(',');
                hit[0] = parseFloat(hit[0]);
                hit[1] = parseFloat(hit[1]);
                hit.distance = result.distance;
                attr.id = attr.id || result.id();
                hit.source_id = source.id;
                hit.tmpid = (source.idx*mp25) + termops.feature(attr.id);
            }
            if (hit) loaded.push(hit);
        }

        return callback(null, loaded);
    }
}

// For each context type, load a representative tile, look around the
// pixel we've identified, and if we find a feature, add it to the `context`
// array under an array index that represents the position of the context
// in imaginary z-space (country, town, place, etc). When there are no more
// to do, return that array, filtered of nulls and reversed.
function contextVector(source, lon, lat, full, matched, language, scoreFilter, callback) {

    tileCover(source, lon, lat, query);

    // For a loaded vector tile, query for features at the lon,lat.
    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, false);

        // Uses a 1000m (web mercator units) tolerance.
        vt.query(lon, lat, {
            tolerance: 1000,
            layer: source.geocoder_layer
        }, function(err, results) {
            if (err) return callback(err);
            if (!results || !results.length) return callback(null, false);
            var feat;
            var dist = Infinity;

            results = results.sort(sortByDistScore);

            // Grab the feature with the lowest distance + lowest id.
            // Ensures context has stable behavior even when features
            // are equidistant to the query point.
            //
            // Exclude features with a negative score.
            // Exclude features with a distance > tolerance (not yet
            // enforced upstream in mapnik).
            for (var i = 0; i < results.length; i++) {
                if (results[i].distance > 1000) continue;
                if (results[i].distance > dist) continue;

                var attr = results[i].attributes();

                // If geojson has an id in properties use that otherwise use VT id
                attr.id = attr.id || results[i].id();
                if (feat && attr.id > feat.id) continue;

                var tmpid = (source.idx*mp25) + termops.feature(attr.id);

                // if in exclusive match mode, only settle for specified tmpid
                if (matched._exclusive) {
                    if (matched[tmpid]) {
                        attr['carmen:vtquerydist'] = results[i].distance;
                        attr['carmen:geomtype'] = results[i].geometry().type();
                        feat = attr;
                        break;
                    }
                    else {
                        continue;
                    }
                }

                // If this feature has a score < 0 ("ghost" feature), skip
                // it unless it has a scored Relev object as part of a
                // forward phrasematch.
                var score = attr["carmen:score"] || (attr.properties && attr.properties["carmen:score"]);
                if (score === undefined) score = 0;
                if (score < 0 && !matched[tmpid]) continue;

                // scorefilter, if set
                if (scoreFilter && (score <= scoreFilter[0] || score > scoreFilter[1])) continue;

                attr['carmen:vtquerydist'] = results[i].distance;
                attr['carmen:geomtype'] = results[i].geometry().type();

                feat = attr;
                dist = results[i].distance;
                if (matched[tmpid]) break;
            }
            if (feat && full) {
                return fullFeature(source, feat, [lon,lat], callback);
            } else if (feat) {
                return lightFeature(source, feat, callback);
            // No matching features found.
            } else {
                return callback(null, false);
            }
        });
    }
}

// Go from VT query attributes to a geojson-like feature
function lightFeature(source, feat, callback) {
    if (!feat['carmen:text']) return callback(null, false);

    var loaded = { properties: Object.assign({}, feat) };
    delete loaded.properties.id;
    loaded.properties['carmen:extid'] = source.type + '.' + feat.id;
    loaded.properties['carmen:tmpid'] = (source.idx*mp25) + termops.feature(feat.id);
    loaded.properties['carmen:index'] = source.id;
    loaded.properties['carmen:stack'] = source.stack;
    loaded.properties['carmen:conflict'] = source.name !== source.type ? source.name : undefined;

    // Convert types, center attributes from serialized strings to real values.
    if (typeof loaded.properties['carmen:types'] === 'string') {
        loaded.properties['carmen:types'] = loaded.properties['carmen:types'][0] === '[' ?
            JSON.parse(loaded.properties['carmen:types']) :
            loaded.properties['carmen:types'].split(',');
    }
    if (typeof loaded.properties['carmen:center'] === 'string') {
        loaded.properties['carmen:center'] = loaded.properties['carmen:center'][0] === '[' ?
            JSON.parse(loaded.properties['carmen:center']) :
            loaded.properties['carmen:center'].split(',');
        loaded.properties['carmen:center'][0] = parseFloat(loaded.properties['carmen:center'][0]);
        loaded.properties['carmen:center'][1] = parseFloat(loaded.properties['carmen:center'][1]);
    }

    try {
        loaded = feature.normalize(source, loaded);
    } catch (err) {
        return callback(err);
    }

    return callback(null, loaded);
}

// Go from VT query attributes to a fully loaded feature
function fullFeature(source, feat, query, callback) {
    feature.getFeatureById(source, feat.id, function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) return callback();
        loaded.properties['carmen:extid'] = source.type + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (source.idx*mp25) + termops.feature(feat.id);
        loaded.properties['carmen:vtquerydist'] = feat['carmen:vtquerydist'];
        loaded.properties['carmen:geomtype'] = feat['carmen:geomtype'];
        loaded.properties['carmen:stack'] = source.stack;
        loaded.properties['carmen:conflict'] = source.name !== source.type ? source.name : undefined;

        var hasAddr = false;
        if (source.geocoder_address && loaded.properties['carmen:addressnumber']) {
            var addr = addressCluster.reverse(loaded, query);
            if (addr) {
                hasAddr = true;
                loaded = addr;
            }
        }

        if (!hasAddr && source.geocoder_address && loaded.properties['carmen:rangetype']) {
            loaded = addressItp.reverse(loaded, query);
        }

        return callback(null, loaded);
    });
}

function sortByDistScore(a, b) {
    var attr_a = a.attributes();
    var attr_b = b.attributes();

    var a_dist = a.distance;
    var b_dist = b.distance;

    var a_score = attr_a['carmen:score'];
    var b_score = attr_b['carmen:score'];

    var a_distscore = proximity.distscore(a_dist, a_score);
    var b_distscore = proximity.distscore(b_dist, b_score);
    return a_score < b_score;

}