'use strict';
const mp25 = Math.pow(2,25);
const mapnik = require('mapnik');
const termops = require('../text-processing/termops');
const feature = require('../util/feature');
const bbox = require('../util/bbox');
const queue = require('d3-queue').queue;
const Locking = require('@mapbox/locking');
const addressCluster = require('./addresscluster');
const addressItp = require('./addressitp');
const distance = require('@turf/distance').default;
const pt = require('@turf/helpers').point;
const cover = require('@mapbox/tile-cover');
const proximity = require('../util/proximity');
const routablePoints = require('./routablepoint');

/**
 * Returns a hierarchy of features ("context") for a given lon, lat pair.
 * This is used for reverse geocoding: given a point, it returns possible
 * regions that contain it.
 *
 * @access public
 *
 * @param {Object} geocoder: geocoder instance
 * @param {Array} position: [lon, lat]
 * @param {Object} options: optional options object
 * @param {Function} callback method that expects err, contexts
 * @return {undefined}
 */
module.exports = function(geocoder, position, options, callback) {
    options = options || {};

    const context = [];
    const indexes = geocoder.indexes;
    let index_ids = Object.keys(indexes);
    const maxidx = typeof options.maxidx === 'number' ? options.maxidx : index_ids.length;
    const full = options.full || false;
    const matched = options.matched || {};
    const language = options.language || false;
    const subtypeLookup = getSubtypeLookup(options.types || []);

    index_ids = index_ids.slice(0, maxidx);

    // No-op context.
    if (!index_ids.length) return callback(null, context);

    const q = queue();

    const lon = position[0];
    const lat = position[1];

    for (let index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        const source = indexes[index_ids[index_ids_it]];
        if (bbox.amInside(position, source.bounds)) {
            // calculate score range for this index, if:
            // - context call is associated w/ a reverse geocode
            // - we are filtering on the parent type (eg poi)
            // - there is a scorerange entry on this index for the child type (eg landmark)
            let scoreRange = false;
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
            let exclusiveMatched = false;
            if (options.targetFeature && (source.type === indexes[index_ids[index_ids.length - 1]].type)) {
                // if we have a target feature, only query the index containing it + its parents
                if (source.id !== options.targetFeature[0]) continue;
                exclusiveMatched = { _exclusive: true };
                exclusiveMatched[options.targetFeature[1]] = true;
            }

            q.defer(contextVector, source, lon, lat, full, exclusiveMatched || matched, language, scoreRange, options.reverseMode, options.routing);
        }
    }

    q.awaitAll((err, loaded) => {
        if (err) return callback(err);
        return callback(null, stackFeatures(geocoder, loaded, options));
    });
};

/**
 * convenience object for checking type filter for entries like poi.landmark
 * type filter + subtype filter (eg poi + poi.landmark) should filter
 * for the union set
 *
 * @deprecated
 *
 * @param {Array<string>} types - types array
 * @return {object} lookup object
 */
function getSubtypeLookup(types) {
    const subtypeLookup = {};
    for (let type_i = 0; type_i < types.length; type_i++) {
        const splitType = types[type_i].split('.');
        if ((splitType.length === 2) && !subtypeLookup[splitType[0]])
            subtypeLookup[splitType[0]] = splitType[1];
        else
            subtypeLookup[splitType[0]] = true;
    }
    return subtypeLookup;
}

/**
 * Stack features into a contect array
 *
 * @param {Object} geocoder - geocoder instance
 * @param {Array<object>} loaded - features
 * @param {object} options - query time options
 * @return {Array<object>} array of contexts
 */
