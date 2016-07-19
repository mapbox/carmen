// var docsworker = require('./indexdocs-worker');
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
var point = require('turf-point');
var linestring = require('turf-linestring');
var geojsonHint = require('geojsonhint');
var token = require('../util/token');

module.exports = {};
module.exports = indexdocs;
module.exports.loadDoc = loadDoc;
module.exports.runChecks = runChecks;
module.exports.verifyCenter = verifyCenter;

function indexdocs(docs, freq, zoom, geocoder_tokens, callback) {
    if (typeof zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom));
    if (zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+zoom));

    var full = { grid: {}, text:[], docs:[], vectors:[] };
    var settings = {freq:freq, zoom:zoom, geocoder_tokens:geocoder_tokens};

    function error(err) {
        if (!callback) return;
        callback(err);
        callback = false;
    }

    var err = parseDocs(docs, settings, full);
    if (err) {
        return error(new Error(err));
    }
    callback && callback(null, full);
}

function parseDocs(docs, settings, full) {
    var freq = settings.freq;
    var zoom = settings.zoom;
    var token_replacer = token.createReplacer(settings.geocoder_tokens);

    for (var i = 0; i < docs.length; i++) {
        var ld = loadDoc(full, docs[i], freq, zoom, token_replacer);
        if (typeof ld === 'string') { return err; }
        else docs[i] = ld;

        //Create vectorizable version of doc
        if (docs[i].properties['carmen:addressnumber']) {
            docs[i].properties.id = docs[i].id;
            for (var addr_it = 0; addr_it < docs[i].properties['carmen:addressnumber'].length; addr_it++) {
                var feat = JSON.parse(JSON.stringify(docs[i]));
                feat.properties['carmen:addressnumber'] = feat.properties['carmen:addressnumber'][addr_it];
                feat.properties['carmen:center'] = feat.geometry.coordinates[addr_it];
                feat = point(feat.geometry.coordinates[addr_it], feat.properties);
                feat.id = feat.properties.id;
                full.vectors.push(feat);
            }
        } else if (docs[i].properties['carmen:rangetype'] && docs[i].geometry.type === 'MultiLineString') {
            for (var addr_it = 0; addr_it < docs[i].geometry.coordinates.length; addr_it++) {
                var feat = JSON.parse(JSON.stringify(docs[i]));
                if (feat.properties['carmen:parityl']) feat.properties['carmen:parityl'] = [feat.properties['carmen:parityl'][addr_it]]
                if (feat.properties['carmen:parityr']) feat.properties['carmen:parityr'] = [feat.properties['carmen:parityr'][addr_it]]
                if (feat.properties['carmen:lfromhn']) feat.properties['carmen:lfromhn'] = [feat.properties['carmen:lfromhn'][addr_it]]
                if (feat.properties['carmen:rfromhn']) feat.properties['carmen:rfromhn'] = [feat.properties['carmen:rfromhn'][addr_it]]
                if (feat.properties['carmen:ltohn']) feat.properties['carmen:ltohn'] = [feat.properties['carmen:ltohn'][addr_it]]
                if (feat.properties['carmen:rtohn']) feat.properties['carmen:rtohn'] = [feat.properties['carmen:rtohn'][addr_it]]
                feat.properties.id = feat.id;
                feat = linestring(feat.geometry.coordinates[addr_it], feat.properties);
                feat.properties['carmen:center'] = centroid(feat.geometry).geometry.coordinates;
                feat.id = feat.properties.id;
                full.vectors.push(feat);
            }
        } else {
            docs[i].properties.id = docs[i].id;
            full.vectors.push(docs[i])
        }
    }
};

