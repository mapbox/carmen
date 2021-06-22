'use strict';
const queue = require('d3-queue').queue;
const termops = require('../text-processing/termops');
const leven = require('leven');

module.exports = {};
module.exports.normalize = normalize;
module.exports.addrTransform = addrTransform;
module.exports.shard = shard;
module.exports.getFeatureByCover = getFeatureByCover;
module.exports.getFeatureById = getFeatureById;
module.exports.putFeatures = putFeatures;
module.exports.storableProperties = storableProperties;

function addrTransform(doc) {
    let c_it;
    // All values in an addresscluster should be lowercase so that the lowercased input query always matches the addresscluster
    // All addressnumber type features are also converted into GeometryCollections
    if (doc.properties['carmen:addressnumber'] && doc.geometry) {
        if (doc.geometry.type === 'MultiPoint') {
            doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']];
            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [
                    doc.geometry
                ]
            };
        } else if (doc.geometry.type !== 'GeometryCollection') {
            throw Error('carmen:addressnumber must be MultiPoint or GeometryCollection');
        }

        const addressClusters = doc.properties['carmen:addressnumber'];

        if (addressClusters.length !== doc.geometry.geometries.length) {
            throw Error('carmen:addressnumber array must be equal to geometry.geometries array');
        }

        for (c_it = 0; c_it < addressClusters.length; c_it++) {
            const addressNumbers = addressClusters[c_it];
            const addressPoints = doc.geometry.geometries[c_it];
            if (!addressNumbers || !addressNumbers.length) continue;

            if (addressNumbers.length !== addressPoints.coordinates.length) {
                throw Error('carmen:addressnumber[i] array must be equal to geometry.geometries[i] array');
            }

            if (addressPoints.type !== 'MultiPoint') {
                throw Error('non-null carmen:addressnumbers must parallel with MultiPoint geometries in GeometryCollection');
            }

            for (let addr_it = 0; addr_it < addressNumbers.length; addr_it++) {
                addressNumbers[addr_it] =
                    typeof addressNumbers[addr_it] === 'string' ?
                        addressNumbers[addr_it].toLowerCase() :
                        addressNumbers[addr_it];
            }
        }
    }

    if (doc.properties['carmen:intersections'] && doc.geometry) {
        if (doc.geometry.type === 'MultiPoint') {
            doc.properties['carmen:intersections'] = [doc.properties['carmen:intersections']];
            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [
                    doc.geometry
                ]
            };
        } else if (doc.geometry.type !== 'GeometryCollection') {
            throw Error('carmen:intersections must be MultiPoint or GeometryCollection');
        }
        const intersections = doc.properties['carmen:intersections'];

        for (c_it = 0; c_it < intersections.length; c_it++) {
            const intersectingStreet = intersections[c_it];
            const intersectionPoints = doc.geometry.geometries[c_it];
            if (!intersectingStreet || !intersectingStreet.length) continue;

            if (intersectingStreet.length !== intersectionPoints.coordinates.length) {
                throw Error('carmen:intersections[i] array must be equal to geometry.geometries[i] array');
            }

            if (intersectionPoints.type !== 'MultiPoint') {
                throw Error('non-null carmen:intersections must parallel with MultiPoint geometries in GeometryCollection');
            }
        }
    }

    // All ITP (like PT) are converted to GeometryCollections internally
    if (doc.properties['carmen:rangetype'] && doc.geometry) {
        const rangePropKeys = ['carmen:parityl', 'carmen:parityr', 'carmen:lfromhn', 'carmen:rfromhn', 'carmen:ltohn', 'carmen:rtohn'];

        if (doc.geometry.type === 'LineString' || doc.geometry.type === 'MultiLineString') {
            rangePropKeys.forEach((key) => {
                doc.properties[key] = doc.geometry.type === 'LineString' ?  [[doc.properties[key]]] : [doc.properties[key]];
            });

            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiLineString',
                    coordinates: doc.geometry.type === 'LineString' ? [doc.geometry.coordinates] : doc.geometry.coordinates
                }]
            };
        } else if (doc.geometry.type !== 'GeometryCollection') {
            throw Error('ITP results must be a LineString, MultiLineString, or GeometryCollection');
        }

        for (c_it = 0; c_it < doc.geometry.geometries.length; c_it++) {
            if (doc.geometry.geometries[c_it].type === 'LineString') {
                throw Error('ITP geometries in a GeometryCollection must be MultiLineStrings');
            }

            rangePropKeys.forEach((key) => {
                if (!doc.properties[key][c_it]) doc.properties[key][c_it] = [];
            });
        }
    }

    return doc;
}

