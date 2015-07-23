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

var freq;
var zoom;
var token_replacer;

module.exports = {};
module.exports.runChecks = runChecks;
module.exports.loadDoc = loadDoc;

process.on('message', function(data) {
    if (data.freq && data.zoom && data.geocoder_tokens) {
        freq = data.freq;
        zoom = data.zoom;
        token_replacer = token.createReplacer(data.geocoder_tokens);
    } else {
        var patch = { grid: {}, docs: 0 };
        for (var i = 0; i < data.length; i++) {
            var err = loadDoc(patch, data[i], freq, zoom, token_replacer);
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

function loadDoc(patch, doc, freq, zoom, token_replacer) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    // doc._zxy must be set at this point
    if (!doc._zxy) {
        return 'doc._zxy undefined, failed indexing, doc id:' + doc._id;
    }

    // Limit doc._zxy length
    if (doc._zxy && doc._zxy.length > 10000) {
        return 'doc._zxy exceeded 10000, doc id:' + doc._id;
    }

    doc._hash = termops.feature(doc._id.toString());

    var xy = [];
    var l = doc._zxy.length;
    while (l--) {
        var zxy = doc._zxy[l].split('/');
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
                console.warn('[%d] phrase: %s @ %d', doc._id, phrases[y].text, phrases[y].relev);
            }

            patch.grid[phrase] = patch.grid[phrase] || [];

            l = xy.length;
            while (l--) {
                var encoded = null;
                try {
                    encoded = grid.encode({
                        id: doc._hash,
                        x: xy[l].x,
                        y: xy[l].y,
                        relev: phrases[y].relev,
                        score: Math.ceil(7*(doc._score || 0)/(maxScore||1))
                    });
                } catch(err) {
                    console.warn(err.toString() + ', doc id: ' + doc._id);
                }
                if (encoded) patch.grid[phrase].push(encoded);
            }
        }
    }

    patch.docs++;
}

