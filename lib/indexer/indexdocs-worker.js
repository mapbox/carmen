var cover = require('tile-cover');
var ops = require('../util/ops');
var token = require('../util/token');
var termops = require('../util/termops');
var tilebelt = require('tilebelt');
var centroid = require('turf-point-on-surface');
var DEBUG = process.env.DEBUG;

var freq;
var zoom;
var known;
var token_replacer;

module.exports = {};
module.exports.runChecks = runChecks;
module.exports.loadDoc = loadDoc;
module.exports.verifyCenter = verifyCenter;

process.on('message', function(data) {
    if (data.freq && data.zoom && data.geocoder_tokens) {
        freq = data.freq;
        zoom = data.zoom;
        token_replacer = token.createReplacer(data.geocoder_tokens);
        known = { term:{} };
    } else {
        var patch = { grid: {}, term: {}, phrase: {}, degen: {}, docs: [] };
        for (var i = 0; i < data.length; i++) {
            var err = loadDoc(patch, data[i], freq, known, zoom);
            if (err) return process.send(err);
        }
        process.send(patch);
    }
});

function runChecks(doc, zoom) {
    if (!doc._id) {
        return 'doc has no _id';
    }
    else if (!doc._text) {
        return 'doc has no _text on _id:' + doc._id;
    }
    else if (!doc._center && !doc._geometry) {
        return 'doc has no _center or _geometry on _id:' + doc._id;
    }
    else if(!doc._zxy || doc._zxy.length === 0) {
        if(typeof zoom != 'number') {
            return 'index has no zoom on _id:'+doc._id;
        }
        if(zoom < 0) {
            return 'zoom must be greater than 0 --- zoom was '+zoom+' on _id:'+doc._id;
        }
        if(zoom > 14) {
            return 'zoom must be less than 15 --- zoom was '+zoom+' on _id:'+doc._id;
        }
    }
    if(doc._geometry && (doc._geometry.type === 'Polygon' || doc._geometry.type === 'MultiPolygon')) {
        // check for Polygons or Multipolygons with too many vertices
        var vertices = 0;
        if(doc._geometry.type === 'Polygon'){
            var ringCount = doc._geometry.coordinates.length;
            for (var i = 0; i < ringCount; i++) {
                vertices+= doc._geometry.coordinates[i].length;
            }
        } else {
            var polygonCount = doc._geometry.coordinates.length;
            for(var k = 0; k < polygonCount; k++) {
                var ringCount = doc._geometry.coordinates[k].length;
                for (var i = 0; i < ringCount; i++) {
                    vertices += doc._geometry.coordinates[k][i].length;
                }
            }
        }
        if (vertices > 50000){
            return 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts.';
        }
        // var intersections = kinks(doc._geometry);
        // if (intersections.length > 0) {
        //     return 'doc '+doc._text+' contains self intersection polygons at the following vertices:\n'+JSON.stringify(intersections);
        // }
    }
    return '';
}

function loadDoc(patch, doc, freq, known, zoom) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    var tiles;
    if (!doc._zxy || !doc._zxy.length) {
        tiles = cover.tiles(doc._geometry, {min_zoom: zoom, max_zoom: zoom});
        doc._zxy = [];
        tiles.forEach(function(tile){
            doc._zxy.push(tile[2]+'/'+tile[0]+'/'+tile[1]);
        });
        if(!doc._center || !verifyCenter(doc._center, tiles)) {
            console.warn('doc._center did not fall within the provided geometry for %s (%s). Calculating new point on surface.',
                doc._id, doc._text);
            doc._center = centroid(doc._geometry).geometry.coordinates;
            if(!verifyCenter(doc._center, tiles)) {
                return 'Invalid doc._center provided, and unable to calculate corrected centroid. Verify validity of doc._geometry for doc id:' + doc._id;
            } else {
                console.warn('new: doc._center: ', doc._center);
                console.warn('new: doc._zxy:    ', doc._zxy);
            }
        }
    }

    // Limit doc._zxy length
    if (doc._zxy && doc._zxy.length > 10000) {
        return 'doc._zxy exceeded 10000, doc id:' + doc._id;
    }

    doc._hash = termops.feature(doc._id.toString());
    doc._grid = doc._grid || [];
    if (doc._zxy) for (var i = 0; i < doc._zxy.length; i++) {
        doc._grid.push(ops.zxy(doc._hash, doc._zxy[i]));
    } else {
        return 'doc failed indexing, doc id:' + doc._id;
    }

    var texts = termops.getIndexableText(token_replacer, doc._text);
    var termsets = [];
    var termsmaps = [];
    var tokensets = [];
    for (var x = 0; x < texts.length; x++) {
        var tokens = texts[x];
        termsets.push(termops.termsWeighted(tokens, freq));
        termsmaps.push(termops.termsMap(tokens));
        tokensets.push(tokens);
    }

    for (var x = 0; x < termsets.length; x++) {
        var terms = termsets[x];
        var sigid = null;
        var sigweight = 0;
        var termsmap = termsmaps[x];

        for (var i = 0; i < terms.length; i++) {
            // Decode the term id, weight from weighted terms.
            var id = terms[i] >>> 4 << 4 >>> 0;
            var weight = terms[i] % 16;
            if (weight > sigweight) {
                sigid = id;
                sigweight = weight;
            }

            // This check avoids doing redundant work for a term once
            // it is known to be indexed. @TODO known issue, this prevents
            // degens from being used as an approach to avoiding fnv1a term
            // collisions.
            if (known.term[id]) continue;
            known.term[id] = true;

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
            var degens = termops.degens(termsmap[id]);
            for (var j = 0; j < degens.length; j = j+2) {
                var d = degens[j];
                patch.degen[d] = patch.degen[d] || [];
                patch.degen[d].push(degens[j+1]);
            }
        }

        // Generate phrase, clustered by most significant term.
        var phrase = termops.phrase(tokensets[x], termsmap[sigid]);
        patch.phrase[phrase] = patch.phrase[phrase] || terms;
        patch.term[sigid] = patch.term[sigid] || [];
        patch.term[sigid].push(phrase);
        patch.grid[phrase] = patch.grid[phrase] || [];
        patch.grid[phrase].push.apply(patch.grid[phrase], doc._grid);
        // Debug significant term selection.
        if (DEBUG) {
            var oldtext = terms.map(function(id) {
                id = id >>> 4 << 4 >>> 0;
                return termsmap[id];
            }).join(' ');
            var textWeight = terms.map(function(id) {
                var weight = id % 16;
                id = id >>> 4 << 4 >>> 0;
                return weight;
            });
            console.log('#', oldtext, '->', termsmap[sigid], textWeight);
        }
    }

    patch.docs.push(doc);
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while(!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if(center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}
