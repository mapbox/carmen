const SphericalMercator = require('@mapbox/sphericalmercator');
const bboxClip = require('@turf/bbox-clip');
const extent = require('@turf/bbox');

const merc = new SphericalMercator({
    size: 256
});

module.exports.inside = inside;
module.exports.insideTile = insideTile;
module.exports.intersect = intersect;
module.exports.crossAntimeridian = crossAntimeridian;
module.exports.clipBBox = clipBBox;
/**
* inside - Return whether a coordinate is inside a bounding box.
* @param {Array} coordinates A lon/lat array
* @param {Array} bbox A bounding box array in the format [minX, minY, maxX, maxY]
* @return {boolean} Is the point inside the bbox
*/
function inside(coordinates, bbox) {
    return !(coordinates[0] < bbox[0] ||
        coordinates[0] > bbox[2] ||
        coordinates[1] < bbox[1] ||
        coordinates[1] > bbox[3]);
}

/**
* insideTile - Return bounding box in xyz coordinate format
* @param {Array} bbox A bounding box array in the format [minX, minY, maxX, maxY]
* @param {number} zoom The zoom level of the xyz bounds
* @return {Array} An xyz bounding box array in the format [zoom, xyz.minX, xyz.minY, xyz.maxX, xyz.maxY]
*/

function insideTile(bbox, zoom) {
    const xyz = merc.xyz(bbox, zoom);
    const obj = [zoom, xyz.minX, xyz.minY, xyz.maxX, xyz.maxY];
    return obj;
}

/**
* intersect - Return whether two bounding boxes intersect
* @param {Array} bbox1 A bounding box array in the format [minX, minY, maxX, maxY]
* @param {Array} bbox2 A bounding box array in the format [minX, minY, maxX, maxY]
* @return {boolean} Do the two bounding boxes intersect
*/

function intersect(bbox1, bbox2) {
    return !(bbox1[0] > bbox2[2] || bbox1[2] < bbox2[0] ||
             bbox1[1] > bbox2[3] || bbox1[3] < bbox2[1]);
}

/**
* crossAntimeridian - Return a smaller bbox when a feature straddles the antimeridian
* @param {Object} geom A geojson geometry
* @param {Array} boundingBox A bounding box array in the format [minX, minY, maxX, maxY]
* @return {Array} A bounding box array in the format [W, S, E, N]
*/

function crossAntimeridian(geom, boundingBox) {
    const westHemiBBox = [-180,-90,0,90];
    const eastHemiBBox = [0,-90,180,90];

    const clippedEastGeom = bboxClip(geom, eastHemiBBox);
    const clippedWestGeom = bboxClip(geom, westHemiBBox);

    const bboxTotal = boundingBox || extent(geom);
    const bboxEast = extent(clippedEastGeom);
    const bboxWest = extent(clippedWestGeom);

    const amBBox = [bboxEast[0],bboxTotal[1],bboxWest[2],bboxTotal[3]];
    const pmBBox = [bboxWest[0],bboxTotal[1],bboxEast[2],bboxTotal[3]];

    const pmBBoxWidth = (bboxEast[2]) + Math.abs(bboxWest[0]);
    const amBBoxWidth = (180 - bboxEast[0]) + (180 - Math.abs(bboxWest[2]));

    if (pmBBoxWidth > amBBoxWidth) {
        return amBBox;
    } else {
        return pmBBox;
    }
}

function clipBBox(bbox) {
    // First check if the bbox needs to be clipped at the antimeridian
    if (bbox[0] < bbox[2]) return bbox;

    // If bbox crosses the antimeridian, clip at +/-179.9 and return the larger side
    if (Math.abs(bbox[0]) > Math.abs(bbox[2])) {
        bbox[0] = -179.9
    } else {
        bbox[2] = 179.9
    }
    return bbox;
}
