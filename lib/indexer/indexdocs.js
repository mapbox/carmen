'use strict';
const cover = require('@mapbox/tile-cover');
const grid = require('../util/grid');
const token = require('../text-processing/token');
const termops = require('../text-processing/termops');
const tilebelt = require('@mapbox/tilebelt');
const centroid = require('@turf/point-on-feature');
const DEBUG = process.env.DEBUG;
const extent = require('@turf/bbox').default;
const point = require('@turf/helpers').point;
const linestring = require('@turf/helpers').lineString;
const buffer = require('@turf/buffer');
const geojsonHint = require('@mapbox/geojsonhint');
const feature = require('../util/feature');
const center2zxy = require('../util/proximity').center2zxy;
const cl = require('../text-processing/closest-lang');
const TIMER = process.env.TIMER;
const rewind = require('geojson-rewind');
const bbox = require('../util/bbox');
const constants = require('../constants');

module.exports = {};
module.exports = indexdocs;
module.exports.loadDoc = loadDoc;
module.exports.parseDocs = parseDocs;
module.exports.runChecks = runChecks;
module.exports.standardize = standardize;
module.exports.verifyCenter = verifyCenter;
module.exports.getNonOutlierBounds = getNonOutlierBounds;
module.exports.generateFrequency = generateFrequency;

/**
 * Index documents, stored in a CarmenSource
 *
 * @param {Array<Feature>} docs - an array of GeoJSON `Feature` documents
 * @param {CarmenSource} source - the source that is to be indexed
 * @param {object} options - options
 * @param {number} options.zoom - the max zoom level for the index
 * @param {Object<string, string>} options.geocoder_tokens - Mapping to replace tokens with other tokens. After a text string is tokenized, any token that matches a key in this mapping will be replaced with the corresponding value. Helpful for abbreviations, eg. "Streets" => "St"
 * @param {PatternReplaceMap} options.tokens - a pattern-based string replacement specification
 * @param {function} callback - a callback function
 * @returns {void} returns nothing
 */
