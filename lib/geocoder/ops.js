'use strict';
module.exports.toFeature = toFeature;

const closestLang = require('../text-processing/closest-lang');
const featureMatchesLanguage = require('./filter-sources').featureMatchesLanguage;
const termops = require('../text-processing/termops');
const bbox = require('../util/bbox');

/**
 * getFormatString - get a `place_name` template string from a format object
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Object of format strings by language
 * @param {String} language code
 * @return {String} templating string for formatting place_name output
 */
function getFormatString(context, format, language) {
    // check for whether or not there are any parts of the response in the queried language.
    // if not, use the default templating rather than the one appropriate to the queried language.
    const languageFormat = language ? closestLang(language, format, '') : false;
    if (languageFormat) {
        for (let k = 0; k < context.length; k++) {
            const languageText = language ? closestLang(language, context[k].properties, 'carmen:text_') : false;
            if (languageText ||
                context[k].properties.language === language) {
                format = languageFormat;
                break;
            }
        }
    }
    return typeof format === 'object' ? format['default'] : format;
}

/**
 * getPlaceName - get a formatted `place_name` string for a given context stack & language
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {String} formatString Templating string for formatting place_name output
 * @param {String} language code to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter results strictly to a specific language. Undefined defaults null.
 * @param {Boolean} matched If set, use matched text in place name
 * @return {String} formatted place_name string
 */
function getPlaceName(context, formatString, language, languageMode, matched) {
    const feat = context[0];
    let place_name;
    // Use geocoder_format to format output if applicable
    if (!formatString || formatString === true || formatString === 1) {
        place_name = ((feat.properties['carmen:address'] ? feat.properties['carmen:address'] + ' ' : '') +
            context
                .filter((f) => { return matched || featureMatchesLanguage(f, { language: [language], languageMode: languageMode }); })
                .map((f) => { return (matched ? f.matching_text : undefined) || closestLang.getText(language, f.properties).text; })
                .join(', ')
        ).trim();
    } else {
        // Create template object that lists what we want to know
        const template = formatString.replace(/ /g,'').replace(/,/g,'').replace(/،/g,'').trim().replace(/^{/,'').replace(/}$/,'').split(/}{|}-{/);

        // Go through template object one-by-one & check to see if context is available for this template property
        for (let i = 0; i < template.length; i++) {
            const t = template[i].split('.');
            const templateProp     = t[0]; // ex. 'address','place'
            const templateSubprop  = t[1]; // ex. 'name','number'
            let val = '';

            // In cases where subprop is either `name` or `number`, we map to `text` and `address` respectively.
            // Otherwise, we look for the subprop itself
            // If not found, remove from the original format string

            for (let x = 0; x < context.length; x++) {
                const f = context[x];
                if (!f.properties['carmen:text']) throw new Error('Feature has no carmen:text');
                if (!featureMatchesLanguage(f, { language: [language], languageMode: languageMode })) continue;
                const carmenProp = f.properties['carmen:extid'].split('.')[0]; // ex. 'place', 'postcode', 'region'

                // If we found a match between the template property and one within the returned context
                if (templateProp === carmenProp) {
                    if (templateSubprop === '_name') {
                        // `name` is a hardcoded subproperty that maps to carmen:text
                        val = matched && f.matching_text ? f.matching_text : closestLang.getText(language, f.properties).text;
                        formatString = formatString.replace('{' + templateProp + '._name}',val);
                    } else if (templateSubprop === '_number') {
                        // `address` is a hardcored subproperty that maps to carmen:address
                        val = f.properties['carmen:address'];
                        // in case val is a digit and not a comma-separated string
                        if (typeof val === 'number') { val += ''; }
                        val = (val || '').split(',')[0];
                        formatString = formatString.replace('{' + templateProp + '._number}',val);
                    } else {
                        // otherwise, subproperties appear as standard strings within feature properties
                        val = f.properties[templateSubprop];
                        if (val) {
                            formatString = formatString.replace('{' + templateProp + '.' + templateSubprop + '}',val);
                        } else {
                            // No matches or text, remove altogether
                            formatString = formatString.replace('{' + templateProp + '.' + templateSubprop + '}','');
                        }
                    }
                }
            }
        }
        // Handle any cases where context wasn't available by getting rid of curly braces, awkwards spaces/commas
        formatString = formatString.replace(/\{.+?\}/g, '').replace(/ , /g,', ').replace(/ {2}/g,' ').replace(/, -/,',').replace(/, ,/g,'').replace(/^,/,'').replace(/,,/,',').trim().replace(/,$/,'');
        place_name = formatString;
    }
    return place_name;
}

