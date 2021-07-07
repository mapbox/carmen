'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line').default;

module.exports = routablePoints;


/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {!Object|!Array} point Point geojson geometry object or coordinate array
 * @param {!Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array|null} Lon,lat coordinate array of the routable point
 */
function routablePoints(point, feature, routable_override) {
    const defaultResult = {
        points: null
    };

    if (!point || !Object.keys(point).length || !feature || !Object.keys(feature).length) {
        return null;
    }

    // Skip if routable_points is not already set
    // TODO: Revisit what routable_points already being set will actually look like.
    // For now this assumes it's in properties['carmen:routable_points'] to signify that it was added at index time
    if (routable_override) {
        return {
            points: [{ coordinates: routable_override }]
        };
    }

    // If the point is interpolated, return the existing point coordinates
    if (point.interpolated) {
        return {
            points: [{ coordinates: point.coordinates }]
        };
    }

    // Get LineString from feature geometry
    const featureLineString = _findLineString(feature);


    const nearestPoint = featureLineString ? nearestPointOnLine(featureLineString, point) : null;

    if (!nearestPoint) {
        return defaultResult;
    }

    // Round coordinates to 6 decimal places
    const e6 = Math.pow(10, 6);
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * e6) / e6
    );

    return {
        points: [{ coordinates: nearestPointCoords }]
    };
}


/**
 * Finds the LineString geometry in a GeoJSON feature, if it exists
 *
 * @param {Object} feature GeoJSON feature
 * @return {Object} geometry GeoJSON geometry object
 */
function _findLineString(feature) {
    const { geometry } = feature;

    if (!geometry) {
        return null;
    }

    if (geometry.geometries) {
        const results = geometry.geometries.find(
            (geom) => geom.type === 'MultiLineString' || geom.type === 'LineString'
        );
        return results;
    }

    if (geometry.type === 'MultiLineString' || geometry.type === 'LineString') {
        return geometry;
    }
}

