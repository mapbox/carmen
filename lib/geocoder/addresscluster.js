'use strict';
module.exports.forward = forward;
module.exports.forwardPrefix = forwardPrefix;
module.exports.forwardPrefixFiltered = forwardPrefixFiltered;
module.exports.reverse = reverse;

const proximity = require('../util/proximity');

/**
 * Given a feature, calculate the desired properties for
 * an individual address using the carmen:addressprops key
 *
 * @param {Object} feat GeoJSON Feature
 * @param {Number} idx Address Point IDX to calculate properties for
 * @returns Object GeoJSON Feature
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
 *
 * @return {Array|false} Array of potential address feats or false
 */
function forward(feat, address, num = 10) {
    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    // Check both forms of the address (raw, number-parsed)
    const a1 = typeof address === 'string' ? address.toLowerCase() : address;
    const a2 = typeof address === 'string' ? address.replace(/\D/, '') : address;

    const cluster = feat.properties['carmen:addressnumber'];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        // this code identifies all the indexes of cluster[c_it] that have a1 or, if that fails, a2
        // equivalent approximately to python [i for i,e in enumerate(cluster[c_it]) if e == a1]
        // expressed as a reduction starting with an empty array `a` that, if the value e at each step
        // `e` is equal to `a1`, gets the current index `i` appended to it
        // more info at https://stackoverflow.com/questions/20798477/how-to-find-index-of-all-occurrences-of-element-in-array#comment69744472_20798754
        let a_index = cluster[c_it].reduce((a, e, i) => { return (e === a1) ? a.concat(i) : a; }, []);
        if (!a_index.length) a_index = cluster[c_it].reduce((a, e, i) => { return (e === a2) ? a.concat(i) : a; }, []);

        // Check is cluster is pt geom
        if (a_index.length && feat.geometry.geometries[c_it].type === 'MultiPoint') {
            return a_index.slice(0, num).map((idx) => {
                const feat_clone = JSON.parse(JSON.stringify(feat));

                properties(feat_clone, idx);

                feat_clone.geometry = {
                    type:'Point',
                    coordinates: [
                        Math.round(feat.geometry.geometries[c_it].coordinates[idx][0] * 1e6) / 1e6,
                        Math.round(feat.geometry.geometries[c_it].coordinates[idx][1] * 1e6) / 1e6
                    ]
                };

                return feat_clone;
            });
        }
    }

    return false;
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

    // Check both forms of the address (raw, number-parsed)
    const a1 = typeof address === 'string' ? address.toLowerCase() : ('' + address).toLowerCase();

    const cluster = feature.properties['carmen:addressnumber'];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        // this code identifies all the indexes of cluster[c_it] that start with a1
        // using a similar strategy as above in forward, but with matching prefixes
        // instead of exact numbers
        const a_index = cluster[c_it].reduce((a, e, i) => {
            const element = typeof e === 'string' ? e : ('' + e);
            return element.startsWith(a1) ? a.concat(i) : a;
        }, []);

        // Check if cluster is pt geom
        if (a_index.length && feature.geometry.geometries[c_it].type === 'MultiPoint') {
            return a_index.map((idx) => {
                return {
                    idx: idx,
                    number: cluster[c_it][idx],
                    numberAsInt: parseInt(cluster[c_it][idx], 10),
                    geometry: {
                        type:'Point',
                        coordinates: feature.geometry.geometries[c_it].coordinates[idx]
                    }
                };
            });
        }
    }

    return [];
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

    if (matchingAddressPoints.length > 0) {
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