/**
 * toFeature - Reformat a context array into a Carmen GeoJSON feature
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Objects containing default/langauge specific formatting for `place_name`.
 * @param {Array<string>} languages - codes to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter resutlts strictly to a specific language. Undefined defaults null.
 * @param {Boolean} debug Enable debug mode to expose internal properties in results
 * @param {Object} geocoder Geocoder object
 * @param {boolean} clipBBox Whether or not to clip BBox
 * @param {boolean} routing Whether or not geocoding request was made for routing
 * @return {Object} Carmen GeoJSON feature
 */
function toFeature(context, format, languages, languageMode, debug, geocoder, clipBBox, routing) {
    const feat = context[0];
    if (!feat.properties['carmen:center']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

    languages = languages && languages.length ? languages : [''];

    const feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        place_type: feat.properties['carmen:types'],
        relevance: context._relevance,
        properties: {}
    };
    if (feat.matching_text) feature.matching_text = feat.matching_text;
    if (feat.matching_language) feature.matching_language = feat.matching_language;
    if (routing && feat.routable_points) feature.routable_points = feat.routable_points;

    languages.reduce((memo, language, i) => {
        const suffix = language ? `_${language}` : '';
        const text = closestLang.getText(language, feat.properties);
        const formatString = getFormatString(context, format, language);
        memo[`text${suffix}`] = text.text;
        if (text.language) memo[`language${suffix}`] = text.language.replace('_', '-');
        memo[`place_name${suffix}`] = getPlaceName(context, formatString, language, languageMode);

        if (i === 0) {
            memo.text = memo[`text${suffix}`];
            if (text.language) memo.language = memo[`language${suffix}`];
            memo.place_name = memo[`place_name${suffix}`];

            // Get matching place name if no language matching occurred.
            if (geocoder) {
                for (let k = 0; k < context.length; k++) {
                    const matched = !!context[k].properties['carmen:query_text'] && getMatchingText(context[k], geocoder, language);
                    if (matched) {
                        context[k].matching_text = matched.matching_text;
                        context[k].matching_language = matched.matching_language;
                        if (k === 0) feature.matching_text = matched.matching_text;
                        feature.matching_place_name = getPlaceName(context, formatString, language, languageMode, !!matched);
                        break;
                    }
                }
            }
        }
        return memo;
    }, feature);

    // optionally clip [W,S,E,N] bbox at runtime so that it does not cross the anti-meridian
    if (feat.bbox) feature.bbox = clipBBox ? bbox.clipBBox(feat.bbox) : feat.bbox;

    if (feat.properties['carmen:center']) {
        feature.center = feat.geometry && feat.geometry.type === 'Point' ?
            feat.geometry.coordinates :
            feat.properties['carmen:center'];
        feature.geometry = feat.geometry || {
            type: 'Point',
            coordinates: feat.properties['carmen:center']
        };
    // This case is meant *only* for legacy carmen sources which supported
    // features without geometries.
    } else {
        feature.geometry = null;
    }
    if (feat.properties['carmen:address']) feature.address = String(feat.properties['carmen:address']);
    for (const key in context[0].properties) if (key.indexOf('carmen:') !== 0 || debug) {
        if (key === 'id') continue;
        feature.properties[key] = context[0].properties[key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (let c = 1; c < context.length; c++) {
            if (!context[c].properties['carmen:extid']) throw new Error('Feature has no carmen:extid');
            if (!featureMatchesLanguage(context[c], { language: languages, languageMode: languageMode })) continue;

            const contextFeat = { id: context[c].properties['carmen:extid'] };

            // copy over all non-'carmen:*' properties
            const propertyKeys = Object.keys(context[c].properties).filter((prop) => {
                return !/^carmen:/.test(prop) && !/^id$/.test(prop);
            });

            for (let j = 0; j < propertyKeys.length; j++)
                contextFeat[propertyKeys[j]] = context[c].properties[propertyKeys[j]];

            languages.reduce((memo, language, i) => {
                const suffix = language ? `_${language}` : '';
                const text = closestLang.getText(language, context[c].properties);
                memo[`text${suffix}`] = text.text;
                if (text.language) memo[`language${suffix}`] = text.language.replace('_', '-');
                if (i === 0) {
                    memo.text = memo[`text${suffix}`];
                    if (text.language) memo.language = memo[`language${suffix}`];
                }
                return memo;
            }, contextFeat);

            feature.context.push(contextFeat);
        }
    }

    return feature;
}

/**
 * Attempt to locate text that closely matches the user's query
 * @param {object} item - GeoJSON feature
 * @param {object} geocoder - carmen object
 * @param {string} requestedLanguage - language code
 * @returns {object|undefined} matching text if found, undefined otherwise
 */
function getMatchingText(item, geocoder, requestedLanguage) {
    const closest = requestedLanguage ? closestLang.closestLangLabel(requestedLanguage, item.properties, 'carmen:text_') : undefined;
    const textKey = closest ? 'carmen:text_' + closest : 'carmen:text';
    const closestText = item.properties[textKey].split(',')[0];

    if (item.properties['carmen:matches_language'] && (requestedLanguage ? closest === requestedLanguage : true) && !/,/.exec(item.properties[textKey])) return;

    // now we get to play the game of figuring out which phrase this was originally
    const source = geocoder.byidx[item.properties['carmen:idx']];

    const allPhrases = new Map();
    const original = new Map();
    for (const key of Object.keys(item.properties)) {
        if (!item.properties[key] || !/^carmen:text/.exec(key)) continue;

        item.properties[key].split(',').forEach((sourceText) => {
            const texts = termops.getIndexableText(source.simple_replacer, source.complex_query_replacer, geocoder.replacer,
                { properties: { 'carmen:text': sourceText } }
            );
            if (texts.length) {
                const phrases = termops.getIndexablePhrases(texts[0], { '__COUNT__': [1] });
                phrases.forEach((phrase) => {
                    if (!allPhrases.has(phrase.phrase)) allPhrases.set(phrase.phrase, new Set());
                    allPhrases.get(phrase.phrase).add(key);

                    const oKey = phrase.phrase + '/' + key;
                    if (!original.has(oKey)) original.set(oKey, new Set());
                    original.get(oKey).add(sourceText);
                });
            }
        });
    }

    const query = termops.normalizeQuery(termops.tokenize(item.properties['carmen:query_text'])).tokens.join(' ');
    const regex = new RegExp('^' + query + (item.properties['carmen:prefix'] ? '' : '$'));

    const matches = {};
    for (const candidate of allPhrases.keys()) {
        if (regex.exec(candidate)) {
            for (const phraseKey of allPhrases.get(candidate)) {
                if (!matches.hasOwnProperty(phraseKey)) matches[phraseKey] = candidate;
            }
        }
    }

    // Fallback Behavior to match addresses ie: 12## Main st
    if (!Object.keys(matches).length) {
        const regex = new RegExp('^' + query.replace(/^[0-9]*#+ /, '') + (item.properties['carmen:prefix'] ? '' : '$'));
        for (const candidate of allPhrases.keys()) {
            if (regex.exec(candidate)) {
                for (const phraseKey of allPhrases.get(candidate)) {
                    if (!matches.hasOwnProperty(phraseKey)) matches[phraseKey] = candidate;
                }
            }
        }
    }

    let best = false;
    if (requestedLanguage) {
        best = closestLang.closestLangLabel(requestedLanguage, matches, 'carmen:text_');
        if (best) best = 'carmen:text_' + best;
    } else if (matches['carmen:text']) {
        best = 'carmen:text';
    }

    if (!best) {
        // if all we have is the default, go with that
        if (matches['carmen:text'] && Object.keys(matches).length === 1) {
            best = 'carmen:text';
        } else {
            // otherwise, go with the alphabetically first one that isn't the default, so we have a language to claim
            best = Object.keys(matches).filter((x) => { return x !== 'carmen:text'; }).sort()[0];
        }
    }

    if (!best) {
        // we weren't able to find something that worked; bail
        return;
    }

    const matching_language = best === 'carmen:text' ? null : best.replace('carmen:text_', '');
    const match_key = matches[best] + '/' + best;
    const matching_set = original.has(match_key) ? Array.from(original.get(match_key)) : [];
    const matching_text = matching_set.length ? matching_set[0] : null;

    if (!matching_text || matching_text === closestText) {
        // this was all for nothing :(
        return;
    } else {
        item.matching_text = matching_text;
        const matched = { matching_text: matching_text };
        if (matching_language && matching_language !== closest) {
            item.matching_language = matching_language.replace('_', '-');
            matched.matching_language = matching_language.replace('_', '-');
        }
        return matched;
    }
}
