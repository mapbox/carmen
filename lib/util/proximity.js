var Point = require('turf-point');
var Distance = require('turf-distance');
var inside = require('turf-inside');
var cover = require('tile-cover');
var SphericalMercator = require('sphericalmercator');

module.exports.distance = distance;
module.exports.center2zxy = center2zxy;
module.exports.scoredist = scoredist;
module.exports.distanceToGeometry = distanceToGeometry;

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
 * Return the distance in miles to the nearest point in the geometry.
 * Returns 0 if the point is within the geometry.
 */
function distanceToGeometry(proximity, geometry) {
    if (!proximity) return 0;

    var dist = Infinity;
    var coordinates = geometry.coordinates;

    if (geometry.type === 'Point') {
        dist = distanceToPoint(proximity, coordinates);

    } else if (geometry.type === 'MultiPoint') {
        for (var i = 0; i < coordinates.length; i++) {
            dist = Math.min(dist, distanceToPoint(proximity, coordinates[i])); 
        }

    } else if (geometry.type === 'LineString') {
        dist = distanceToLineString(proximity, coordinates);

    } else if (geometry.type === 'MultiLineString') {
        dist = distanceToMultiLineString(proximity, coordinates);

    } else if (geometry.type === 'Polygon') {
        if (inside(proximity, { type: 'Feature', geometry: geometry })) return 0;
        dist = distanceToMultiLineString(proximity, coordinates);

    } else if (geometry.type === 'MultiPolygon') {
        if (inside(proximity, { type: 'Feature', geometry: geometry })) return 0;
        for (var p = 0; p < coordinates.length; p++) {
            dist = Math.min(dist, distanceToMultiLineString(proximity, coordinates[p]));
        }

    } else if (geometry.type === 'GeometryCollection') {
        for (var g = 0; g < geometry.geometries.length; g++) {
            dist = Math.min(dist, distanceToGeometry(proximity, geometry.geometries[g]));
            if (dist === 0) break;
        }
    } else {
        throw new Error("invalid geojson type: " + geometry.type);
    }
    return dist;
}

function distanceToMultiLineString(proximity, lineStrings) {
    var dist = Infinity;
    for (var i = 0; i < lineStrings.length; i++) {
        dist = Math.min(dist, distanceToLineString(proximity, lineStrings[i]));
    }
    return dist;
}

var mercator = new SphericalMercator();

function distSqr(a, b) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return dx * dx + dy * dy;
}

function distanceToLineString(proximity, line) {

    var nearest = null;
    var nearestDistSqr = Infinity;

    var p = mercator.forward(proximity);
    var a = mercator.forward(line[0]), b;
    for (var i = 1; i < line.length; i++, a = b) {
        b = mercator.forward(line[i]);

        var segmentLength = distSqr(a, b);

        var dxAB = b[0] - a[0];
        var dyAB = b[1] - a[1];
        var dxAP = p[0] - a[0];
        var dyAP = p[1] - a[1];

        // use dot product to find the length along the segment that the nearest point is at
        var t = (dxAP * dxAB + dyAP * dyAB) / segmentLength;

        var segmentNearest;
        if (t <= 0) {
            segmentNearest = a;
        } else if (t >= 1) {
            segmentNearest = b;
        } else {
            segmentNearest = [
                a[0] + dxAB * t,
                a[1] + dyAB * t
            ];
        }

        var segmentNearestDistSqr = distSqr(p, segmentNearest);
        if (segmentNearestDistSqr < nearestDistSqr) {
            nearestDistSqr = segmentNearestDistSqr;
            nearest = segmentNearest;
        }
    }

    return Distance(Point(proximity), Point(mercator.inverse(nearest)), 'miles');
}

function distanceToPoint(proximity, point) {
    return Distance(Point(proximity), Point(point), 'miles');
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
    var tiles = cover.tiles({
        type: 'Point',
        coordinates: center
    }, {
        min_zoom: z,
        max_zoom: z
    });
    return [ z, tiles[0][0], tiles[0][1] ];
}

/**
 * scoredist - calculates a value from the distance which is appropriate for
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
 * @param {Float} scorefactor Approximation of 1/8th of the max score for a given index
 * @return {Float} proximity adjusted score value
 */

function scoredist(dist, scorefactor) {
    return Math.round(scorefactor * (40/(Math.max(dist,0.0001))) * 10000) / 10000;
}

