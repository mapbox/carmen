'use strict';
module.exports.forward = forward;
module.exports.forwardPrefix = forwardPrefix;
module.exports.forwardPrefixFiltered = forwardPrefixFiltered;
module.exports.reverse = reverse;
module.exports.getAddressStyle = getAddressStyle;
module.exports.matchesStyle = matchesStyle;

const proximity = require('../util/proximity');

const defaultAddressStyle = 'standard';

const addressStyleVTable = {
    'standard': matchesStandardAddress,
    'queens': matchesQueensAddress
};

/**
 * Given a feature, calculate the desired properties for
 * an individual address using the carmen:addressprops key
 *
 * @param {Object} feat GeoJSON Feature
 * @param {Number} idx Address Point IDX to calculate properties for
 * @returns {Object} GeoJSON Feature
 */
function properties(feat, idx) {
    if (!feat.properties['carmen:addressprops']) return feat;

    for (const prop of Object.keys(feat.properties['carmen:addressprops'])) {
        if (
            feat.properties['carmen:addressprops'][prop]
            && feat.properties['carmen:addressprops'][prop][idx] !== undefined
        ) {
            if (feat.properties['carmen:addressprops'][prop][idx] === null) {
                delete feat.properties[prop];
            } else {
                feat.properties[prop] = feat.properties['carmen:addressprops'][prop][idx];
            }
        }
    }

    return feat;
}

/**
 * Find the matching address in a forward query on an address cluster
 *
 * @param {Object} feat GeoJSON Feature to derive individual address from
 * @param {String|number} address User's queried address number
 * @param {number} num Max number of address features to potentially return (default 10)
 * @param {boolean} autocomplete Whether or not autocomplete is enabled
 *
 * @return {Array|false} Array of potential address feats or false
 */
function forward(feat, address, num = 10) {
    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    const cluster = feat.properties['carmen:addressnumber'];

    const matchedAddressFeatures = [];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        for (let addressIndex = 0; addressIndex < cluster[c_it].length; addressIndex++) {

            const addressStyle = getAddressStyle(feat, addressIndex);

            if (matchesStyle(address, cluster[c_it][addressIndex], addressStyle) && feat.geometry.geometries[c_it].type === 'MultiPoint') {
                let featureClone = JSON.parse(JSON.stringify(feat));
                featureClone = properties(featureClone, addressIndex);
                featureClone.properties['carmen:address'] = cluster[c_it][addressIndex];
                featureClone.geometry = {
                    type:'Point',
                    coordinates: [
                        Math.round(feat.geometry.geometries[c_it].coordinates[addressIndex][0] * 1e6) / 1e6,
                        Math.round(feat.geometry.geometries[c_it].coordinates[addressIndex][1] * 1e6) / 1e6
                    ]
                };
                matchedAddressFeatures.push(featureClone);
            }
            if (matchedAddressFeatures.length >= num) {
                return matchedAddressFeatures;
            }
        }
    }
    return matchedAddressFeatures.length ? matchedAddressFeatures : false;
}

/**
 * Given an address cluster and a house number prefix, try and find all house
 * numbers within the cluster that start with that prefix, and and return an
 * array of objects each of which contains the number and a GeoJSON point
 * representing its location; return an empty array if no matches are found
 * @param {Object} feature - GeoJSON feature
 * @param {string} address - house number
 * @return {Array.<Object>} array of GeoJSON points
 */
function forwardPrefix(feature, address) {
    if (!feature.geometry || feature.geometry.type !== 'GeometryCollection') return false;

    const cluster = feature.properties['carmen:addressnumber'];

    const matchedAddressFeatures = [];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        for (let addressIndex = 0; addressIndex < cluster[c_it].length; addressIndex++) {

            const addressStyle = getAddressStyle(feature, addressIndex);

            if (matchesStyle(address, cluster[c_it][addressIndex], addressStyle, true) && feature.geometry.geometries[c_it].type === 'MultiPoint') {
                let featureClone = JSON.parse(JSON.stringify(feature));
                featureClone = properties(featureClone, addressIndex);
                featureClone.properties['carmen:address'] = cluster[c_it][addressIndex];
                matchedAddressFeatures.push({
                    idx: addressIndex,
                    number: cluster[c_it][addressIndex],
                    numberAsInt: parseInt(cluster[c_it][addressIndex], 10),
                    geometry: {
                        type: 'Point',
                        coordinates: feature.geometry.geometries[c_it].coordinates[addressIndex]
                    }
                });
            }
        }
    }

    return matchedAddressFeatures;
}