function runChecks(doc, zoom) {
    var geojsonErr = geojsonHint.hint(doc);

    if (doc.type === 'FeatureCollection') {
         if (geojsonErr.length) {
            return geojsonErr[0].message + ' on FeatureCollection';
         }

        for (var feat_it = 0; feat_it < doc.features.length; feat_it++) {
            return checkFeat(doc.features[feat_it]);
        }
    } else if (doc.type === 'Feature') {
        return checkFeat(doc);
    } else {
        return 'doc must be Feature or FeatureCollection';
    }

    function checkFeat(doc) {
        if (doc.type === 'Feature' && !doc.id) {
            return 'doc has no id';
        } else if (!doc.properties) {
            return 'doc has no properties on id:' + doc.id;
        } else if (!doc.properties["carmen:text"]) {
            return 'doc has no carmen:text on id:' + doc.id;
        } else if (doc.properties["carmen:geocoder_stack"] &&
            typeof doc.properties["carmen:geocoder_stack"] !== 'string') {
            return 'geocoder_stack must be a string value';
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
    }

    return '';
}

function loadDoc(patch, doc, freq, zoom, token_replacer) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    //FeatureCollection input is currently only used to combine PT/ITP results for the same street
    //This collapses the FC down to a single combined pt/itp feature
    if (doc.type === 'FeatureCollection') {
        var newdoc = {
            id: doc.features[0].id,
            type: 'Feature',
            properties: {
                'carmen:text': doc.features[0].properties['carmen:text'],
                'carmen:center': doc.features[0].properties['carmen:center'],
                'carmen:addressnumber': [],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': [],
                'carmen:parityr': [],
                'carmen:lfromhn': [],
                'carmen:rfromhn': [],
                'carmen:ltohn': [],
                'carmen:rtohn': [],
                'carmen:score': 0
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: []
            }
        }

        for (var feat_it = 0; feat_it < doc.features.length; feat_it++) {
            var feat = doc.features[feat_it];
           
            if (newdoc.properties['carmen:text'] && newdoc.properties['carmen:text'] !== feat.properties['carmen:text']) {
                return 'Add carmen:text fields in a FeatureCollection must be the same';
            }

            if (feat.properties['carmen:score']) {
                newdoc.properties['carmen:score'] = Math.max(newdoc.properties['carmen:score'], feat.properties['carmen:score']);
            }

            if (feat.properties['carmen:rangetype']) {
                if (feat.geometry.type === 'LineString') {
                    newdoc.properties['carmen:addressnumber'].push(null);
                    ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                        newdoc.properties['carmen:'+type].push(feat.properties['carmen:'+type]);
                    });
                    newdoc.geometry.coordinates.push(feat.geometry.coordinates);
                } else if (feat.geometry.type === 'MultiLineString') {
                    newdoc.properties['carmen:addressnumber'] = newdoc.properties['carmen:addressnumber'].concat(new Array(newdoc.geometry.coordinates.length));
                    ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                        newdoc.properties['carmen:'+type] = newdoc.properties['carmen:'+type].concat(feat.properties['carmen:'+type]);
                    });
                    newdoc.geometry.coordinates = newdoc.geometry.coordinates.concat(feat.geometry.coordinates);
                } else {
                    return 'itp feature must be LineString or MultiLineString';
                }
            } else if (feat.properties['carmen:addressnumber']) {
                if (feat.geometry.type === 'Point') {
                    ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                        newdoc.properties['carmen:'+type].push(null);
                    });
                    newdoc.properties['carmen:addressnumber'].push(feat.properties['carmen:addressnumber']);
                    newdoc.geometry.coordinates.push([ feat.geometry.coordinates, feat.geometry.coordinates ]);
                } else if (feat.geometry.type === 'MultiPoint') {
                    ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                        newdoc.properties['carmen:'+type] = newdoc.properties['carmen:'+type].concat(new Array(newdoc.geometry.coordinates.length));
                    });
                    newdoc.properties['carmen:addressnumber'] = newdoc.properties['carmen:addressnumber'].concat(feat.properties['carmen:addressnumber']);
                    if (feat.geometry.coordinates.length === 1) {
                        newdoc.geometry.coordinates.push([ feat.geometry.coordinates[0], feat.geometry.coordinates[0] ]);
                    } else {
                        newdoc.geometry.coordinates = newdoc.geometry.coordinates.concat(feat.geometry.coordinates);
                    }
                } else {
                    return 'pt feature must be Point or MultiPoint';
                }
            } else {
                return 'All features in FeatureCollection must be address pt or itp type';
            }

            Object.keys(feat.properties).forEach(function(prop) {
                if (prop.match(/carmen:text_.*/) || !prop.match(/carmen:text/)) {
                    if (newdoc.properties[prop] && newdoc.properties[prop] !== feat.properties[prop]) {
                        return 'properties in FeatureCollections cannot conflict';
                    } else {
                        newdoc.properties[prop] = feat.properties[prop];
                    }
                }
            });
        }

        doc = newdoc;
    }

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

    //All values in an addresscluster should be lowercase so that the lowercased input query always matches the addresscluster
    if (doc.properties['carmen:addressnumber']) {
        for (var addr_it = 0; addr_it < doc.properties['carmen:addressnumber'].length; addr_it++) {
            doc.properties['carmen:addressnumber'][addr_it] = 
                typeof doc.properties['carmen:addressnumber'][addr_it] === 'string' ?
                doc.properties['carmen:addressnumber'][addr_it].toLowerCase() :
                doc.properties['carmen:addressnumber'][addr_it];
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
            if (!phrases[y].degen) patch.text.push(phrases[y].text);

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

    return doc;
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
