module.exports.toFeature = toFeature;
var closestLang = require('./closest-lang');
var featureMatchesLanguage = require('./filter').featureMatchesLanguage;
var termops = require('./termops');
var bbox = require('./bbox');

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
    var languageFormat = language ? closestLang(language, format, "") : false;
    if (languageFormat) {
        for (var k = 0; k < context.length; k++) {
            var languageText = language ? closestLang(language, context[k].properties, "carmen:text_") : false;
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
    var feat = context[0];
    var place_name;
    // Use geocoder_format to format output if applicable
    if (!formatString || formatString === true || formatString === 1) {
        place_name = ((feat.properties['carmen:address'] ? feat.properties['carmen:address'] + ' ' : '') +
            context
                .filter(function(f) { return matched || featureMatchesLanguage(f, { language: [language], languageMode: languageMode }); })
                .map(function(f) { return (matched ? f.matching_text : undefined) || closestLang.getText(language, f.properties).text; })
                .join(', ')
        ).trim();
    } else {
        // Create template object that lists what we want to know
        var template = formatString.replace(/ /g,'').replace(/,/g,'').trim().replace(/^{/,'').replace(/}$/,'').split('}{');

        // Go through template object one-by-one & check to see if context is available for this template property
        for (var i = 0; i < template.length; i++) {
            var t = template[i].split('.');
            var templateProp     = t[0]; // ex. 'address','place'
            var templateSubprop  = t[1]; // ex. 'name','number'
            var val = '';

            // In cases where subprop is either `name` or `number`, we map to `text` and `address` respectively.
            // Otherwise, we look for the subprop itself
            // If not found, remove from the original format string

            for (var x = 0; x < context.length; x++) {
                var f = context[x];
                if (!f.properties['carmen:text']) throw new Error('Feature has no carmen:text');
                if (!featureMatchesLanguage(f, { language: [language], languageMode: languageMode })) continue;
                var carmenProp = f.properties['carmen:extid'].split('.')[0]; // ex. 'place', 'postcode', 'region'

                // If we found a match between the template property and one within the returned context
                if (templateProp == carmenProp) {
                    if (templateSubprop == '_name') {
                        // `name` is a hardcoded subproperty that maps to carmen:text
                        val = matched && f.matching_text ? f.matching_text : closestLang.getText(language, f.properties).text;
                        formatString = formatString.replace('{' + templateProp + '._name}',val);
                    } else if (templateSubprop == '_number') {
                        // `address` is a hardcored subproperty that maps to carmen:address
                        val = f.properties['carmen:address'];
                        // in case val is a digit and not a comma-separated string
                        if (typeof val === 'number') { val += ''; }
                        val = (val||'').split(',')[0];
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
        formatString = formatString.replace(/\{.+?\}/g, '').replace(/ \, /g,', ').replace(/  /g,' ').replace(/\, \,/g,'').replace(/^\,/,'').replace(/\,\,/,',').trim().replace(/\,$/,'');
        place_name = formatString;
    }
    return place_name;
}

/**
 * toFeature - Reformat a context array into a Carmen GeoJSON feature
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Objects containing default/langauge specific formatting for `place_name`.
 * @param {String} language code to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {String} languageMode option that can be set to 'strict' filter resutlts strictly to a specific language. Undefined defaults null.
 * @param {Boolean} debug Enable debug mode to expose internal properties in results
 * @return {Object} Carmen GeoJSON feature
 */
function toFeature(context, format, languages, languageMode, debug, geocoder, clipBBox) {
    var feat = context[0];
    if (!feat.properties['carmen:center']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

    languages = languages && languages.length ? languages : [''];

    var feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        place_type: feat.properties['carmen:types'],
        relevance: context._relevance,
        properties: {}
    };
    if (feat.matching_text) feature.matching_text = feat.matching_text;
    if (feat.matching_language) feature.matching_language = feat.matching_language;

    languages.reduce(function(memo, language, i) {
        var suffix = language ? `_${language}` : '';
        var text = closestLang.getText(language, feat.properties);
        var formatString = getFormatString(context, format, language);
        memo[`text${suffix}`] = text.text;
        if (text.language) memo[`language${suffix}`] = text.language.replace("_", "-");
        memo[`place_name${suffix}`] = getPlaceName(context, formatString, language, languageMode);

        if (i === 0) {
            memo.text = memo[`text${suffix}`];
            if (text.language) memo.language = memo[`language${suffix}`];
            memo.place_name = memo[`place_name${suffix}`];

            // Get matching place name if no language matching occurred.
            if (geocoder) {
                for (var k = 0; k < context.length; k++) {
                    var matched = !!context[k].properties['carmen:query_text'] && getMatchingText(context[k], geocoder, language);
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
    if (feat.properties['carmen:address']) feature.address = feat.properties['carmen:address'];
    for (var key in context[0].properties) if (key.indexOf('carmen:') !== 0 || debug) {
        if (key === 'id') continue;
        feature.properties[key] = context[0].properties[key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (var c = 1; c < context.length; c++) {
            if (!context[c].properties['carmen:extid']) throw new Error('Feature has no carmen:extid');
            if (!featureMatchesLanguage(context[c], { language: languages, languageMode: languageMode })) continue;

            var contextFeat = { id: context[c].properties['carmen:extid'] };

            // copy over all non-'carmen:*' properties
            var propertyKeys = Object.keys(context[c].properties).filter(function(prop) {
                return !/^carmen:/.test(prop) && !/^id$/.test(prop);
            });

            for (var j = 0; j < propertyKeys.length; j++)
                contextFeat[propertyKeys[j]] = context[c].properties[propertyKeys[j]];

            languages.reduce(function(memo, language, i) {
                var suffix = language ? `_${language}` : '';
                var text = closestLang.getText(language, context[c].properties);
                memo[`text${suffix}`] = text.text;
                if (text.language) memo[`language${suffix}`] = text.language.replace("_", "-");
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

function getMatchingText(item, geocoder, requestedLanguage) {
    var closest = requestedLanguage ? closestLang.closestLangLabel(requestedLanguage, item.properties, 'carmen:text_') : undefined;
    var textKey = closest ? "carmen:text_" + closest : "carmen:text";
    var closestText = item.properties[textKey].split(',')[0];

    if (item.properties['carmen:matches_language'] && !/,/.exec(item.properties[textKey])) return;

    // now we get to play the came of figuring out which phrase this was originally
    var source = geocoder.byidx[item.properties['carmen:idx']];

    var allPhrases = new Map();
    var original = new Map();
    for (var key of Object.keys(item.properties)) {
        if (!item.properties[key] || !/^carmen:text/.exec(key)) continue;

        item.properties[key].split(',').forEach(function(sourceText) {
            var texts = termops.getIndexableText(source.token_replacer, source.globaltokens,
                {properties:{'carmen:text': sourceText}}
            );
            if (texts.length) {
                var phrases = termops.getIndexablePhrases(texts[0].tokens, {"__COUNT__": [1]});
                phrases.forEach(function(phrase) {
                    if (!allPhrases.has(phrase.phrase)) allPhrases.set(phrase.phrase, new Set());
                    allPhrases.get(phrase.phrase).add(key);

                    var oKey = phrase.phrase + "/" + key;
                    if (!original.has(oKey)) original.set(oKey, new Set());
                    original.get(oKey).add(sourceText);
                })
            }
        })
    }

    var query = termops.encodableText(item.properties['carmen:query_text']);
    var regex = new RegExp("^" + query + (item.properties['carmen:prefix'] ? "" : "$"));

    var matches = {};
    for (var candidate of allPhrases.keys()) {
        if (regex.exec(candidate)) {
            for (var phraseKey of allPhrases.get(candidate)) {
                if (!matches.hasOwnProperty(phraseKey)) matches[phraseKey] = candidate;
            }
        }
    }

    var best;
    if (requestedLanguage) {
        best = closestLang.closestLangLabel(requestedLanguage, matches, 'carmen:text_');
        if (best) best = 'carmen:text_' + best;
    } else if (matches['carmen:text']) {
        best = 'carmen:text';
    }
    if (!best) {
        // if all we have is the default, go with that
        if (matches['carmen:text'] && Object.keys(matches).length == 1) {
            best = 'carmen:text';
        } else {
            // otherwise, go with the alphabetically first one that isn't the default, so we have a language to claim
            best = Object.keys(matches).filter(function(x) { return x != 'carmen:text'; }).sort()[0];
        }
    }

    if (!best) {
        // we weren't able to find something that worked; bail
        return;
    }

    var matching_language = best == "carmen:text" ? null : best.replace("carmen:text_", "");
    var match_key = matches[best] + "/" + best;
    var matching_set = original.has(match_key) ? Array.from(original.get(match_key)) : [];
    var matching_text = matching_set.length ? matching_set[0] : null;

    if (!matching_text || matching_text == closestText) {
        // this was all for nothing :(
        return;
    } else {
        item.matching_text = matching_text;
        var matched = { matching_text: matching_text };
        if (matching_language && matching_language != closest) {
            item.matching_language = matching_language.replace('_', '-');
            matched.matching_language = matching_language.replace('_', '-');
        }
        return matched;
    }
}
