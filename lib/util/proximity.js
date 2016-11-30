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

/**
 * distance - Return the distance in miles between a proximity point and a feature.
 *
 * The distance returned is `min(distanceToCenter, distanceToFurthestCornerOfCover)`
 *
 * At the point this function is used, features do not have a full geometry loaded.
 * The `center` point is known to be within the feature. For very large features the center
 * point may be much further than the closest point in the feature. To make this calculation
 * more accurate we use the spatial information in the cover's x, y, z coord. Since
 * the feature is partially located somewhere in the cover's tile, the distance to the feature
 * must be smaller than the distance to the furthest corner in the tile.
 *
 * @param {Array} proximity A lon/lat array
 * @param {Array} center A lon/lat array
 * @param {Cover} a Cover that is known to cover the feature
 * @return {Float} distance in miles between prox & centroid or prox & the furthest point in cover
 */
function distance(proximity, center, cover) {
    if (!proximity) return 0;

    var centerDist = Distance(Point(proximity), Point(center), 'miles');
    // calculate the distance to the furthest corner of the cover
    var maxCoverDist = Math.max(
            distanceToXYZ(proximity, cover.x + 0, cover.y + 0, cover.zoom),
            distanceToXYZ(proximity, cover.x + 0, cover.y + 1, cover.zoom),
            distanceToXYZ(proximity, cover.x + 1, cover.y + 0, cover.zoom),
            distanceToXYZ(proximity, cover.x + 1, cover.y + 1, cover.zoom));
    return Math.min(centerDist, maxCoverDist);
}

function distanceToXYZ(proximity, x, y, z) {
    return Distance(Point(proximity), Point(merc.ll([x * tileSize, y * tileSize], z)), 'miles');
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
 * @param {Float} dist A distance, in miles, between the center, or approximate center,
 *                     of a feature and the user's location (proximity).
 * @return {Float} proximity adjusted score value
 */

function scoredist(dist, scorefactor) {
    return Math.round(scorefactor * (40/(Math.max(dist,0.0001))) * 10000) / 10000;
}

