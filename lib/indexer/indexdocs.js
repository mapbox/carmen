var cover = require('@mapbox/tile-cover');
var grid = require('../util/grid');
var token = require('../util/token');
var termops = require('../util/termops');
var tilebelt = require('@mapbox/tilebelt');
var centroid = require('@turf/point-on-surface');
var DEBUG = process.env.DEBUG;
var extent = require('@turf/bbox');
var point = require('@turf/helpers').point;
var linestring = require('@turf/helpers').lineString;
var geojsonHint = require('@mapbox/geojsonhint');
var feature = require('../util/feature');
var center2zxy = require('../util/proximity').center2zxy;
var cl = require('../util/closest-lang');
var TIMER = process.env.TIMER;
var rewind = require('geojson-rewind');
var bbox = require('../util/bbox');

module.exports = {};
module.exports = indexdocs;
module.exports.loadDoc = loadDoc;
module.exports.parseDocs = parseDocs;
module.exports.runChecks = runChecks;
module.exports.standardize = standardize;
module.exports.verifyCenter = verifyCenter;
module.exports.generateFrequency = generateFrequency;

function indexdocs(docs, source, options, callback) {
    if (typeof options.zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (options.zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+options.zoom));
    if (options.zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+options.zoom));
    if (typeof callback !== 'function')
        return callback(new Error('callback required'));
    if (options.tokens) {
        options.tokens = token.createGlobalReplacer(options.tokens);
    }
    options.clipBBox = options.clipBBox || true;
    var full = { grid: {}, text:[], docs:[], vectors:[] };
    var settings = { source:source, zoom: options.zoom, geocoder_tokens: options.geocoder_tokens, tokens: options.tokens, clipBBox: options.clipBBox};

    try {
        parseDocs(docs, settings, full);
    } catch (err) {
        return callback(err);
    }

    if (TIMER) console.time('update:freq');
    var freq;
    try {
        freq = generateFrequency(docs, source.token_replacer, options.tokens, parseInt(source.maxscore));
    } catch (err) {
        return callback(err);
    }

    if (TIMER) console.timeEnd('update:freq');

    var ids = Object.keys(freq);

    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        freq[id][0] = (source._geocoder.freq.get(id) || [0])[0] + freq[id][0];
        // maxscore should not be cumulative.
        if (id === "__MAX__") {
            freq[id][0] = (source._geocoder.freq.get(id) || [0,0])[0] || freq[id][0];
        }
        source._geocoder.freq.set(id, freq[id]);
    }
    if (TIMER) console.time('update:indexdocs');

    if (!source.lang.fallback_matrix) {
        var matrix = cl.fallbackMatrix(source.lang.languages.filter(function(l) { return l != "default"; }));
        for (var value of matrix.values()) {
            value.push("default");
        }
        source.lang.fallback_matrix = matrix;
    }

    for (var f_it = 0; f_it < docs.length; f_it++) {
        loadDoc(freq, full, docs[f_it], source, options.zoom, source.indexing_replacer, options.tokens)
    }

    callback(null, full);
}

