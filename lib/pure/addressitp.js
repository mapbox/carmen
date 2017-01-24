var parseSemiNumber = require('../util/termops').parseSemiNumber;

module.exports.calculateDistance = calculateDistance;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getReversePoint = getReversePoint;
module.exports.lineIntersects = lineIntersects;
module.exports.standardize = standardize;
module.exports.matchSide = matchSide;
module.exports.setPoint = setPoint;
module.exports.reverse = reverse;
module.exports.forward = forward;
module.exports.det2D = det2D;
module.exports.sign = sign;

var turf = {
    distance: require('@turf/distance'),
    bearing: require('@turf/bearing'),
    destination: require('@turf/destination'),
    point: require('turf-point'),
    linestring: require('turf-linestring'),
    lineDistance: require('@turf/line-distance'),
    center: require('@turf/center')
};

var O = { O: true, B: true, '': true };
var E = { E: true, B: true, '': true };

function standardize(feat, k) {
    var ranges = [];

    // features without address data at all, on either side of the street
    if (k === null || k === undefined || feat.properties['carmen:rangetype'] !== 'tiger' || !feat.geometry || !feat.geometry.geometries || feat.geometry.geometries[k].type !== 'MultiLineString') return ranges;

    var stdFeat = {
        lines: feat.geometry.geometries[k].coordinates,
        lf: feat.properties['carmen:lfromhn'] ? feat.properties['carmen:lfromhn'][k] : [],
        lt: feat.properties['carmen:ltohn'] ? feat.properties['carmen:ltohn'][k] : [],
        rf: feat.properties['carmen:rfromhn'] ? feat.properties['carmen:rfromhn'][k] : [],
        rt: feat.properties['carmen:rtohn'] ? feat.properties['carmen:rtohn'][k] : [],
        lp: feat.properties['carmen:parityl'] ? feat.properties['carmen:parityl'][k] : [],
        rp: feat.properties['carmen:parityr'] ? feat.properties['carmen:parityr'][k] : []
    };
    // convert feature into array of ranges so it can be sorted
    // into a stable-orderd array.
    var i = stdFeat.lines.length;
    while (i--) {
        var f = {
            i: i,
            lf: parseSemiNumber(stdFeat.lf[i]+''),
            rf: parseSemiNumber(stdFeat.rf[i]+''),
            lt: parseSemiNumber(stdFeat.lt[i]+''),
            rt: parseSemiNumber(stdFeat.rt[i]+''),
            lp: stdFeat.lp[i] || '',
            rp: stdFeat.rp[i] || '',
            lines: stdFeat.lines[i].slice(0)
        };
        ranges.push(f);
    }
    ranges.sort(sortRanges);
    return ranges;
}

function sortRanges(a, b) {
    return (a.lf - b.lf) ||
        (a.rf - b.rf) ||
        (a.lt - b.lt) ||
        (a.rt - b.rt) ||
        (a.lp - b.lp) ||
        (a.rp - b.rp) ||
        (a.lines.length - b.lines.length) ||
        (a.i - b.i);
}

function forward(feature, address) {
    if (!feature.geometry || feature.geometry.type !== 'GeometryCollection') return false;

    address = typeof address === 'string' ? address.replace(/\D/, '') : address;

    // Store the nearest endpoint during iteration over lines.
    // The nearest endpoint is used for any addresses that do
    // not have strict or loose range matches and fall within
    // a given threshold (e.g. within 400 housnums of the address).
    var nearest = {hn:Infinity,pt:null};
    var loose = null;

    for (var f_it = 0; f_it < feature.geometry.geometries.length; f_it++) {
        var ranges = standardize(feature, f_it);
        var i = ranges.length;
        if (!i) continue;

        while (i--) {
            var f = ranges[i];
            if (!f.lf && !f.rf && !f.lt && !f.rt) continue;
            var paritymask = (address % 2) === 0 ? E : O;

            // strict L match
            if (typeof f.lf === 'number' &&
                address >= Math.min(f.lf,f.lt) &&
                address <= Math.max(f.lf,f.lt) &&
                paritymask[f.lp]) {
                return setPoint(address, f.lf, f.lt, f.lines);
            // strict R match
            } else if (typeof f.rf === 'number' &&
                address >= Math.min(f.rf,f.rt) &&
                address <= Math.max(f.rf,f.rt) &&
                paritymask[f.rp]) {
                return setPoint(address, f.rf, f.rt, f.lines);
            // loose L match (no parity check)
            } else if (typeof f.lf === 'number' &&
                address >= Math.min(f.lf,f.lt) &&
                address <= Math.max(f.lf,f.lt)) {
                loose = { from: f.lf, to: f.lt, line: f.lines };
                continue;
            // loose R match (no parity check)
            } else if (typeof f.rf === 'number' &&
                address >= Math.min(f.rf,f.rt) &&
                address <= Math.max(f.rf,f.rt)) {
                loose = { from: f.rf, to: f.rt, line: f.lines };
                continue;
            // no range match, store line endpoint if closest so far
            } else {
                var hns = [f.lf, f.lt, f.rf, f.rt];
                for (var j = 0; j < 4; j++) {
                    if (typeof hns[j] !== 'number') continue;
                    if (Math.abs(address - nearest.hn) < Math.abs(address - hns[j])) continue;
                    nearest.hn = hns[j];
                    nearest.pt = j % 2 === 0 ? f.lines[0] : f.lines[1];
                }
                continue;
            }
        }
    }

    // Prioritize Loose match.
    if (loose) {
        return setPoint(address, loose.from, loose.to, loose.line, true);
    }

    // If the nearest line endpoint falls within our
    // threshold use it as a fallback.
    if (Math.abs(address - nearest.hn) <= 400) {
        return setPoint(address, nearest.hn, nearest.hn, [nearest.pt, nearest.pt], true);
    }
};

