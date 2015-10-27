var mp32 = Math.pow(2,32);
var cover = require('tile-cover');
var ops = require('../util/ops');
var grid = require('../util/grid');
var token = require('../util/token');
var termops = require('../util/termops');
var tilebelt = require('tilebelt');
var centroid = require('turf-point-on-surface');
var DEBUG = process.env.DEBUG;
var uniq = require('../util/uniq');
var extent = require('turf-extent');

var freq;
var zoom;
var token_replacer;

module.exports = {};
module.exports.runChecks = runChecks;
module.exports.loadDoc = loadDoc;
module.exports.verifyCenter = verifyCenter;

process.on('message', function(data) {
    if (data.freq && data.zoom && data.replacer) {
        freq = data.freq;
        zoom = data.zoom;
        token_replacer = token.parse(data.replacer);
    } else {
        var patch = { grid: {}, docs: [] };
        for (var i = 0; i < data.length; i++) {
            var err = loadDoc(patch, data[i], freq, zoom, token_replacer);
            if (err) return process.send(err);
        }
        process.send(patch);
    }
});

function runChecks(doc, zoom) {
    if (!doc.id) {
        return 'doc has no id';
    } else if (!doc.geometry) {
        return 'doc has no geometry on id:' + doc.id;
    } else if (!doc.properties) {
        return 'doc has no properties on id:' + doc.id;
    } else if (!doc.properties["carmen:text"]) {
        return 'doc has no carmen:text on id:' + doc.id;
    } else if (!doc.properties["carmen:center"]) {
        return 'doc has no carmen:center on id:' + doc.id;
    } else if (!doc._zxy || doc._zxy.length === 0) {
        if (typeof zoom != 'number') {
            return 'index has no zoom on id:'+doc.id;
        } else if (zoom < 0) {
            return 'zoom must be greater than 0 --- zoom was '+zoom+' on id:'+doc.id;
        } else if (zoom > 14) {
            return 'zoom must be less than 15 --- zoom was '+zoom+' on id:'+doc.id;
        }
    }

    if (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon') {
        // check for Polygons or Multipolygons with too many vertices
        var vertices = 0;
        if (doc.geometry.type === 'Polygon') {
            var ringCount = doc.geometry.coordinates.length;
            for (var i = 0; i < ringCount; i++) {
                vertices+= doc.geometry.coordinates[i].length;
            }
        } else {
            var polygonCount = doc.geometry.coordinates.length;
            for (var k = 0; k < polygonCount; k++) {
                var ringCount = doc.geometry.coordinates[k].length;
                for (var i = 0; i < ringCount; i++) {
                    vertices += doc.geometry.coordinates[k][i].length;
                }
            }
        }
        if (vertices > 50000) {
            return 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:' + doc.id;
        }
    }
    return '';
}

function loadDoc(patch, doc, freq, zoom, token_replacer) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    var tiles = [];
    if (!doc.properties['carmen:zxy']) {
        tiles = cover.tiles(doc.geometry, {min_zoom: zoom, max_zoom: zoom});
        doc.properties['carmen:zxy'] = [];
        tiles.forEach(function(tile) {
            doc.properties['carmen:zxy'].push(tile[2]+'/'+tile[0]+'/'+tile[1]);
        });
    } else {
        doc.properties['carmen:zxy'].forEach(function(tile) {
            tile = tile.split('/')
            tiles.push([tile[1], tile[2], tile[0]]);
        });
    }
    if (!doc.properties["carmen:center"] || !verifyCenter(doc.properties["carmen:center"], tiles)) {
        console.warn('carmen:center did not fall within the provided geometry for %s (%s). Calculating new point on surface.',
            doc.id, doc.properties["carmen:text"]);
        doc.properties["carmen:center"] = centroid(doc.geometry).geometry.coordinates;
        if (!verifyCenter(doc.properties["carmen:center"], tiles)) {
            return 'Invalid carmen:center provided, and unable to calculate corrected centroid. Verify validity of doc.geometry for doc id:' + doc.id;
        } else {
            console.warn('new: carmen:center: ', doc.properties["carmen:center"]);
            console.warn('new: zxy:    ', doc.properties['carmen:zxy']);
        }
    }

    if (!doc.bbox && (doc.geometry.type === 'MultiPolygon' || doc.geometry.type === 'Polygon')) {
        doc.bbox = extent(doc.geometry);
    }

    // zxy must be set at this point
    if (!doc.properties['carmen:zxy']) {
        return 'doc.properties[\'carmen:zxy\'] undefined, failed indexing, doc id:' + doc.id;
    }

    // Limit carmen:zxy length
    if (doc.properties['carmen:zxy'] && doc.properties['carmen:zxy'].length > 10000) {
        return 'zxy exceeded 10000, doc id:' + doc.id;
    }

    doc.properties['carmen:hash'] = termops.feature(doc.id.toString());

    var xy = [];
    var l = doc.properties['carmen:zxy'].length;
    while (l--) {
        var zxy = doc.properties['carmen:zxy'][l].split('/');
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        if (zxy[1] < 0 || zxy[2] < 0) continue;
        xy.push({ x:zxy[1], y:zxy[2] });
    }

    var maxScore = freq[1][0] || 0;
    var texts = termops.getIndexableText(token_replacer, doc);
    var phraseUniq = {};
    for (var x = 0; x < texts.length; x++) {
        var phrases = termops.getIndexablePhrases(texts[x], freq);
        for (var y = 0; y < phrases.length; y++) {
            var phrase = phrases[y].phrase;

            // Make sure the phrase is only counted once per doc.
            // Synonyms and other multiple text situations can
            // create dupe phrases.
            if (phraseUniq[phrase]) continue;
            phraseUniq[phrase] = true;

            if (DEBUG && !phrases[y].degen) {
                console.warn('[%d] phrase: %s @ %d', doc.id, phrases[y].text, phrases[y].relev);
            }

            patch.grid[phrase] = patch.grid[phrase] || [];

            l = xy.length
            while (l--) {
                var encoded = null;
                try {
                    encoded = grid.encode({
                        id: doc.properties['carmen:hash'],
                        x: xy[l].x,
                        y: xy[l].y,
                        relev: phrases[y].relev,
                        score: Math.ceil(7*(doc.properties["carmen:score"] || 0)/(maxScore||1))
                    });
                } catch (err) {
                    console.warn(err.toString() + ', doc id: ' + doc.id);
                }
                if (encoded) patch.grid[phrase].push(encoded);
            }
        }
    }

    patch.docs.push(doc);
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while (!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if (center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}