function parseDocs(docs, settings, full) {
    var zoom = settings.zoom;

    for (var i = 0; i < docs.length; i++) {
        docs[i] = standardize(docs[i], zoom);

        docs[i].properties.id = docs[i].id;

        var c_it, addr_it, feat;

        // Create vectorizable version of doc
        if (docs[i].properties['carmen:addressnumber']) {
            for (c_it = 0; c_it < docs[i].properties['carmen:addressnumber'].length; c_it++) {
                if (!docs[i].properties['carmen:addressnumber'][c_it]) continue;

                for (addr_it = 0; addr_it < docs[i].properties['carmen:addressnumber'][c_it].length; addr_it++) {
                    feat = point(docs[i].geometry.geometries[c_it].coordinates[addr_it], feature.storableProperties(docs[i].properties, 'vector'));
                    feat.id = docs[i].id;
                    full.vectors.push(feat);
                }
            }
        }

        if (docs[i].properties['carmen:rangetype']) {
            for (c_it = 0; c_it < docs[i].geometry.geometries.length; c_it++) {
                if (docs[i].geometry.geometries[c_it].type !== 'MultiLineString') continue;

                for (addr_it = 0; addr_it < docs[i].geometry.geometries[c_it].coordinates.length; addr_it++) {
                    feat = linestring(docs[i].geometry.geometries[c_it].coordinates[addr_it], feature.storableProperties(docs[i].properties, 'vector'));
                    feat.id = docs[i].id;
                    full.vectors.push(feat);
                }
            }
        }

        if (!docs[i].properties['carmen:addressnumber'] && !docs[i].properties['carmen:rangetype']) {
            full.vectors.push({
                id: docs[i].id,
                type: 'Feature',
                geometry: docs[i].geometry,
                properties: feature.storableProperties(docs[i].properties, 'vector')
            });
        }

        if (docs[i].bbox && settings.clipBBox && docs[i].bbox[0] > docs[i].bbox[2]) {
            docs[i].bbox = bbox.clipBBox(docs[i].bbox);
        }
    }
};

function runChecks(doc) {
    var geojsonErr = geojsonHint.hint(doc);

    if (!doc.id) {
        throw Error('doc has no id');
    } else if (geojsonErr.length) {
        for (var err_it = 0; err_it < geojsonErr.length; err_it++) {
            if (geojsonErr[err_it].level == 'message') {
                //It's good practice to follow these warnings but required
                console.warn(geojsonErr[err_it].message + ' on id:' + doc.id);
            } else if (!geojsonErr[err_it].message.match(/GeometryCollection with a single geometry/)) {
                //Throw error for everything else except single geom GeometryCollection as we use these for pt/itp addresses
                throw Error(geojsonErr[err_it].message + ' on id:' + doc.id);
            }
        }
    } else if (!doc.geometry) {
        throw Error('doc has no geometry on id: ' + doc.id);
    } else if (!doc.properties) {
        throw Error('doc has no properties on id:' + doc.id);
    } else if (!doc.properties["carmen:text"]) {
        throw Error('doc has no carmen:text on id:' + doc.id);
    } else if (doc.properties["carmen:geocoder_stack"] &&
        typeof doc.properties["carmen:geocoder_stack"] !== 'string') {
        throw Error('geocoder_stack must be a string value');
    }

    if (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon') {
        // check for Polygons or Multipolygons with too many vertices
        var vertices = 0;
        var ringCount;
        if (doc.geometry.type === 'Polygon') {
            ringCount = doc.geometry.coordinates.length;
            for (var i = 0; i < ringCount; i++) {
                vertices+= doc.geometry.coordinates[i].length;
            }
        } else {
            var polygonCount = doc.geometry.coordinates.length;
            for (var k = 0; k < polygonCount; k++) {
                ringCount = doc.geometry.coordinates[k].length;
                for (var j = 0; j < ringCount; j++) {
                    vertices += doc.geometry.coordinates[k][j].length;
                }
            }
        }
        if (vertices > 50000) {
            throw Error('Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:' + doc.id);
        }
    }
}