function reverse(feat, query) {
    if (feat.geometry.type !== 'GeometryCollection') return false;
    if (feat.properties['carmen:rangetype'] !== "tiger") return false;

    var potential;
    var potentialRange;

    for (var f_it = 0; f_it < feat.geometry.geometries.length; f_it++) {
        if (feat.geometry.geometries[f_it].type !== 'MultiLineString') continue;

        var ranges = standardize(feat, f_it);

        var i = ranges.length;
        if (!i) continue;

        //Loop through each coord segment to find shortest distance between seg and query
        while (i--) {
            var currentRange = ranges[i];
            var current = getReversePoint(query, currentRange.lines, 'miles');
            if (!potential || current.pt.properties.dist < potential.pt.properties.dist) {
                potential = current;
                potentialRange = currentRange;
            }
        }
    }
    if (!potential) return false;

    //Determine which side of the line the point is on
    var sideBinary = sign(det2D(potential.startLine.geometry.coordinates, potential.endLine.geometry.coordinates, query));
    var leftSideBinary = sign(det2D(
        potential.startLine.geometry.coordinates,
        potential.endLine.geometry.coordinates,
        turf.destination(
            turf.center(turf.linestring([potential.startLine.geometry.coordinates, potential.endLine.geometry.coordinates])),
            0.01,
            turf.bearing(potential.startLine, potential.endLine) - 90,
            'miles').geometry.coordinates));

    var num;
    if (sideBinary === leftSideBinary) { //If point is on the centre
        num = matchSide(potentialRange, "left", potential);
    } else { //If point is on the right or on the line
        num =  matchSide(potentialRange, "right", potential);
    }

    if (num) feat.properties['carmen:address'] = num;
    feat.geometry = potential.pt.geometry;
    return feat;
}

/**
* Returns the house number for a given point on an itp line
*
* @param feat {Object} feature object
* @param side {String} "left" or "right"
* @param point {Object} cenre point with index info
* @param strict {boolean} if false will check other side of street if data is missing
* @return Numeric Returns housenumber
*/
function matchSide(range, side, point, strict) {
    var opp = (side === "left") ? "right" : "left";
    var sideVar = (side === "left") ?
        {parity: "lp",to: "lt",from: "lf" } :
        {parity: "rp",to: "rt",from: "rf" };

    //If side x doesn't have data, check the other side
    if (range && !range[sideVar.parity] && !strict) return matchSide(range, opp, point, true);
    if (range && !range[sideVar.parity] && strict) return null;

    var distRatio = point.pt.properties.travelled / point.lineDist;
    var from = parseInt(range[sideVar.from]);
    var to = parseInt(range[sideVar.to]);
    var num = from + (to - from) * distRatio;

    if (range[sideVar.parity] === "O") {
        num = Math.round((num + 1) / 2) * 2 - 1;
    } else if (range[sideVar.parity] === "E") {
        num = Math.round(num / 2) * 2;
    } else {
        num = Math.round(num);
    }

    return num;
}

function det2D(start, end, query) { return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]); }
function sign(num) { return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN; }