function stackFeatures(geocoder, loaded, options) {
    if (!loaded.length) return [];

    const context = [];
    const memo = {};
    let firstType = false;
    const reverseMode = options.reverseMode || 'distance';

    loaded = loaded.reverse();

    const subtypeLookup = getSubtypeLookup(options.types || []);

    for (let i = 0; i < loaded.length; i++) {
        if (!loaded[i]) continue;

        const feature = loaded[i];
        const stack = feature.properties['carmen:stack'];

        for (let l = feature.properties['carmen:types'].length - 1; l >= 0; l--) {
            const type = feature.properties['carmen:types'][l];
            const conflict = feature.properties['carmen:conflict'] || type;

            // Disallow shifting a feature's type to occupy the maxtype
            // The maxtype is set on forward geocodes by the matched feature
            // in verifyMatch. Since it's not part of the context loading
            // process it's a type that must be additionally accounted for.
            if (options.maxtype && options.maxtype === type) continue;

            if (options.full && !firstType) {
                // Filter context results by stack
                if (options.stacks && stack && Array.isArray(stack)) {
                    if (stack.filter((i) => {
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
            } else if (memo[type] && feature.properties['carmen:geomtype'] !== 3) {
                if (reverseMode === 'score') {
                    // don't replace a higher-scored feature with a lower-scored one
                    if (!feature.properties['carmen:score'] && memo[type].properties['carmen:score']) continue;
                    if (feature.properties['carmen:score'] && memo[type].properties['carmen:score'] && memo[type].properties['carmen:score'] >= feature.properties['carmen:score']) continue;
                }
                // Don't replace a stacked feature that is closer to the queried point
                if (feature.properties['carmen:vtquerydist'] >= memo[type].properties['carmen:vtquerydist']) continue;

                // A conflicting feature cannot bump out a wanted type
                if (options.full && options.types && !subtypeLookup[type]) continue;

                // Remove all references to previously stacked feature
                for (const b in memo) if (memo[b] === memo[type]) delete memo[b];

                // Stack new feature
                memo[type] = feature;
                memo[conflict] = feature;
                // Reconstruct extid based on selected type
                feature.properties['carmen:extid'] = type + '.' + feature.properties['carmen:extid'].split('.').pop();
                break;
            }
        }
    }

    const types = Object.keys(memo);
    for (let k = 0; k < types.length; k++) {
        const toAdd = memo[types[k]];
        if (!toAdd) continue;
        if (context.indexOf(toAdd) !== -1) continue;

        // Strip out context-logic properties for now
        delete toAdd.properties['carmen:stack'];
        delete toAdd.properties['carmen:conflict'];

        context.push(toAdd);
    }
    return context;
}

/**
 * Returns an array of lon, lat pairs of features closest to the query point.
 * This is used as a first pass when reverse geocoding multiple results when limit
 * type is set. Each point is then reverse geocoded separately.
 *
 * @param {Object} geocoder: geocoder instance
 * @param {Float} lon: input longitude
 * @param {Float} lat: input latitude
 * @param {String} type: source type
 * @param {Number} limit: number of points to return
 * @param {Function} callback method that expects err, contexts
 * @return {undefined}
 */
function nearest(geocoder, lon, lat, type, limit, callback) {
    const indexes = geocoder.indexes;
    const index_ids = Object.keys(indexes);
    const q = queue();

    const typeSplit = type.split('.');
    type = typeSplit[0];

    for (let index_ids_it = 0; index_ids_it < index_ids.length; index_ids_it++) {
        const source = indexes[index_ids[index_ids_it]];
        if (bbox.amInside([lon, lat], source.bounds)) {
            if (type !== source.type) continue;

            let scoreFilter = false;
            if (typeSplit.length === 2 && source.scoreranges && source.scoreranges[typeSplit[1]]) {
                scoreFilter = [
                    source.scoreranges[typeSplit[1]][0] * source.maxscore,
                    source.scoreranges[typeSplit[1]][1] * source.maxscore
                ];
            }

            q.defer(nearestPoints, source, lon, lat, scoreFilter);
        }
    }

    q.awaitAll((err, res) => {
        if (err) return callback(err);
        let combined = [];
        for (let res_it = 0; res_it < res.length; res_it++) {
            combined = combined.concat(res[res_it]);
        }
        combined.sort((a, b) => { return a.distance - b.distance; });
        combined = combined.slice(0, limit);
        return callback(null, combined);
    });
}

// Locking is a wrapper around node-lru-cache, a library for caching which deletes least recently used items
// Locking allows you to define things like max size of cache etc
// Check out LRU options here - https://github.com/isaacs/node-lru-cache/blob/f25bdae0b4bb0166a75fa01d664a3e3cece1ce98/README.md#options
const getTile = Locking((options, unlock) => {
    const source = options.source;
    const z = parseInt(options.z,10);
    const x = parseInt(options.x,10);
    const y = parseInt(options.y,10);
    source.getTile(z, x, y, (err, zpbf) => {
        if (err && err.message !== 'Tile does not exist') return unlock(err);
        if (!zpbf) return unlock(null, false);

        let compression = false;
        if (zpbf[0] === 0x78 && zpbf[1] === 0x9C) {
            compression = 'inflate';
        } else if (zpbf[0] === 0x1F && zpbf[1] === 0x8B) {
            compression = 'gunzip';
        }
        if (!compression) return unlock(new Error('Could not detect compression of vector tile'));

        const vt = new mapnik.VectorTile(z, x, y);
        vt.setData(zpbf,(err) => {
            if (err) return unlock(err);
            if (vt.empty()) return unlock(null, false);
            return unlock(null, vt);
        });
    });
}, { max: 1024 });
getTile.setVtCacheSize = function(size) {
    getTile.cache.max = size;
};

module.exports.getTile = getTile;
module.exports.nearest = nearest;
module.exports.nearestPoints = nearestPoints;
module.exports.contextVector = contextVector;
module.exports.stackFeatures = stackFeatures;

/**
* tileCover uses the tile-cover library to return an array of tiles
*
* @param {Object} source - a geocoding datasource
* @param {Number} lon - value of longitude
* @param {Number} lat - value of latiude
* @param {Function} cb - callback function
*/
function tileCover(source, lon, lat, cb) {
    const tiles = cover.tiles({
        type: 'Point',
        coordinates: [lon,lat]
    }, {
        min_zoom: source.maxzoom,
        max_zoom: source.maxzoom
    });
    const options = {
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

/**
* nearestPoints for a source return an array of nearest feature hit points/center points as
* a flat array of lon,lat coordinates.
*
* @param {Object} source - a geocoding datasource
* @param {Number} lon - value of longitude
* @param {Number} lat - value of latitude
* @param {Number} scoreFilter - filter the results by score
* @param {Function} callback - callback is called with nearest features longitude and latitude in a flat array
*/
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

        const loaded = [];
        for (let results_it = 0; results_it < results.length; results_it++) {
            const result = results[results_it];
            const attr = result.attributes();

            let score = attr['carmen:score'];
            if (score === undefined) score = 0;
            if (score < 0) continue;
            if (scoreFilter && (score <= scoreFilter[0] || score > scoreFilter[1])) continue;

            let hit;
            if (result.x_hit) {
                hit = [result.x_hit, result.y_hit];
                hit.distance = result.distance;
                hit.source_id = source.id;
                hit.tmpid = (source.idx * mp25) + termops.feature(attr.id);
            } else if (attr['carmen:center']) {
                hit = attr['carmen:center'][0] === '[' ?
                    JSON.parse(attr['carmen:center']) :
                    attr['carmen:center'].split(',');
                hit[0] = parseFloat(hit[0]);
                hit[1] = parseFloat(hit[1]);
                hit.distance = result.distance;
                attr.id = attr.id || result.id();
                hit.source_id = source.id;
                hit.tmpid = (source.idx * mp25) + termops.feature(attr.id);
            }
            if (hit) loaded.push(hit);
        }

        return callback(null, loaded);
    }
}

/**
* For each context type, load a representative tile, look around the
* pixel we've identified, and if we find a feature, add it to the `context`
* array under an array index that represents the position of the context
* in imaginary z-space (country, town, place, etc). When there are no more
* to do, return that array, filtered of nulls and reversed
*
* @param {Object} source - a geocoding datasource
* @param {Number} lon - value of longitude
* @param {Number} lat - value of latitude
* @param {Boolean} full - if options.full is set to true
* @param {Object} matched - if target feature is to be queried
* @param {Boolean} language - if language option is set, otherwise language=false
* @param {Number} scoreFilter - filter the results by score
* @param {String} reverseMode - sort features in reverse queries by one of `score` or `distance`
* @param {Boolean} routing - whether routing is enabled
* @param {Function} callback - callback function
*/
function contextVector(source, lon, lat, full, matched, language, scoreFilter, reverseMode, routing, callback) {

    tileCover(source, lon, lat, query);

    // For a loaded vector tile, query for features at the lon,lat.
    function query(err, vt) {
        if (err) return callback(err);
        if (!vt) return callback(null, false);

        // Uses a 1000m (web mercator units) tolerance.
        vt.query(lon, lat, {
            tolerance: 1000,
            layer: source.geocoder_layer
        }, (err, results) => {
            if (err) return callback(err);
            if (!results || !results.length) return callback(null, false);

            let forwardMatchFeat;
            let ghostMatchFeat;
            let feat;
            let dist = Infinity;
            let mapped;
            let resultsSorted = false;

            if (reverseMode === 'score' && full && source.geocoder_reverse_mode) {
                mapped = results.map((el, i) => {
                    return { index: i, distscore: proximity.distscore(el.distance, el.attributes()['carmen:score']) };
                });

                mapped.sort(sortByDistScore);
                resultsSorted = mapped.map((el) => {
                    return results[el.index];
                });
                results = resultsSorted;
                resultsSorted = true;
            }

            // Grab the feature with the lowest distance + lowest id.
            // Ensures context has stable behavior even when features
            // are equidistant to the query point.
            //
            // Exclude features with a negative score.
            // Exclude features with a distance > tolerance (not yet
            // enforced upstream in mapnik).
            for (let i = 0; i < results.length; i++) {
                let attr;
                if (results[i].distance > 1000) continue;
                if (resultsSorted) {
                    attr = results[i].attributes();
                    attr['carmen:vtquerydist'] = results[i].distance;
                    attr['carmen:geomtype'] = results[i].geometry().type();
                    feat = attr;
                    break;
                }
                if (results[i].distance > dist) continue;

                attr = results[i].attributes();

                // If geojson has an id in properties use that otherwise use VT id
                attr.id = attr.id || results[i].id();
                if (feat && attr.id > feat.id) continue;

                const tmpid = (source.idx * mp25) + termops.feature(attr.id);

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
                let score = attr['carmen:score'] || (attr.properties && attr.properties['carmen:score']);
                if (score === undefined) score = 0;
                if (score < 0 && !matched[tmpid]) continue;
                // Store first ghost feature for possible later use.
                if (score < 0 && !ghostMatchFeat) {
                    ghostMatchFeat = attr;
                    continue;
                }

                // scorefilter, if set
                if (scoreFilter && (score <= scoreFilter[0] || score > scoreFilter[1])) continue;

                attr['carmen:vtquerydist'] = results[i].distance;
                attr['carmen:geomtype'] = results[i].geometry().type();

                feat = attr;
                dist = results[i].distance;
                if (matched[tmpid]) {
                    forwardMatchFeat = feat;
                    break;
                }
            }
            // Priority order:
            // 1. Non-ghost, forward phrasematch
            // 2. Ghost, forward phrasematch
            // 3. Non-ghost, not a phrasematch
            feat = forwardMatchFeat || ghostMatchFeat || feat;
            if (feat && full) {
                return fullFeature(source, feat, [lon,lat], routing, callback);
            } else if (feat) {
                return lightFeature(source, feat, callback);
            // No matching features found.
            } else {
                return callback(null, false);
            }
        });
    }
}

/**
 * Go from VT query attributes to a geojson-like feature
 *
 * @param {object} source - a geocoding datasource
 * @param {object} feat - feature
 * @param {callback} callback - expect err and feature object
 * @return {undefined}
 */
function lightFeature(source, feat, callback) {
    if (!feat['carmen:text']) return callback(null, false);

    let loaded = { properties: Object.assign({}, feat) };
    delete loaded.properties.id;
    loaded.properties['carmen:extid'] = source.type + '.' + feat.id;
    loaded.properties['carmen:tmpid'] = (source.idx * mp25) + termops.feature(feat.id);
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
function fullFeature(source, feat, query, routing, callback) {
    feature.getFeatureById(source, feat.id, (err, loaded) => {
        if (err) return callback(err);
        if (!loaded) return callback();
        loaded.properties['carmen:extid'] = source.type + '.' + feat.id;
        loaded.properties['carmen:tmpid'] = (source.idx * mp25) + termops.feature(feat.id);
        loaded.properties['carmen:vtquerydist'] = feat['carmen:vtquerydist'];
        loaded.properties['carmen:geomtype'] = feat['carmen:geomtype'];
        loaded.properties['carmen:stack'] = source.stack;
        loaded.properties['carmen:conflict'] = source.name !== source.type ? source.name : undefined;
        loaded.properties['carmen:reverseMode'] = source.geocoder_reverse_mode;

        const original_loaded = loaded;

        let addrpt = false;

        if (source.geocoder_address && loaded.properties['carmen:addressnumber']) {
            addrpt = addressCluster.reverse(loaded, query);
        }

        let addritp = false;
        if (source.geocoder_address && loaded.properties['carmen:rangetype']) {
            addritp = addressItp.reverse(loaded, query);
        }

        if (addrpt && addritp) {
            // If itp is closer to query and distance between itp/pt > 200m - use itp
            const qFeat = pt(query);

            if (distance(qFeat, addritp) < distance(qFeat, addrpt) && distance(addrpt, addritp) > 0.2) {
                loaded = addritp;
            } else {
                loaded = addrpt;
            }
        } else if (addrpt) {
            loaded = addrpt;
        } else if (addritp) {
            loaded = addritp;
        }

        if (source.geocoder_routable && routing) {
            loaded.routable_points = routablePoints(loaded.geometry.coordinates, original_loaded);
        }

        return callback(null, loaded);
    });
}

/**
 * Sort method
 * @param {object} a - object with `distscore` parameter
 * @param {object} b - object with `distscore` parameter
 * @return {number} sort order
 */
function sortByDistScore(a, b) {
    return +(a.distscore < b.distscore) || +(a.distscore === b.distscore) - 1;
}