/**
 * Wrapper around forwardPrefix to find a single result given a full
 * set of potential matches
 *
 * @param {Object} feat
 * @param {string} address
 * @param {string} options
 * @param {Object} cover
 * @return {Array.<Object>}
 */
function forwardPrefixFiltered(feat, address, options, cover) {
    const matchingAddressPoints = forwardPrefix(feat, address);

    if (matchingAddressPoints && matchingAddressPoints.length > 0) {
        // now we have a bunch of points that might be the right answer, but let's just pick one
        matchingAddressPoints.sort((a, b) => a.numberAsInt - b.numberAsInt);

        // pick the first, middle, and last (if possible) and choose the closest one
        const firstMiddleLast = [matchingAddressPoints[0]];
        if (matchingAddressPoints.length > 1) {
            firstMiddleLast.push(matchingAddressPoints[matchingAddressPoints.length - 1]);
            if (matchingAddressPoints.length > 2) {
                firstMiddleLast.push(matchingAddressPoints[matchingAddressPoints.length >> 1]);
            }
        }

        for (const candidate of firstMiddleLast) {
            candidate.distance = proximity.distance(options.proximity, candidate.geometry.coordinates, cover);
        }

        firstMiddleLast.sort((a, b) => a.distance - b.distance);

        const feat_clone = JSON.parse(JSON.stringify(feat));

        properties(feat_clone, firstMiddleLast[0].idx);

        feat_clone.properties['carmen:address'] = firstMiddleLast[0].number;
        feat_clone.properties['carmen:distance'] = firstMiddleLast[0].distance;
        feat_clone.geometry = firstMiddleLast[0].geometry;

        return [feat_clone];
    } else {
        return [];
    }
}

/**
 * Find the matching address for a reverse query on an address cluster
 *
 * @param {Object} feat GeoJSON Feature to derive individual address from
 * @param {Array} query User's queried lng/lat point
 *
 * @return {Object|false} Return mutated feat object or false if no match is found
 */
function reverse(feat,query) {
    const lon = query[0];
    const lat = query[1];

    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    const cluster = feat.properties['carmen:addressnumber'];
    let closest;

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        let l = cluster[c_it].length;
        while (l--) {
            const lon2 = feat.geometry.geometries[c_it].coordinates[l][0];
            const lat2 = feat.geometry.geometries[c_it].coordinates[l][1];
            const phi1 = lat * (Math.PI / 180);
            const phi2 = lat2 * (Math.PI / 180);
            const deltaPhi = (lat2 - lat) * (Math.PI / 180);
            const deltaLambda = (lon2 - lon) * (Math.PI / 180);
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)), Math.sqrt(1 - Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)));

            if (closest === undefined || closest.distance > dist) {
                closest = { cluster_it: c_it, cluster_pos: l, distance: dist, address: cluster[c_it][l] };
            }
        }
    }

    if (!closest) return false;

    // TODO This, like all address features in carmen is hardcoded for
    // US Style addresses. Once alternate address formats are added, this will
    // need to be changed ~ingalls
    feat = JSON.parse(JSON.stringify(feat));

    properties(feat, closest.cluster_pos);

    feat.geometry = {
        type: 'Point',
        coordinates: feat.geometry.geometries[closest.cluster_it].coordinates[closest.cluster_pos]
    };

    feat.properties['carmen:address'] = closest.address;

    return feat;
}

/**
 * Returns the address style for a address index in a feature
 * @param {Object} feature - Feature
 * @param {Number} addressIndex - Index of of 'carmen:addressnum' that the style applies to
 * @returns {string} addresStyle - The style of this particular address
 */