function standardize(doc, zoom) {
    if (doc.geometry && (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon')) {
        doc = rewind(doc);
    }

    //Requires MultiPolygons to be in proper winding order
    runChecks(doc, zoom);

    var tiles = [];
    if (doc.geometry.type === 'GeometryCollection' && !doc.properties['carmen:zxy']) {
        doc.properties['carmen:zxy'] = [];
        tiles = [];
        for (var feat_it = 0; feat_it < doc.geometry.geometries.length; feat_it++) {
            tiles = tiles.concat(cover.tiles(doc.geometry.geometries[feat_it], {min_zoom: zoom, max_zoom: zoom}));
        }
        tiles.forEach(function(tile) {
            doc.properties['carmen:zxy'].push(tile[2]+'/'+tile[0]+'/'+tile[1]);
        });
    } else if (!doc.properties['carmen:zxy']) {
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
            throw Error('Invalid carmen:center provided, and unable to calculate corrected centroid. Verify validity of doc.geometry for doc id:' + doc.id);
        } else {
            console.warn('new: carmen:center: ', doc.properties["carmen:center"]);
            console.warn('new: zxy:    ', doc.properties['carmen:zxy']);
        }
    }

    //Standardize all addresses to GeometryCollections
    doc = feature.addrTransform(doc);

    if (!doc.bbox && (doc.geometry.type === 'MultiPolygon' || doc.geometry.type === 'Polygon')) {
        const boundingBox = extent(doc.geometry);
        const bboxWidth = boundingBox[2] - boundingBox[0];
        if (bboxWidth < 180) {
            doc.bbox = boundingBox;
        } else {
            doc.bbox = bbox.crossDateline(doc.geometry, boundingBox);
        }
    }

    // zxy must be set at this point
    if (!doc.properties['carmen:zxy']) {
        throw Error('doc.properties[\'carmen:zxy\'] undefined, failed indexing, doc id:' + doc.id);
    }

    // Limit carmen:zxy length to 10000 covers.
    // Stopgap: If covers exceed this amount drop covers furthest from
    // the center of this feature. This breaks forward geocode stacking
    // for any of the dropped covers.
    if (doc.properties['carmen:zxy'] && doc.properties['carmen:zxy'].length > 10000) {
        console.warn('carmen:zxy exceeded 10000, truncating to 10000 (doc id: %s, text: %s)', doc.id, doc.properties['carmen:text']);
        var centerCover = center2zxy(doc.properties['carmen:center'], zoom);
        var sortedCovers = doc.properties['carmen:zxy'].slice(0);
        sortedCovers.sort(function(a, b) {
            a = a.split('/');
            b = b.split('/');
            var aDist = Math.sqrt(Math.pow(centerCover[1]-parseInt(a[1],10),2) + Math.pow(centerCover[2]-parseInt(a[2],10),2));
            var bDist = Math.sqrt(Math.pow(centerCover[1]-parseInt(b[1],10),2) + Math.pow(centerCover[2]-parseInt(b[2],10),2));
            return aDist - bDist;
        });
        doc.properties['carmen:zxy'] = sortedCovers.slice(0,10000);
    }

    return doc;
}