function normalize(source, doc) {
    doc.properties['carmen:types'] = doc.properties['carmen:types'] || [source.type];
    doc.properties['carmen:index'] = source.id;

    // Copy carmen:text to carmen:text_universal for sources that
    // have universal/cross-language text (e.g. postcodes).
    // This property is treated by the closest lang/and other text
    // fallback selection as equivalent to a real language code match.
    if (source.geocoder_universal_text) doc.properties['carmen:text_universal'] = doc.properties['carmen:text'];

    doc = addrTransform(doc);
    return doc;
}

function getHash(source, hash, callback) {
    source.getGeocoderData('feature', hash, (err, buffer) => {
        if (err) return callback(err);
        if (!buffer || !buffer.length) return callback();

        let data;
        try {
            data = JSON.parse(buffer);
        } catch (err) {
            return callback(err);
        }
        callback(null, data);
    });
}

function getFeatureByCover(source, cover, callback) {
    getHash(source, cover.id, (err, loaded) => {
        if (err) return callback(err);
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, cover.id, source.id);
            return callback();
        }

        const zxy = source.zoom + '/' + cover.x + '/' + cover.y;
        let features = [];
        let normalized;
        for (const id in loaded) {
            if (loaded[id].properties['carmen:zxy'].indexOf(zxy) === -1) continue;
            try {
                normalized = normalize(source, loaded[id]);
                features.push(normalized);
            } catch (err) {
                return callback(err);
            }
        }

        if (!features.length) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, cover.id, source.id);
            return callback();
        }

        // sometimes multiple features will have the same sharded ID + z/x/y coords.
        // In that case, match on score as well.
        if (features.length > 1) features = matchByScore(features, cover, source);
        // Check text as well if score isn't sufficient
        if (features.length > 1) features = matchByText(features, cover);

        const feature = features[0];

        return callback(null, feature);
    });
}

function getFeatureById(source, id, callback) {
    getHash(source, termops.feature(id), (err, loaded) => {
        if (err) return callback(err);
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }

        let feature = loaded && loaded[id];
        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d (%s)', source.name, id, source.id);
            return callback();
        }

        try {
            feature = normalize(source, feature);
        } catch (err) {
            return callback(err);
        }

        return callback(null, feature);
    });
}

