var zlib = require('zlib'),
    mapnik = require('mapnik'),
    termops = require('./util/termops'),
    feature = require('./util/feature'),
    ops = require('./util/ops'),
    sm = new (require('sphericalmercator'))(),
    queue = require('queue-async'),
    Locking = require('./util/locking');

// Not only do we scan the exact point matched by a latitude, longitude
// pair, we also hit the 8 points that surround it as a rectangle.
var scanDirections = [
    [0, 0], [0,-1], [0, 1],
    [-1,1], [-1,0], [-1,-1],
    [1,-1], [1, 0], [1, 1]
];

// Returns a hierarchy of features ("context") for a given lon, lat pair.
//
// This is used for reverse geocoding: given a point, it returns possible
// regions that contain it.
//
// @param {Object} geocoder: geocoder instance
// @param {Float} lon: input longitude
// @param {Float} lat: input latitude
// @param {String} maxtype: optional type of the most detailed feature to return
// @param {String} full: boolean of whether to do a full load of all features
// @param {Function} callback
module.exports = function(geocoder, lon, lat, maxtype, full, callback) {
    var context = [];
    var indexes = geocoder.indexes;
    var types = Object.keys(indexes);
    types = types.slice(0, maxtype ? types.indexOf(maxtype) : types.length);

    // No-op context.
    if (!types.length) return callback(null, context);

    var q = queue();
    types.forEach(function(type) {
        var source = indexes[type];
        var method = source._geocoder.format === 'pbf' ? contextVector : contextGrid;
        q.defer(method, source, lon, lat, full);
    });

    q.awaitAll(function(err, res) {
        if (err) return callback(err);
        res = res.reverse().filter(identity);
        callback(null, res);
    });
};

// For each context type, load a representative tile, look around the
// pixel we've identified, and if we find a feature, add it to the `context`
// array under an array index that represents the position of the context
// in imaginary z-space (country, town, place, etc). When there are no more
// to do, return that array, filtered of nulls and reversed.
function contextVector(source, lon, lat, full, callback) {
    var xyz = sm.xyz([lon, lat, lon, lat], source._geocoder.maxzoom);
    var z = source._geocoder.maxzoom;
    var x = xyz.minX;
    var y = xyz.minY;
    var id = source._geocoder.group || source._geocoder.id;
    var ckey = id + '/' + z + '/' + x + '/' + y;
    var lock = Locking(ckey, query);

    // Load the potential tile in which a match would occur.
    lock(function(unlock) {
        source.getTile(z, x, y, function(err, zpbf) {
            if (err && err.message !== 'Tile does not exist') return unlock(err);
            if (!zpbf) return unlock(null, false);
            zlib.inflate(zpbf, function(err, pbf) {
                if (err) return unlock(err);
                var vt = new mapnik.VectorTile(z, x, y);
                try {
                    vt.setData(pbf);
                } catch (err) {
                    return unlock(err);
                }
                vt.parse(function(err) {
                    if (err) return unlock(err);
                    return unlock(null, vt);
                });
            });
        });
    });

    // For a loaded vector tile, query for features at the lon,lat.
    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, false);

        // Uses a 50m (web mercator units) tolerance.
        var results = vt.query(lon, lat, {
            tolerance: source._geocoder.geocoder_vectortolerance,
            layer: source._geocoder.geocoder_layer
        }) || [];
        if (!results || !results.length) return callback(null, false);
        var attr = results[0].attributes();
        attr._id = results[0].id();
        return loadFeature(source, attr, full, callback);
    }
}

// Legacy UTF-grid equivalent.
function contextGrid(source, lon, lat, full, callback) {
    var xyz = sm.xyz([lon, lat, lon, lat], source._geocoder.maxzoom);
    var z = source._geocoder.maxzoom;
    var x = xyz.minX;
    var y = xyz.minY;
    var ckey = source._geocoder.id + '/' + z + '/' + x + '/' + y;
    var lock = Locking(ckey, query);

    // Load the potential tile in which a match would occur.
    lock(function(unlock) {
        source.getGrid(z, x, y, unlock);
    });

    // For a loaded UTFGrid, scan for a feature at lon,lat.
    function query(err, grid) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        if (grid) {
            // assume that UTFGrid standard resolution is used
            var resolution = 4,
                // calculate the pixel within the tile that we're looking for,
                // as an index into UTFGrid data.
                px = sm.px([lon,lat], z),
                y = Math.floor((px[1] % 256) / resolution),
                x = Math.floor((px[0] % 256) / resolution);

            var key, sx, sy;
            // Check both the pixel itself and the 8 surrounding directions
            for (var i = 0; i < scanDirections.length; i++) {
                sx = x + scanDirections[i][0];
                sy = y + scanDirections[i][1];
                sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                key = grid.keys[ops.resolveCode(grid.grid[sy].charCodeAt(sx))];
                var res = key && grid.data[key];
                // Massage grid data into usable context data.
                if (res) {
                    res._id = res._id || key;
                    return gridFeature(source, res, full, callback);
                }
            }
        }
        return callback(null, false);
    }
}

function gridFeature(source, feat, full, callback) {
    var type = source._geocoder.id;
    var loaded = {};
    loaded._extid = type + '.' + feat._id;
    loaded._fhash = type + '.' + termops.feature(feat._id);
    loaded._text = feat._text || feat.name || feat.search;
    loaded._legacy = true;

    if (!full) return callback(null, loaded._text ? loaded : false);

    for (var k in feat) loaded[k] = feat[k];
    if (loaded.score) loaded._score = parseFloat(loaded.score);
    if (loaded.bounds) loaded._bbox = loaded.bounds.split(',').map(function(v) { return parseFloat(v) });
    if ('lon' in loaded && 'lat' in loaded) loaded._center = [ loaded.lon, loaded.lat ];
    delete loaded.lon;
    delete loaded.lat;
    delete loaded.score;
    delete loaded.bounds;
    return callback(null, loaded);
}

// Load the full feature from geocoding data if needed, otherwise create
// a light reference with id + text.
function loadFeature(source, feat, full, callback) {
    var type = source._geocoder.id;
    if (!full) {
        var loaded = {};
        loaded._extid = type + '.' + feat._id;
        loaded._fhash = type + '.' + termops.feature(feat._id);
        loaded._text = feat._text || feat.name || feat.search;
        return callback(null, loaded._text ? loaded : false);
    }
    feature.getFeature(source, termops.feature(feat._id), function(err, data) {
        if (err) return callback(err);
        if (!data || !data[feat._id]) return callback()
        var loaded = data[feat._id];
        loaded._extid = type + '.' + feat._id;
        loaded._fhash = type + '.' + termops.feature(feat._id);
        return callback(null, loaded);
    });
}

function identity(v) { return v; }