function getAddressStyle(feature, addressIndex) {
    let addressStyle = defaultAddressStyle;
    if (feature.properties['carmen:address_style']) {
        addressStyle = feature.properties['carmen:address_style'];
    }
    if (feature.properties['carmen:addressprops'] && feature.properties['carmen:addressprops']['carmen:address_style']
        && addressIndex in feature.properties['carmen:addressprops']['carmen:address_style']) {
        addressStyle = feature.properties['carmen:addressprops']['carmen:address_style'][addressIndex];
    }
    if (!(addressStyle in addressStyleVTable)) {
        addressStyle = defaultAddressStyle;
    }
    return addressStyle;
}

/**
 * matchesStyle is a wrapper around the VTable lookup for the various
 * address style matchers.  The exposure like this is driven primarily
 * for testing purposes.
 * @param {string|number} queryAddress - Address number provided by the query
 * @param {string|number} featureAddress - Address number in the address cluster
 * @param {string} style - What address style is to be called
 * @param {boolean} autocomplete - Whether to match on a partial result
 * @returns {boolean} - True if a match
 */
function matchesStyle(queryAddress, featureAddress, style, autocomplete = false) {
    return addressStyleVTable[style](queryAddress, featureAddress, autocomplete);
}

/**
 * AddressMatcher for Standard Address Number Styles
 * This will match either the raw string or a numeric only version of the address number
 * @param {string|number} queryAddress - Address number provided by the query
 * @param {string|number} featureAddress - Address number in the address cluster
 * @param {boolean} autocomplete - Whether to match on a partial result
 * @returns {boolean} - True if a match
 */
function matchesStandardAddress(queryAddress, featureAddress, autocomplete = false) {
    // A raw string version of the query
    const rawQuery = typeof queryAddress === 'string'
        ? queryAddress.toLowerCase()
        : queryAddress.toString();
    // A numeric match version of the query
    const numericQuery = typeof queryAddress === 'string'
        ? queryAddress.replace(/[^\d]/, '')
        : queryAddress.toString();

    // A raw string version of the query
    const rawFeature = typeof featureAddress === 'string'
        ? featureAddress.toLowerCase()
        : featureAddress.toString();
    // A numeric match version of the query
    const numericFeature = typeof featureAddress === 'string'
        ? featureAddress.replace(/[^\d]/, '')
        : featureAddress.toString();

    if (autocomplete) {
        return rawFeature.startsWith(rawQuery)
            || numericFeature.startsWith(numericQuery);
    }
    return (rawFeature === rawQuery
        || numericFeature === numericQuery);
}

/**
 * AddressMatcher for Queens Address Number Styles
 * This will match the raw string or the hyphenated Queens style number
 * If no hyphen is in the query, it will fallback to a numeric match
 * @param {string|number} queryAddress - Address number provided by the query
 * @param {string|number} featureAddress - Address number in the address cluster
 * @param {boolean} autocomplete - Whether to match on a partial result
 * @returns {boolean} - True if a match
 */
function matchesQueensAddress(queryAddress, featureAddress, autocomplete = false) {
    // A raw string version of the query
    const rawQuery = typeof queryAddress === 'string'
        ? queryAddress.toLowerCase()
        : queryAddress.toString();
    // A hyphenated numeric version of the query
    const hyphenatedQuery = typeof queryAddress === 'string'
        ? queryAddress.replace(/[^\d-]/, '')
        : queryAddress.toString();
    // A numeric match version of the query
    const numericQuery = typeof queryAddress === 'string'
        ? queryAddress.replace(/[^\d]/, '')
        : queryAddress.toString();

    // A raw string version of the query
    const rawFeature = typeof featureAddress === 'string'
        ? featureAddress.toLowerCase()
        : featureAddress.toString();
    // A hyphenated numeric version of the query
    const hyphenatedFeature = typeof featureAddress === 'string'
        ? featureAddress.replace(/[^\d-]/, '')
        : featureAddress.toString();
    // A numeric version of the feature
    const numericFeature = typeof featureAddress === 'string'
        ? featureAddress.replace(/[^\d]/, '')
        : featureAddress.toString();

    const containsHyphen = queryAddress.includes('-');

    if (autocomplete) {
        return rawFeature.startsWith(rawQuery)
            || hyphenatedFeature.startsWith(hyphenatedQuery)
            || (numericFeature.startsWith(numericQuery) && !containsHyphen);
    }
    return (rawFeature === rawQuery
        || hyphenatedFeature === hyphenatedQuery
        || (numericFeature === numericQuery && !containsHyphen));
}
