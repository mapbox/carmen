'use strict';
const cheapRuler = require('cheap-ruler');

const SphericalMercator = require('@mapbox/sphericalmercator');

const tileSize = 256;
const merc = new SphericalMercator({
    size: tileSize
});
function tileCoord(x, y, z) {
    return merc.ll([x * tileSize, y * tileSize], z);
}

module.exports.distance = distance;
module.exports.center2zxy = center2zxy;
module.exports.scoredist = scoredist;
module.exports.distscore = distscore;
module.exports.meanScore = meanScore;

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

    const ruler = cheapRuler(proximity[1], 'miles');
    const centerDist = ruler.distance(proximity, center);

    // calculate the distance to the furthest corner of the cover
    const maxCoverDist = Math.max(
        ruler.distance(proximity, tileCoord(cover.x + 0, cover.y + 0, cover.zoom)),
        ruler.distance(proximity, tileCoord(cover.x + 0, cover.y + 1, cover.zoom)),
        ruler.distance(proximity, tileCoord(cover.x + 1, cover.y + 0, cover.zoom)),
        ruler.distance(proximity, tileCoord(cover.x + 1, cover.y + 1, cover.zoom)));
    return Math.min(centerDist, maxCoverDist);
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
    ];

    const px = merc.px(center, z);
    return [z, px[0] / tileSize, px[1] / tileSize];
}

/**
 * Combines score and distance into a single score that can be used for sorting.
 * The radius of effect is scaled to the zoom level of the feature tile, ranging from
 * 200 miles at z14 to 1,800 miles at z6. This value scales linearly, while tile size scales
 * exponentially, so the effect is relatively stronger at higher zoom levels.
 *
 * @param {Number} meanScore The geometric mean of the scores of the top 20 features.
 * @param {Number} dist The distance from the feature to the proximity point in miles.
 * @param {Number} zoom The index zoom level this scoredist is being calculated for.
 * @param {Number} radius Radius (in miles) to apply the scoredist
 * @return {Number} proximity adjusted score value
 */
function scoredist(meanScore, dist, zoom, radius) {
    zoom = Math.min(zoom, 14);
    const weightedRadius = radius * (15 - zoom);
    // flip distance to a float between 0-1, 1 being closest to the center point
    let distVal = 1 - Math.min(dist / weightedRadius, 1);
    // square to weight nearer features higher
    distVal = Math.pow(distVal, 2);
    // heuristic: the closest features can be up to 100x times the geometric mean
    return parseFloat((100 * meanScore * distVal).toFixed(4));
}

/**
 * Similar to `scoredist`, used for including score + distance when sorting features returned by a reverse query.
 * @param {Number} dist The distance in meters from the feature to the query point
 * @param {Number} score The feature's score
 * @return {Number} distance-adjusted score value
 */
function distscore(dist, score) {
    return Math.round(score * (1000 / (Math.max(dist, 50))) * 10000) / 10000;
}

/**
 * Calculate the geometric mean of features' carmen:score
 * @param {Array} features An array of carmen geojson feature objects
 * @return {Number} meanScore - geometric mean
 */
function meanScore(features) {
    const scoreProduct = features.reduce((scoreProduct, feat) => {
        if (isNaN(feat.properties['carmen:score'])) throw new Error('carmen:score is not a number');
        return scoreProduct * Math.max(feat.properties['carmen:score'], 1);
    }, 1);
    return Math.pow(scoreProduct, 1 / features.length);
}
