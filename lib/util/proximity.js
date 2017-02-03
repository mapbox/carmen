var Point = require('@turf/helpers').point;
var Distance = require('@turf/distance');

var SphericalMercator = require('@mapbox/sphericalmercator');

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
 * Combines score and distance into a single score that can be used for sorting.
 *
 * The radius of effect is scaled to the zoom level of the feature tile, ranging from
 * 40 miles at z14 to 360 miles at z6. This value scales linearly, while tile size scales
 * exponentially, so the effect is relatively stronger at higher zoom levels.
 *
 * @param {Number} meanScore The geometric mean of the scores of the top 20 features.
 * @param {Number} dist The distance from the feature to the proximity point.
 * @return {Number} proximity adjusted score value
 */
function scoredist(meanScore, dist, zoom) {
    var radius = 40 * (15 - zoom);
    return Math.round(meanScore * (radius/(Math.max(dist,0.0001))) * 10000) / 10000;
}