function putFeatures(source, docs, callback) {
    const byshard = {};
    for (let i = 0; i < docs.length; i++) {
        let doc = docs[i];
        if (!doc.id) return callback(new Error('Feature id is required: ' + JSON.stringify(doc)));
        if (!doc.properties['carmen:zxy']) return callback(new Error('Feature carmen:zxy property is required: ' + JSON.stringify(doc)));

        try {
            doc = addrTransform(doc);
        } catch (err) {
            return callback(err);
        }

        doc.properties = storableProperties(doc.properties);
        const sh = termops.feature(doc.id);
        byshard[sh] = byshard[sh] || [];
        byshard[sh].push(doc);
    }
    const q = queue(100);
    for (const s in byshard) q.defer((s, docs, callback) => {
        source.getGeocoderData('feature', s, (err, buffer) => {
            if (err) return callback(err);
            let current;
            try {
                current = buffer && buffer.length ? JSON.parse(buffer) : {};
            } catch (err) {
                return callback(err);
            }
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
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
    const mod = Math.pow(16,level + 1);
    const interval = Math.min(64, Math.pow(16, 4 - level));
    return Math.floor((id % (interval * mod)) / interval);
}

function storableProperties(properties, type) {
    const storable = {};
    for (const k in properties) {
        // skip all null properties
        if (properties[k] === null || properties[k] === undefined) continue;
        // keep non carmen:* properties
        if (!(/^carmen:/).test(k)) {
            storable[k] = properties[k];
            continue;
        }
        // keep carmen:text* properties
        if (/^carmen:text/.test(k)) {
            storable[k] = properties[k];
            continue;
        }

        if (/^carmen:format/.test(k)) {
            storable[k] = properties[k];
            continue;
        }
        // keep only known remaining whitelisted carmen:* properties
        switch (k) {
            case 'carmen:reverse_only':
            case 'carmen:score':
            case 'carmen:types':
            case 'carmen:center':
            case 'carmen:geocoder_stack':
                storable[k] = properties[k];
                break;
            case 'carmen:addressprops':
            case 'carmen:addressnumber':
            case 'carmen:address_style':
            case 'carmen:address_styles':
            case 'carmen:intersections':
            case 'carmen:rangetype':
            case 'carmen:parityl':
            case 'carmen:parityr':
            case 'carmen:lfromhn':
            case 'carmen:rfromhn':
            case 'carmen:ltohn':
            case 'carmen:rtohn':
            case 'carmen:zxy':
            case 'carmen:routable_points':
            case 'carmen:proximity_radius':
                if (type !== 'vector') storable[k] = properties[k];
                break;
        }
    }
    return storable;
}

// Compare feature score to cover score. Requires converting feature score to the cover's 3-bit simplified score bucket
function matchByScore(features, cover, source) {
    if (typeof source.maxscore === 'undefined') return features;
    const coverScore = Math.round(cover.score);
    features = features.filter((feature) => {
        const scoreSimple3Bit = termops.encode3BitLogScale(feature.properties['carmen:score'], source.maxscore);
        const scoreSimple = termops.decode3BitLogScale(scoreSimple3Bit, source.maxscore, true);
        return scoreSimple === coverScore;
    });
    return features;
}

// If score isn't enought to match a cover to a single feature, look at text properties.
function matchByText(features, cover) {
    // go through all the features and hash all their synonyms, picking the one
    // then filter to only features that have a synonym that matches the sought hash
    let matchingFeatures = [];
    for (const feature of features) {
        for (const key of Object.keys(feature.properties)) {
            if (feature.properties[key] && key.match(/^carmen:text/)) {
                const synonyms = Array.isArray(feature.properties[key]) ?
                    feature.properties[key] :
                    feature.properties[key].split(',');
                const matchingSynonyms = new Set();
                for (const synonym of synonyms) {
                    const hash = termops.phraseHash(synonym);
                    if (hash === cover.source_phrase_hash) {
                        matchingSynonyms.add(synonym);
                    }
                }
                if (matchingSynonyms.size) {
                    matchingFeatures.push({
                        synonyms: matchingSynonyms,
                        feature
                    });
                }
            }
        }
    }

    // if there are ties, calculate the Levenshtein distance between the query
    // text and all the synonyms that hash-match, the filter to the closest one
    if (matchingFeatures.length > 1) {
        let minDistance = Number.MAX_SAFE_INTEGER;
        matchingFeatures.forEach((match) => {
            match.distance = Number.MAX_SAFE_INTEGER;
            for (const synonym of match.synonyms) {
                const distance = leven(cover.text, synonym.trim().toLowerCase());
                if (distance < match.distance) match.distance = distance;
            }
            if (match.distance < minDistance) minDistance = match.distance;
        });
        matchingFeatures = matchingFeatures.filter((f) => f.distance === minDistance);
    }

    return matchingFeatures.map((f) => f.feature);
}