//Accepts pt array and coords array for line.
//ie getReversePoint([1,1], [[0,0], [1,1]])
function getReversePoint(pt, coords, units) {
    var i; //Loop Iterator
    pt = turf.point(pt);
    var closestPt = turf.point([Infinity, Infinity], {
        dist: Infinity
    });
    var travelled = 0;

    for (i = 0; i < coords.length - 1; i++) {
        var start = turf.point(coords[i]);
        var stop = turf.point(coords[i + 1]);
        //start
        start.properties.dist = turf.distance(pt, start, units);
        //stop
        stop.properties.dist = turf.distance(pt, stop, units);
        //perpendicular
        var direction = turf.bearing(start, stop);
        var perpendicularPt = turf.destination(pt, 1000, direction + 90, 'miles'); // 10000 = gross
        var intersect = lineIntersects(
            pt.geometry.coordinates[0],
            pt.geometry.coordinates[1],
            perpendicularPt.geometry.coordinates[0],
            perpendicularPt.geometry.coordinates[1],
            start.geometry.coordinates[0],
            start.geometry.coordinates[1],
            stop.geometry.coordinates[0],
            stop.geometry.coordinates[1]
        );
        if (!intersect) {
            perpendicularPt = turf.destination(pt, 1000, direction - 90, 'miles'); // 10000 = gross
            intersect = lineIntersects(
                pt.geometry.coordinates[0],
                pt.geometry.coordinates[1],
                perpendicularPt.geometry.coordinates[0],
                perpendicularPt.geometry.coordinates[1],
                start.geometry.coordinates[0],
                start.geometry.coordinates[1],
                stop.geometry.coordinates[0],
                stop.geometry.coordinates[1]
            );
        }
        perpendicularPt.properties.dist = Infinity;
        var intersectPt;
        if (intersect) {
            intersectPt = turf.point(intersect);
            intersectPt.properties.dist = turf.distance(pt, intersectPt, units);
        }

        if (start.properties.dist < closestPt.properties.dist) {
            closestPt = start;
            closestPt.properties.travelled = travelled;
        }
        if (stop.properties.dist < closestPt.properties.dist) {
            closestPt = stop;
            closestPt.properties.travelled = travelled + turf.distance(turf.point(coords[i]), stop, units);
        }
        if (intersectPt && intersectPt.properties.dist < closestPt.properties.dist) {
            closestPt = intersectPt;
            closestPt.properties.travelled = travelled + turf.distance(turf.point(coords[i]), intersectPt, units);
        }

        closestPt.properties.index = i;
        travelled += turf.distance(turf.point(coords[i]), turf.point(coords[i + 1]), units);
    }

    return {
        lineDist: turf.lineDistance(turf.linestring(coords), 'miles'),
        pt: closestPt,
        startLine: turf.point(coords[closestPt.properties.index]),
        endLine: turf.point(coords[closestPt.properties.index + 1])
    };
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function lineIntersects(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
            x: null,
            y: null,
            onLine1: false,
            onLine2: false
        };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator === 0) {
        if (result.x !== null && result.y !== null) {
            return result;
        } else {
            return false;
        }
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));

    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    if (result.onLine1 && result.onLine2) {
        return [result.x, result.y];
    } else {
        return false;
    }
}

function setPoint(address, start, end, coords, omitted) {
    // swap start and end, reverse coords
    if (start > end) {
        var _;
        _ = end;
        end = start;
        start = _;
        coords.reverse();
    }

    // a normalized number between 0 and 1
    // if start and end are identical use the starting endpoint (0)
    var part = end - start ? (address - start) / (end - start) : 0;

    var distance = calculateDistance(coords);
    var unnorm = part * distance;

    var stop;
    for (stop = 1; stop < coords.length - 1; stop++) {
        if (coords[stop][2] > unnorm) break;
    }

    var range = coords[stop][2] - coords[stop - 1][2];
    var interp = range ? (unnorm - coords[stop - 1][2]) / range : 1;

    var geom = {
        type:'Point',
        coordinates: [
            coords[stop][0] * interp + coords[stop - 1][0] * (1 - interp),
            coords[stop][1] * interp + coords[stop - 1][1] * (1 - interp)
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        }),
        interpolated: true
    };
    if (omitted) geom.omitted = true;
    return geom;
}

function calculateDistance(coords) {
    var a, b, distance = 0;
    coords[0].push(distance);
    for (var j = 1; j < coords.length; j++) {
        a = coords[j - 1];
        b = coords[j];
        distance += Math.sqrt(
            ((a[0] - b[0]) * (a[0] - b[0])) +
            ((a[1] - b[1]) * (a[1] - b[1])));
        coords[j].push(distance);
    }
    return distance;
}

