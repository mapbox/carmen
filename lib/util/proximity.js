var Point = require('turf-point');
var Distance = require('turf-distance');

var SphericalMercator = require('sphericalmercator');

var tileSize = 256;
var merc = new SphericalMercator({
    size: tileSize
});

module.exports.distance = distance;
module.exports.center2zxy = center2zxy;
module.exports.scoredist = scoredist;
module.exports._scoredist = _scoredist;

/**
 * distance - Return the distance in miles between a proximity point and a feature centroid
 *
 * @param {Array} proximity A lon/lat array
 * @param {Array} center A lon/lat array
 * @return {Float} distance in miles between prox & centroid
 */
function distance(proximity, center) {
    if (!proximity) return 0;
    return Distance(Point(proximity), Point(center), 'miles');
}

/**
 * center2zxy - given a lon/lat and zoom level return the zxy tile coordinates
 *
 * @param {Array} center A lon/lat array
 * @param {Integer} z Zoom level
 * @return {Array} zxy in format [z, x, y]
 */
function center2zxy(center, z) {
    center = [
        Math.min(180,Math.max(-180,center[0])),
        Math.min(85.0511,Math.max(-85.0511,center[1]))
    ]

    var px = merc.px(center, z);
    return [z, px[0] / tileSize, px[1] / tileSize];
}

/**
 * scoredist - calculates a value from the distance which is appropriate for
 *             comparison with _score values in an index
 *
 * @param {Array} proximity A lon/lat array
 * @param {Array} center A lon/lat array
 * @param {Float} scorefactor approximation of 1/8th of the max score for a given index
 * @return {Float} proximity adjusted score value
 */
function scoredist(proximity, center, scorefactor) {
    return _scoredist(scorefactor, distance(proximity, center));
}

/**
 * _scoredist - calculates a value from the distance which is appropriate for
 *              comparison with _score values in an index.
 *
 * Some definitions:
 * - when a feature is 40 miles from the user, it has 1/8th the max score
 * - when a feature is 5 miles from the user, it has 1x the max score
 * - when a feature is 1 mile from the user, it has 5x the max score
 * - when a feature is 0.1 miles from the user, it has 50x the max score
 *
 * Basically: once a feature is within a 5-10 mile radius of a user it starts
 * to become more relevant than other highly scored features in the index.
 *
 * @param {Float} scorefactor Approximation of 1/8th of the max score for a given index
 * @param {Float} dist A distance, in miles, between the center, or approximate center,
 *                     of a feature and the user's location (proximity).
 * @return {Float} proximity adjusted score value
 */

function _scoredist(scorefactor, dist) {
    return Math.round(scorefactor * (40/(Math.max(dist,0.0001))) * 10000) / 10000;
}

