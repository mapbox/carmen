var mp25 = Math.pow(2,25);
var mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    queue = require('d3-queue').queue,
    Locking = require('locking'),
    addressCluster = require('./pure/addresscluster'),
    addressItp = require('./pure/addressitp');
var cover = require('tile-cover');

// Returns a hierarchy of features ("context") for a given lon, lat pair.
//
// This is used for reverse geocoding: given a point, it returns possible
// regions that contain it.
//
// @param {Object} geocoder: geocoder instance
// @param {Float} lon: input longitude
// @param {Float} lat: input latitude
// @param {Object} options: optional options object
// @param {Function} callback
module.exports = function(geocoder, lon, lat, options, callback) {
    options = options || {};

    var context = [];
    var indexes = geocoder.indexes;
    var index_ids = Object.keys(indexes);
    var maxidx = typeof options.maxidx === 'number' ? options.maxidx : index_ids.length;
    var full = options.full || false;
    var matched = options.matched || {};
    var language = options.language || false;

    index_ids = index_ids.slice(0, maxidx);

    // No-op context.
    if (!index_ids.length) return callback(null, context);

    var q = queue();

    for (var index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        var source = indexes[index_ids[index_ids_it]];
        var bounds = source.bounds;
        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2]) {
            q.defer(contextVector, source, lon, lat, full, matched, language);
        }
    }

    q.awaitAll(function(err, res) {
        if (err) return callback(err);
        var stack = [];
        var memo = {};

        res = res.reverse();

        var toFilter = options.full || false; //Only filter for reverse geocodes
        for (var i = 0; i < res.length; i++) {
            if (!res[i]) continue;

            var idx = res[i].properties['carmen:dbidx'];
            var source = geocoder.byidx[idx];

            // Currently unclear why this might be undefined.
            // For now, catch and return error to try to learn more.
            if (!source) return callback(new Error('Misuse: source undefined for idx ' + idx));

            var name = source.name;
            var type = source.type;
            var filterStack = source.stack;

            if (toFilter) {
                var filter = true;
                // Filter context results by type
                if (options.types && options.types.indexOf(type) === -1) filter = false;
                // Filter context results by stack
                if (filter && options.stacks && filterStack && Array.isArray(filterStack)) {
                    matched = filterStack.filter(function(i) {
                        return options.stacks.indexOf(i) !== -1;
                    });
                    if (matched.length === 0) filter = false;
                }

                if (!filter) continue;
                else toFilter = false;
            }

            if (memo[name] && res[i].properties['carmen:geomtype'] !== 3) {
                if (res[i].properties['carmen:vtquerydist'] < memo[name].properties['carmen:vtquerydist']) {
                    //A geoocoder_name merged index cannot bump out a wanted type
                    if (options.full && options.types && options.types.indexOf(type) === -1) {
                        var replaceIdx = memo[name].properties['carmen:dbidx'];
                        var replaceSource = geocoder.byidx[replaceIdx];

                        // Currently unclear why this might be undefined.
                        // For now, catch and return error to try to learn more.
                        if (!replaceSource) return callback(new Error('Misuse: source undefined for idx ' + replaceIdx));

                        var replaceName = replaceSource.name;
                        if (replaceName !== name) memo[name] = res[i];

                    } else {
                        memo[name] = res[i];
                    }
                }
            } else if (!memo[name]) {
                memo[name] = res[i];
            }
        }
        var types = Object.keys(memo);
        for (var k = 0; k < types.length; k++) {
            stack.push(memo[types[k]]);
        }
        callback(null, stack);
    });
};

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

    for (var index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        var source = indexes[index_ids[index_ids_it]];
        var bounds = source.bounds;
        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2]) {
            if (type !== source.type) continue;
            q.defer(nearestPoints, source, lon, lat);
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
function nearestPoints(source, lon, lat, callback) {
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
            if ((attr['carmen:score'] || (attr.properties && attr.properties['carmen:score'])) < 0) continue;
            var hit;
            if (result.x_hit) {
                hit = [result.x_hit, result.y_hit];
                hit.distance = result.distance;
            } else if (attr['carmen:center']) {
                hit = attr['carmen:center'][0] === '[' ?
                    JSON.parse(attr['carmen:center']) :
                    attr['carmen:center'].split(',');
                hit[0] = parseFloat(hit[0]);
                hit[1] = parseFloat(hit[1]);
                hit.distance = result.distance;
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
function contextVector(source, lon, lat, full, matched, language, callback) {
    tileCover(source, lon, lat, query)

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

                if ((source.data && source.data.geocoder_version) < 5 || attr._text) { attr = feature.transform(attr); }

                // If geojson has an id in properties use that otherwise use VT id
                attr.id = attr.id || results[i].id();
                if (feat && attr.id > feat.id) continue;
                // If this feature has a score < 0 ("ghost" feature), skip
                // it unless it has a scored Relev object as part of a
                // forward phrasematch.
                var tmpid = (source.idx*mp25) + termops.feature(attr.id);
                if ((attr["carmen:score"] || (attr.properties && attr.properties["carmen:score"])) < 0 && !matched[tmpid]) continue;
                attr['carmen:vtquerydist'] = results[i].distance;
                attr['carmen:geomtype'] = results[i].geometry().type();

                feat = attr;
                dist = results[i].distance;
                if (matched[tmpid]) break;
            }
            if (feat) {
                return loadFeature(source, feat, full, [lon,lat], language, callback);
            // No matching features found.
            } else {
                return callback(null, false);
            }
        });
    }
}

// Load the full feature from geocoding data if needed, otherwise create
// a light reference with id + text.
function loadFeature(source, feat, full, query, language, callback) {
    var dbidx = source.idx;
    var dbtype = source.type;

    if (!full) {
        var properties = feat.properties || feat;
        var loaded = { properties: {} };
        loaded.properties['carmen:extid'] = dbtype + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (dbidx*mp25) + termops.feature(feat.id);
        loaded.properties['carmen:dbidx'] = dbidx;
        loaded.properties['carmen:vtquerydist'] = feat['carmen:vtquerydist'];
        loaded.properties['carmen:geomtype'] = feat['carmen:geomtype'];
        if (properties['carmen:center']) {
            // Attempt to detect "lon,lat" or "[lon,lat]" -- some VT encoders
            // treat array properties differently when encoding.
            var coords = properties['carmen:center'][0] === '[' ?
                JSON.parse(properties['carmen:center']) :
                properties['carmen:center'].split(',');
            loaded.properties['carmen:center'] = [parseFloat(coords[0]), parseFloat(coords[1])];
        }
        if (language && properties['carmen:text_'+language]) {
            loaded.properties['carmen:text'] = properties['carmen:text_'+language];
            loaded.properties.language = language;
        } else {
            loaded.properties['carmen:text'] = properties['carmen:text'];
        }

        // copy non-carmen:* properties
        var propertyKeys = Object.keys(properties);
        for (var propi = 0; propi < propertyKeys.length; propi++) {
            if (!/^(carmen:|id$)/.test(propertyKeys[propi])) {
                loaded.properties[propertyKeys[propi]] = properties[propertyKeys[propi]];
            }
        }

        return callback(null, loaded.properties['carmen:text'] ? loaded : false);
    }
    feature.getFeatureById(source, feat.id, function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) return callback();
        loaded.properties['carmen:extid'] = dbtype + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (dbidx*mp25) + termops.feature(feat.id);
        loaded.properties['carmen:dbidx'] = dbidx;
        loaded.properties['carmen:vtquerydist'] = feat['carmen:vtquerydist'];
        loaded.properties['carmen:geomtype'] = feat['carmen:geomtype'];

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