function indexdocs(docs, source, options, callback) {
    if (typeof options.zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (options.zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was ' + options.zoom));
    if (options.zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was ' + options.zoom));
    if (typeof callback !== 'function')
        return callback(new Error('callback required'));
    if (options.tokens) {
        options.tokens = token.createGlobalReplacer(options.tokens);
    }

    const full = { grid: {}, text:[], docs:[], vectors:[] };
    const settings = { source:source, zoom: options.zoom, geocoder_tokens: options.geocoder_tokens, tokens: options.tokens };

    try {
        parseDocs(docs, settings, full);
    } catch (err) {
        return callback(err);
    }

    if (TIMER) console.time('update:freq');
    let freq;
    try {
        freq = generateFrequency(docs, source.simple_replacer, source.complex_query_replacer, options.tokens, parseInt(source.maxscore, 10), source.lang.has_languages);
    } catch (err) {
        return callback(err);
    }

    if (TIMER) console.timeEnd('update:freq');

    if (TIMER) console.time('update:indexdocs');

    if (!source.lang.fallback_matrix) {
        const matrix = cl.fallbackMatrix(source.lang.languages.filter((l) => { return l !== 'default'; }));
        source.lang.fallback_matrix = matrix;
    }

    for (let f_it = 0; f_it < docs.length; f_it++) {
        loadDoc(freq, full, docs[f_it], source, options.zoom, source.simple_replacer, source.complex_indexing_replacer, options.tokens);
    }

    if (TIMER) console.timeEnd('update:indexdocs');

    callback(null, full);
}

/**
 * Prepare docs for indexing.
 *
 * @param {Array<Feature>} docs - an array of GeoJSON Features to be indexed. see `docs/data-sources.md` for required carmen properties
 * @param {object} settings - settings
 * @param {CarmenSource} settings.source - the source index that docs will be added to
 * @param {number} settings.zoom - the max zoom level for the index
 * @param {Object<string, string>} settings.geocoder_tokens - Mapping to replace tokens with other tokens. After a text string is tokenized, any token that matches a key in this mapping will be replaced with the corresponding value. Helpful for abbreviations, eg. "Streets" => "St"
 * @param {Object<string, string>} settings.tokens - mapping from string patterns to strings. Patterns are replaced with strings when found in queries. This is treated as a global token replacement map: any substring matching a pattern key (which can be regex) is replaced with the associated string value. Helpful for replacing strings within and across tokens, eg "talstrasse" => "tal str".
    const settings = { source:source, zoom: options.zoom, geocoder_tokens: options.geocoder_tokens, tokens: options.tokens };
 * @param {object} full - full
 * @return {undefined}
 */
function parseDocs(docs, settings, full) {
    const zoom = settings.zoom;

    for (let i = 0; i < docs.length; i++) {
        docs[i] = standardize(docs[i], zoom);
        docs[i].properties.id = docs[i].id;
        let c_it, addr_it, feat;

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

        // Since an intersection MultiPoint geometry is standardized into a GeometryCollection internally
        // we need to create a vectorizable version of the docs
        // otherwise tile-cover throws an error: the Geometry type not implemented
        if (docs[i].properties['carmen:intersections']) {
            for (c_it = 0; c_it < docs[i].properties['carmen:intersections'].length; c_it++) {
                if (!docs[i].properties['carmen:intersections'][c_it]) continue;
                for (addr_it = 0; addr_it < docs[i].properties['carmen:intersections'][c_it].length; addr_it++) {
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

        if (!docs[i].properties['carmen:addressnumber'] && !docs[i].properties['carmen:rangetype'] && !docs[i].properties['carmen:intersections']) {
            full.vectors.push({
                id: docs[i].id,
                type: 'Feature',
                geometry: docs[i].geometry,
                properties: feature.storableProperties(docs[i].properties, 'vector')
            });
        }
    }
}

/**
 * Validates document, throws on any detected problems.
 * @param {object} doc - feature object
 */
function runChecks(doc) {
    const geojsonErr = geojsonHint.hint(doc);

    if (!doc.id) {
        throw Error('doc has no id');
    } else if (geojsonErr.length) {
        for (let err_it = 0; err_it < geojsonErr.length; err_it++) {
            if (geojsonErr[err_it].level === 'message') {
            // It's good practice to follow these warnings but required
                console.warn(geojsonErr[err_it].message + ' on id:' + doc.id);
            } else if (!geojsonErr[err_it].message.match(/GeometryCollection with a single geometry/)) {
                throw Error(geojsonErr[err_it].message + ' on id:' + doc.id);
            // Throw error for everything else except single geom GeometryCollection as we use these for pt/itp addresses
            }
        }
    } else if (!doc.geometry) {
        throw Error('doc has no geometry on id: ' + doc.id);
    } else if (!doc.properties) {
        throw Error('doc has no properties on id:' + doc.id);
    } else if (!doc.properties['carmen:text']) {
        throw Error('doc has no carmen:text on id:' + doc.id);
    } else if (doc.properties['carmen:text'].split(',').length > constants.MAX_TEXT_SYNONYMS && (doc.properties['carmen:addressnumber'] || doc.properties['carmen:rangetype'] || doc.properties['carmen:intersections'])) {
        throw Error('doc\'s carmen:text on id:' + doc.id + ' has more than the allowed ' + constants.MAX_TEXT_SYNONYMS + ' synonyms');
    } else if (doc.properties['carmen:geocoder_stack'] && typeof doc.properties['carmen:geocoder_stack'] !== 'string') {
        throw Error('geocoder_stack must be a string value');
    }
    if (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon') {
        // check for Polygons or Multipolygons with too many vertices
        let vertices = 0;
        let ringCount;
        if (doc.geometry.type === 'Polygon') {
            ringCount = doc.geometry.coordinates.length;
            for (let i = 0; i < ringCount; i++) {
                vertices += doc.geometry.coordinates[i].length;
            }
        } else {
            const polygonCount = doc.geometry.coordinates.length;
            for (let k = 0; k < polygonCount; k++) {
                ringCount = doc.geometry.coordinates[k].length;
                for (let j = 0; j < ringCount; j++) {
                    vertices += doc.geometry.coordinates[k][j].length;
                }
            }
        }
        if (vertices > 50000) {
            throw Error('Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:' + doc.id);
        }
    }
}

/**
 * Runs validation and normalized some attributes. Will throw if errors are found
 *
 * @param {object} doc - geojson feature document
 * @param {number} zoom - zoom level to index feature
 * @return {object} normalized feature document
 */
function standardize(doc, zoom) {
    if (doc.geometry && (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon')) {
        doc = rewind(doc);
    }

    // Requires MultiPolygons to be in proper winding order
    runChecks(doc, zoom);

    let tiles = [];
    if (doc.geometry.type === 'GeometryCollection' && !doc.properties['carmen:zxy']) {
        doc.properties['carmen:zxy'] = [];
        tiles = [];
        for (let feat_it = 0; feat_it < doc.geometry.geometries.length; feat_it++) {
            let feat_tiles;
            try {
                feat_tiles = cover.tiles(doc.geometry.geometries[feat_it], { min_zoom: zoom, max_zoom: zoom });
            } catch (e) {
                const repaired = buffer(doc.geometry.geometries[feat_it], 0);
                feat_tiles = cover.tiles(repaired.geometry, { min_zoom: zoom, max_zoom: zoom });
                console.warn('Geometry repair was necessary on id:' + doc.id);
            }
            tiles = tiles.concat(feat_tiles);
        }
        tiles.forEach((tile) => {
            doc.properties['carmen:zxy'].push(tile[2] + '/' + tile[0] + '/' + tile[1]);
        });
    } else if (!doc.properties['carmen:zxy']) {
        try {
            tiles = cover.tiles(doc.geometry, { min_zoom: zoom, max_zoom: zoom });
        } catch (e) {
            const repaired = buffer(doc, 0);
            tiles = cover.tiles(repaired.geometry, { min_zoom: zoom, max_zoom: zoom });
            console.warn('Geometry repair was necessary on id:' + doc.id);
        }
        doc.properties['carmen:zxy'] = [];
        tiles.forEach((tile) => {
            doc.properties['carmen:zxy'].push(tile[2] + '/' + tile[0] + '/' + tile[1]);
        });
    } else {
        doc.properties['carmen:zxy'].forEach((tile) => {
            tile = tile.split('/');
            tiles.push([tile[1], tile[2], tile[0]]);
        });
    }

    // if an outlier is detected in address numbers for example in [1,2,3,5000], 5000 is considered an outlier, then modify interpolation for it
    if (doc.properties['carmen:addressnumber'] && doc.geometry.type === 'GeometryCollection') {
        const [lowerOutlierLimit, lowerDataBound, upperOutlierLimit, upperDataBound, outlierCount] = getNonOutlierBounds(doc.properties['carmen:addressnumber']);
        // Check if outliers are present
        if (outlierCount > 0) {
            const interpolationProperties = ['carmen:lfromhn', 'carmen:ltohn', 'carmen:rfromhn', 'carmen:rtohn'];

            // Limit ranges based on outliers
            interpolationProperties.forEach((p) => {
                if (doc.properties[p]) {
                    // Find the non null version of this property
                    for (let i = 0; i < doc.properties[p].length; i++) {
                        if (doc.properties[p][i] != null) {
                            // Put the property within the outlier bounds
                            for (let j = 0; j < doc.properties[p][i].length; j++) {
                                if (doc.properties[p][i][j] != null) {
                                    // If the property is outside the outlier limits, modify it to match the good data
                                    if (doc.properties[p][i][j] < lowerOutlierLimit) {
                                        doc.properties[p][i][j] = lowerDataBound;
                                    }
                                    if (doc.properties[p][i][j] > upperOutlierLimit) {
                                        doc.properties[p][i][j] = upperDataBound;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // We accept overrides as either a Number or String, but convert to String before indexing.
    if (doc.properties['carmen:addressprops']) {
        for (const prop in doc.properties['carmen:addressprops']) {
            if (prop.startsWith('override:')) {
                for (const key in doc.properties['carmen:addressprops'][prop]) {
                    const val = doc.properties['carmen:addressprops'][prop][key];
                    if (typeof val === 'number') {
                        doc.properties['carmen:addressprops'][prop][key] = val.toString();
                    }
                }
            }
        }
    }

    if (!doc.properties['carmen:center'] || !verifyCenter(doc.properties['carmen:center'], tiles)) {
        console.warn('carmen:center did not fall within the provided geometry for %s (%s). Calculating new point on surface.',
            doc.id, doc.properties['carmen:text']);
        doc.properties['carmen:center'] = centroid(doc.geometry).geometry.coordinates;
        if (!verifyCenter(doc.properties['carmen:center'], tiles)) {
            throw Error('Invalid carmen:center provided, and unable to calculate corrected centroid. Verify validity of doc.geometry for doc id:' + doc.id);
        } else {
            console.warn('new: carmen:center: ', doc.properties['carmen:center']);
            console.warn('new: zxy:    ', doc.properties['carmen:zxy']);
        }
    }

    // Standardize all addresses to GeometryCollections
    doc = feature.addrTransform(doc);

    if (!doc.bbox && (doc.geometry.type === 'MultiPolygon' || doc.geometry.type === 'Polygon')) {
        const boundingBox = extent(doc.geometry);
        const bboxWidth = boundingBox[2] - boundingBox[0];
        if (bboxWidth < 180) {
            doc.bbox = boundingBox;
        } else {
            doc.bbox = bbox.crossAntimeridian(doc.geometry, boundingBox);
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
        const centerCover = center2zxy(doc.properties['carmen:center'], zoom);
        const sortedCovers = doc.properties['carmen:zxy'].slice(0);
        sortedCovers.sort((a, b) => {
            a = a.split('/');
            b = b.split('/');
            const aDist = Math.sqrt(Math.pow(centerCover[1] - parseInt(a[1],10),2) + Math.pow(centerCover[2] - parseInt(a[2],10),2));
            const bDist = Math.sqrt(Math.pow(centerCover[1] - parseInt(b[1],10),2) + Math.pow(centerCover[2] - parseInt(b[2],10),2));
            return aDist - bDist;
        });
        doc.properties['carmen:zxy'] = sortedCovers.slice(0,10000);
    }
    return doc;
}

/**
 * TODO
 * @param {object} freq - frequency object
 * @param {object} patch - Object where doc is loaded. NOTE: "patch" variable
 *                         name comes from earlier design where index was updated
 *                         using a diff patch style metaphor
 * @param {object} doc - geojson feature document
 * @param {object} source - carmen source
 * @param {number} zoom - zoom level
 * @param {object} simple_replacer - simple replacements
 * @param {object} complex_replacer - complex replacements
 * @param {object} global_replacer - global replacements
 * @return {object} - feature document, not used during indexing.
 */
function loadDoc(freq, patch, doc, source, zoom, simple_replacer, complex_replacer, global_replacer) {
    const xy = [];
    let l = doc.properties['carmen:zxy'].length;
    const coverId = termops.feature(doc.id.toString());

    while (l--) {
        const zxy = doc.properties['carmen:zxy'][l].split('/');
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        if (zxy[1] < 0 || zxy[2] < 0) continue;
        xy.push({ x:zxy[1], y:zxy[2] });
    }

    const maxScore = freq['__MAX__'][0] || 0;
    const scaledScore = termops.encode3BitLogScale(doc.properties['carmen:score'], maxScore) || 0;


    const stack = doc.properties['carmen:geocoder_stack'] || '';
    const autopopulate = source.lang.autopopulate[stack] || false;
    const texts = termops.getIndexableText(simple_replacer, complex_replacer, global_replacer, doc, autopopulate, source.categories);
    const allPhrases = new Map();

    for (let x = 0; x < texts.length; x++) {
        const phrases = termops.getIndexablePhrases(texts[x], freq);

        for (let y = 0; y < phrases.length; y++) {
            const phrase = phrases[y].phrase;
            if (!allPhrases.has(phrase)) allPhrases.set(phrase, { languages: new Set(), phrase: phrases[y] });
            const phraseObj = allPhrases.get(phrase);

            // the same text may occur multiple times with different relevances; choose the highest possible
            // relevance for this phrase
            if (phrases[y].relev > phraseObj.phrase.relev) phraseObj.phrase.relev = phrases[y].relev;

            texts[x].languages.forEach((l) => { phraseObj.languages.add(l); });

            if (DEBUG && !phrases[y].degen) {
                console.warn('[%d] phrase: %s @ %d', doc.id, phrases[y].text, phrases[y].relev);
            }
        }

    }

    // here, we'll look at all the languages represented in our current set of phrases
    // and for any that aren't represented but are in our source list, we'll pick the closest
    // language we do have using our precomputed fallback matrix, and add the missing language's tag to
    // the existing phrases
    const phrasesByLanguage = new Map();
    for (const phraseValue of allPhrases.values()) {
        for (const phraseLang of phraseValue.languages) {
            if (!phrasesByLanguage.has(phraseLang)) phrasesByLanguage.set(phraseLang, []);
            phrasesByLanguage.get(phraseLang).push(phraseValue);
        }
    }

    if (source.lang.has_languages) {
        for (const lang of source.lang.languages) {
            if (lang === 'all') continue;
            if (lang === 'default') continue;
            if (!phrasesByLanguage.has(lang)) {
                for (const candidate of source.lang.fallback_matrix.get(lang)) {
                // at this point we know a language we're missing (lang)
                // and the closest language to it that we do have (candidate)
                // so iterate over each phrase of language candidate
                // and make it also a phrase of lang
                    if (phrasesByLanguage.has(candidate)) {
                        for (const item of phrasesByLanguage.get(candidate)) {
                            item.languages.add(lang);
                        }
                        break;
                    }
                }
            }
        }
    }

    for (const phraseItem of allPhrases) {
        const phrase = phraseItem[0];
        const phraseObj = phraseItem[1].phrase;
        const languages = phraseItem[1].languages;

        const langList = Array.from(languages).sort().join(',');

        patch.grid[phrase] = patch.grid[phrase] || new Map();
        const gridPatch = patch.grid[phrase];

        if (!gridPatch.has(langList)) gridPatch.set(langList, []);
        l = xy.length;

        while (l--) {
            let encoded = null;
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

/**
 * Detect whether a set of tiles contains a location
 *
 * @param {Array<number>} center - 2 element lon,lat array .
 * @param {Array<Array<number>>} tiles - array of x,y,z arrays
 * @return {boolean} true is center is within tiles
 */
function verifyCenter(center, tiles) {
    for (let i = 0; i < tiles.length; i++) {
        const bbox = tilebelt.tileToBBOX(tiles[i]);
        if (center[0] >= bbox[0] && center[0] <= bbox[2] &&
            center[1] >= bbox[1] && center[1] <= bbox[3] &&
            center[0] !== null && center[1] !== null
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Generate term frequency
 *
 * @param {Array<object>} docs - array of feature objects
 * @param {Object} simpleReplacer - simple replacements
 * @param {Array} complexReplacer - complex replacements
 * @param {Array} globalTokens - global replacements
 * @param {Number} maxScore - know max score
 * @return {Object} Map-like object of terms ids to single value arrays
 */
function generateFrequency(docs, simpleReplacer, complexReplacer, globalTokens, maxScore) {
    if (complexReplacer === undefined) complexReplacer = [];
    if (globalTokens === undefined) globalTokens = [];

    const freq = {};
    // Total # of docs.
    freq['__COUNT__'] = [0];

    // Max score.
    freq['__MAX__'] = [0];

    for (let i = 0; i < docs.length; i++) {
        if (!docs[i].properties['carmen:text']) {
            throw new Error('doc has no carmen:text');
        }
        // set max score
        freq['__MAX__'][0] = maxScore || Math.max(freq['__MAX__'][0], docs[i].properties['carmen:score'] || 0);

        const texts = termops.getMinimalIndexableText(simpleReplacer, complexReplacer, globalTokens, docs[i]);

        for (let x = 0; x < texts.length; x++) {
            const terms = texts[x];

            for (let k = 0; k < terms.length; k++) {
                const id = terms[k];
                freq[id] = freq.hasOwnProperty(id) ? freq[id] : [0];
                freq[id][0]++;
                freq['__COUNT__'][0]++;
            }
        }
    }
    return freq;
}

/**
 * getNonOutlierBounds uses a variation on tuckey's fences formula to calculate whether there are
 * outliers in a given set - https://en.wikipedia.org/wiki/Outlier
 *
 * @param {Array} addressnumber -array of addressnumbers in a cluster
 * @return {Array} [lowerOutlierLimit, lowerDataBound, upperOutlierLimit, upperDataBound, outlierCount]
 */
function getNonOutlierBounds(addressnumber) {
    // Outliers are expected to be in the top or bottom errorPercentile
    const errorPercentile = 0.1;
    // If the errorPercentile numbers were accurate for a uniform distribution
    // We want to accept everything from -targetPercentile to 1+targetPercentile
    const targetPercentile = 0.5;
    let upperOutlierLimit, lowerOutlierLimit, lowerPercentile, upperPercentile;

    for (let i = 0; i < addressnumber.length; i++) {
        if (addressnumber[i] != null) {
            const sortedArray = addressnumber[i].map((num) => parseInt(num, 10)).filter((num) => !isNaN(num)).sort((a,b) => a - b);

            // Calculates the two percentiles used for limiting interpolation ranges
            lowerPercentile = Math.floor(percentile(sortedArray, errorPercentile));
            upperPercentile = Math.floor(percentile(sortedArray, 1.0 - errorPercentile));

            // Calculate the variation in the data per percentile
            const deltaPerPercentile = (upperPercentile - lowerPercentile) / (1.0 - 2.0 * errorPercentile);

            // Calculate the limits used for detecting outliers
            lowerOutlierLimit = lowerPercentile - (deltaPerPercentile * (targetPercentile + errorPercentile));
            upperOutlierLimit = upperPercentile + (deltaPerPercentile * (targetPercentile + errorPercentile));

            const lowerDataBound = sortedArray.find((value) => value >= lowerOutlierLimit);
            const upperDataBound = sortedArray.slice().reverse().find((value) => value <= upperOutlierLimit);
            const outlierCount = sortedArray.filter((value) => (value < lowerOutlierLimit || value > upperOutlierLimit)).length;
            return [lowerOutlierLimit, lowerDataBound, upperOutlierLimit, upperDataBound, outlierCount];
        }
    }
    return [null, null, null, null, 0];
}

/**
 * percentile - Returns the value at a given percentile in a sorted numeric array
 *
 * @param {Array} arr - array of addressnumbers in a cluster
 * @param {number} p - percentile value
 * @return {number} value
 */
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];

    const index = (arr.length - 1) * p;
    const lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;

    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}
