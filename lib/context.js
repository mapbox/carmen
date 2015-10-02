var mp25 = Math.pow(2,25);
var zlib = require('zlib'),
    mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    Locking = require('locking'),
    addressCluster = require('./pure/addresscluster'),
    applyaddress = require('./pure/applyaddress');
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
    var types = Object.keys(indexes);
    var maxidx = typeof options.maxidx === 'number' ? options.maxidx : types.length;
    var full = options.full || false;
    var matched = options.matched || {};

    types = types.slice(0, maxidx);

    // No-op context.
    if (!types.length) return callback(null, context);

    var q = queue();
    types.forEach(function(type) {
        var source = indexes[type];
        var bounds = source._geocoder.bounds;

        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2])
            q.defer(contextVector, source, lon, lat, full, matched);
    });

    q.awaitAll(function(err, res) {
        if (err) return callback(err);
        var stack = [];
        var memo = {};

        res = res.reverse();
        for (var i = 0; i < res.length; i++) {
            if (!res[i]) continue;
            var name = res[i].properties['carmen:extid'].split('.')[0];
            if (memo[name]) continue;
            memo[name] = true;
            stack.push(res[i]);
        }

        callback(null, stack);
    });
};

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

        zlib[compression](zpbf, function(err, pbf) {
            if (err) return unlock(err);
            if (pbf.length === 0) return unlock(null, false);
            var vt = new mapnik.VectorTile(z, x, y);
            vt.byteSize = pbf.length;
            vt.setData(pbf, function(err) {
                if (err) return unlock(err);
                vt.parse(function(err) {
                    if (err) return unlock(err);
                    return unlock(null, vt);
                });
            });
        });
    });
}, { max: 1024 });

module.exports.getTile = getTile;
module.exports.contextVector = contextVector;

// For each context type, load a representative tile, look around the
// pixel we've identified, and if we find a feature, add it to the `context`
// array under an array index that represents the position of the context
// in imaginary z-space (country, town, place, etc). When there are no more
// to do, return that array, filtered of nulls and reversed.
function contextVector(source, lon, lat, full, matched, callback) {
    var tiles = cover.tiles({
        type: 'Point',
        coordinates: [lon,lat]
    }, {
        min_zoom: source._geocoder.maxzoom,
        max_zoom: source._geocoder.maxzoom
    });
    var options = {
        source: source,
        z: source._geocoder.maxzoom,
        x: tiles[0][0],
        y: tiles[0][1]
    };
    options.toJSON = function() {
        return source._geocoder.id + ':' + options.z + '/' + options.x + '/' + options.y;
    };
    getTile(options, query);

    // For a loaded vector tile, query for features at the lon,lat.
    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, false);

        // Uses a 1000m (web mercator units) tolerance.
        vt.query(lon, lat, {
            tolerance: 1000,
            layer: source._geocoder.geocoder_layer
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
                var tmpid = (source._geocoder.idx*mp25) + termops.feature(attr.id);
                if ((attr["carmen:score"] || (attr.properties && attr.properties["carmen:score"])) < 0 && !matched[tmpid]) continue;

                feat = attr;
                dist = results[i].distance;
                if (matched[tmpid]) break;
            }
            if (feat) {
                return loadFeature(source, feat, full, [lon,lat], callback);
            // No matching features found.
            } else {
                return callback(null, false);
            }
        });
    }
}

// Load the full feature from geocoding data if needed, otherwise create
// a light reference with id + text.
function loadFeature(source, feat, full, query, callback) {
    var dbname = source._geocoder.name;
    var dbidx = source._geocoder.idx;
    if (!full) {
        var loaded = { properties: {} };
        loaded.properties['carmen:extid'] = dbname + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (dbidx*mp25) + termops.feature(feat.id);
        loaded.properties['carmen:dbidx'] = dbidx;
        loaded.properties['carmen:text'] = feat['carmen:text'] || feat.properties['carmen:text'] || feat.properties.name || feat.properties.search;
        return callback(null, loaded.properties['carmen:text'] ? loaded : false);
    }

    feature.getFeatureById(source, feat.id, function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) return callback();
        loaded.properties['carmen:extid'] = dbname + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (dbidx*mp25) + termops.feature(feat.id);
        loaded.properties['carmen:dbidx'] = dbidx;
        if (source._geocoder.geocoder_address && loaded.properties['carmen:addressnumber'])
            loaded = addressCluster.reverse(loaded, query);
        else if (source._geocoder.geocoder_address && loaded.properties['carmen:rangetype'])
            loaded = applyaddress.reverse(loaded, query);
        return callback(null, loaded);
    });
}
