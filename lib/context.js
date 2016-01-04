var mp25 = Math.pow(2,25);
var zlib = require('zlib'),
    SphericalMercator = require('sphericalmercator'),
    mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    Locking = require('locking'),
    addressCluster = require('./pure/addresscluster'),
    applyaddress = require('./pure/applyaddress'),
    distance = require('turf-distance'),
    point = require('turf-point'),
    cover = require('tile-cover');
var sm = new SphericalMercator({
    size: 256
});

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
    var limit = options.limit || false;

    index_ids = index_ids.slice(0, maxidx);

    if (limit && (!options.types || options.types.length !== 1)) return callback('limit can only be used with a single type for reverse geocodes');

    // No-op context.
    if (!index_ids.length) return callback(null, context);

    var q = queue();

    for (index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        var source = indexes[index_ids[index_ids_it]];
        var bounds = source.bounds;

        if (lat >= bounds[1] && lat <= bounds[3] && lon >= bounds[0] && lon <= bounds[2]) {
            //Setting the limit/type results in only the first level results being returned.
            if (limit) {
                if (options.types[0] !== source.type) continue;
                q.defer(proximityVector, source, lon, lat);
            } else {
                q.defer(contextVector, source, lon, lat, full, matched, language);
            }
        }
    }

    if (limit) {
        q.awaitAll(proximityFormatter);
    } else {
        q.awaitAll(contextFormatter);
    }

    function proximityFormatter(err, res) {
        if (err) return callback(err);

        var combined = [];
        for (var res_it = 0; res_it < res.length; res_it++) {
            combined = combined.concat(res[res_it]);
        }
        var results = combined.sort(function(a, b) {
            if (a.distance > b.distance) return 1;
            if (a.distance < b.distance) return -1;
        }).slice(0, options.limit).filter(function(a) {
            if (a) return a;
        });

        var query = point([lon, lat]);

        var combined = [];
        for (var results_it = 0; results_it < results.length; results_it++) {
            var attr = results[results_it].attributes();
            if ((source.data && source.data.geocoder_version) < 5 || attr._text) { attr = feature.transform(attr); }
            attr.id = attr.id || results[results_it].id();
            if ((attr["carmen:score"] || (attr.properties && attr.properties["carmen:score"])) < 0) continue;

            if (attr['carmen:addressnumber']) {
                var geom = JSON.parse(results[results_it].geometry().toJSON());
                for (var geom_it = 0; geom_it < geom.coordinates.length; geom_it++) {
                    attr['carmen:geom'] = sm.inverse(geom.coordinates[geom_it]);
                    attr['carmen:proxdistance'] = distance(query, point(attr['carmen:geom']), 'miles');
                    combined.push(JSON.parse(JSON.stringify(attr)));
                }
            } else {
                var coords = attr['carmen:center'][0] === '[' ?
                    JSON.parse(attr['carmen:center']) :
                    attr['carmen:center'].split(',');
                attr['carmen:geom'] = [parseFloat(coords[0]), parseFloat(coords[1])];
                attr['carmen:proxdistance'] = distance(query, point(attr['carmen:geom']), 'miles');
                combined.push(attr);
            }
        }

        combined = combined.sort(function(a, b) {
            if (a['carmen:proxdistance'] > b['carmen:proxdistance']) return 1;
            if (a['carmen:proxdistance'] < b['carmen:proxdistance']) return -1;
        }).slice(0, options.limit);

        return callback(null, combined);
    }

    function contextFormatter(err, res) {
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

            //Filter context results by type
            if (toFilter) {
                var filter = true;
                if (options.types && options.types.indexOf(type) === -1) filter = false;
                for (var j = 0; j < filterStack.length; j++) {
                    if (options.stacks && options.stacks.indexOf(filterStack[j]) === -1) filter = false;
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

                        var replaceType = replaceSource.type;
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
        for (var i = 0; i < types.length; i++) {
            stack.push(memo[types[i]]);
        }
        callback(null, stack);
    }
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
getTile.setVtCacheSize = function(size) {
    getTile.cache.max = size;
}

module.exports.getTile = getTile;
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

//For a given type & limit load each source of that type, gather n results
//and return results in a flat array. (No context is returned)
function proximityVector(source, lon, lat, callback) {
    tileCover(source, lon, lat, query);

    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, false);

        // Uses a 1000m (web mercator units tol)
        vt.query(lon, lat, {
            tolerance: 1000,
            layer: source.geocoder_layer
        }, function(err, results) {
            if (err) return callback(err);
            if (!results || !results.length) return callback(null, false );

            return callback(null, results);
        });
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
    var dbname = source.name;
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
        if (source.geocoder_address && loaded.properties['carmen:addressnumber'])
            loaded = addressCluster.reverse(loaded, query);
        else if (source.geocoder_address && loaded.properties['carmen:rangetype'])
            loaded = applyaddress.reverse(loaded, query);
        return callback(null, loaded);
    });
}