function loadDoc(freq, patch, doc, source, zoom, token_replacer, globalTokens) {
    var xy = [];
    var l = doc.properties['carmen:zxy'].length;
    var coverId = termops.feature(doc.id.toString());

    while (l--) {
        var zxy = doc.properties['carmen:zxy'][l].split('/');
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        if (zxy[1] < 0 || zxy[2] < 0) continue;
        xy.push({ x:zxy[1], y:zxy[2] });
    }

    var maxScore = freq["__MAX__"][0] || 0;
    var scaledScore = termops.encode3BitLogScale(doc.properties['carmen:score'], maxScore) || 0;
    var texts = termops.getIndexableText(token_replacer, globalTokens, doc);
    var allPhrases = new Map();
    var phrase, phraseObj, languages;
    for (var x = 0; x < texts.length; x++) {
        var phrases = termops.getIndexablePhrases(texts[x].tokens, freq);
        for (var y = 0; y < phrases.length; y++) {
            phrase = phrases[y].phrase;

            if (!allPhrases.has(phrase)) allPhrases.set(phrase, {languages: new Set(), phrase: phrases[y]});
            phraseObj = allPhrases.get(phrase);

            // the same text may occur multiple times with different relevances; choose the highest possible
            // relevance for this phrase
            if (phrases[y].relev > phraseObj.phrase.relev) phraseObj.phrase.relev = phrases[y].relev;

            texts[x].languages.forEach(function(l) { phraseObj.languages.add(l); });

            if (DEBUG && !phrases[y].degen) {
                console.warn('[%d] phrase: %s @ %d', doc.id, phrases[y].text, phrases[y].relev);
            }
        }
    }

    // here, we'll look at all the languages represented in our current set of phrases
    // and for any that aren't represented but are in our source list, we'll pick the closest
    // language we do have using our precomputed fallback matrix, and add the missing language's tag to
    // the existing phrases
    var phrasesByLanguage = new Map();
    for (var phraseValue of allPhrases.values()) {
        for (var phraseLang of phraseValue.languages) {
            if (!phrasesByLanguage.has(phraseLang)) phrasesByLanguage.set(phraseLang, []);
            phrasesByLanguage.get(phraseLang).push(phraseValue);
        }
    }

    // if this is a translationless doc, there will be an 'all' key in
    // phrasesByLanguage in which case we don't bother with fallback expansion
    if (!phrasesByLanguage.has('all')) {
        for (var lang of source.lang.languages) {
            if (lang == "default") continue;
            if (!phrasesByLanguage.has(lang)) {
                for (var candidate of source.lang.fallback_matrix.get(lang)) {
                    if (phrasesByLanguage.has(candidate)) {
                        // at this point we know a language we're missing (lang)
                        // and the closest language to it that we do have (candidate)
                        // so iterate over each phrase of language candidate
                        // and make it also a phrase of lang
                        for (var item of phrasesByLanguage.get(candidate)) {
                            item.languages.add(lang);
                        }
                        break;
                    }
                }
            }
        }
    }

    for (var phraseItem of allPhrases) {
        phrase = phraseItem[0];
        phraseObj = phraseItem[1].phrase;
        languages = phraseItem[1].languages;

        var langList = Array.from(languages).sort().join(",");

        patch.grid[phrase] = patch.grid[phrase] || new Map();
        var gridPatch = patch.grid[phrase];

        if (!gridPatch.has(langList)) gridPatch.set(langList, []);

        l = xy.length
        while (l--) {
            var encoded = null;
            try {
                encoded = grid.encode({
                    id: coverId,
                    x: xy[l].x,
                    y: xy[l].y,
                    relev: phraseObj.relev,
                    score: scaledScore
                });
            } catch (err) {
                console.warn(err.toString() + ', doc id: ' + doc.id);
            }
            if (encoded) gridPatch.get(langList).push(encoded);
        }

        if (gridPatch.size) {
            patch.grid[phrase] = gridPatch;
            patch.text.push(phraseObj.text);
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
        if (center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3] && center[0] !== null && center[1] !== null) {
            found = true;
        }
        i++;
    }
    return found;
}

function generateFrequency(docs, replacer, globalTokens, maxScore) {
    var freq = {};
    // Uses freq[0] as a convention for storing total # of docs.
    // Reserved for this use by termops.encodeTerm
    freq["__COUNT__"] = [0];

    // Uses freq[1] as a convention for storing max score.
    // Reserved for this use by termops.encodeTerm
    freq["__MAX__"] = [0];

    for (var i = 0; i < docs.length; i++) {
        if (!docs[i].properties["carmen:text"]) {
            throw new Error('doc has no carmen:text');
        }
        // set max score
        freq["__MAX__"][0] = maxScore || Math.max(freq["__MAX__"][0], docs[i].properties["carmen:score"] || 0);

        var texts = termops.getIndexableText(replacer, globalTokens, docs[i]);
        for (var x = 0; x < texts.length; x++) {
            var terms = termops.terms(texts[x].tokens);
            for (var k = 0; k < terms.length; k++) {
                var id = terms[k];
                freq[id] = freq.hasOwnProperty(id) ? freq[id] : [0];
                freq[id][0]++;
                freq["__COUNT__"][0]++;
            }
        }
    }

    return freq;

}
