module.exports.toFeature = toFeature;
var closestLang = require('./closest-lang');

/**
 * toFeature - Reformat a context array into a Carmen GeoJSON feature
 *
 * @param {Object} context Array of GeoJSON features ordered by index level
 * @param {Object} format Objects containing default/langauge specific formatting for `place_name`.
 * @param {String} language code to select language/formatting from context array. Undefined defaults to `carmen:text`
 * @param {Boolean} debug Enable debug mode to expose internal properties in results
 * @return {Object} Carmen GeoJSON feature
 */
function toFeature(context, format, language, debug) {
    var feat = context[0];
    if (!feat.properties['carmen:center']&& !feat.properties['carmen:legacy']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

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
    if (typeof format === 'object') format = format['default'];

    var _gettext = function(f) {
        if (!f.properties['carmen:text'] && !f.properties['carmen:legacy']) throw new Error('Feature has no carmen:text');
        if (!language)
            return { text: f.properties['carmen:text'].split(',')[0], language: false };
        var languageLabel = closestLang.closestLangLabel(language, f.properties, "carmen:text_");
        var languageText = languageLabel ? f.properties["carmen:text_" + languageLabel] : false;
        return {
            text: (languageText||f.properties['carmen:text']||'').split(',')[0],
            language: languageText ? languageLabel : false
        };
    };
    var gettext = function(f) {
        return _gettext(f).text;
    };

    var place_name;
    // Use geocoder_format to format output if applicable
    if (!format || format === true || format === 1) {
        place_name = ((feat.properties['carmen:address'] ? feat.properties['carmen:address'] + ' ' : '') + context.map(gettext).join(', ')).trim();
    } else {
        // Create template object that lists what we want to know
        var template = format.replace(/ /g,'').replace(/,/g,'').trim().replace(/^{/,'').replace(/}$/,'').split('}{');

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
                if (!f.properties['carmen:text'] && !f.properties['carmen:legacy']) throw new Error('Feature has no carmen:text');
                var carmenProp = f.properties['carmen:extid'].split('.')[0]; // ex. 'place', 'postcode', 'region'

                // If we found a match between the template property and one within the returned context
                if (templateProp == carmenProp) {
                    if (templateSubprop == '_name') {
                        // `name` is a hardcoded subproperty that maps to carmen:text
                        val = gettext(f);
                        format = format.replace('{' + templateProp + '._name}',val);
                    } else if (templateSubprop == '_number') {
                        // `address` is a hardcored subproperty that maps to carmen:address
                        val = f.properties['carmen:address'];
                        // in case val is a digit and not a comma-separated string
                        if (typeof val === 'number') { val += ''; }
                        val = (val||'').split(',')[0];
                        format = format.replace('{' + templateProp + '._number}',val);
                    } else {
                        // otherwise, subproperties appear as standard strings within feature properties
                        val = f.properties[templateSubprop];
                        if (val) {
                            format = format.replace('{' + templateProp + '.' + templateSubprop + '}',val);
                        } else {
                            // No matches or text, remove altogether
                            format = format.replace('{' + templateProp + '.' + templateSubprop + '}','');
                        }
                    }
                }
            }
        }
        // Handle any cases where context wasn't available by getting rid of curly braces, awkwards spaces/commas
        format = format.replace(/\{.+?\}/g, '').replace(/ \, /g,', ').replace(/  /g,' ').replace(/\, \,/g,'').replace(/^\,/,'').replace(/\,\,/,',').trim().replace(/\,$/,'');
        place_name = format;
    }

    var featureText = _gettext(feat);
    var feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        text: featureText.text,
        place_name: place_name,
        relevance: context._relevance,
        properties: {}
    };

    if (featureText.language) feature.language = featureText.language.replace("_", "-");

    if (feat.bbox) feature.bbox = feat.bbox;

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
            var contextFeat = {
                id: context[c].properties['carmen:extid'],
                text: gettext(context[c])
            };

            // copy over all non-'carmen:*' properties
            var propertyKeys = Object.keys(context[c].properties).filter(function(prop) {
                return !/^carmen:/.test(prop) && !/^id$/.test(prop);
            });

            for (var j = 0; j < propertyKeys.length; j++)
                contextFeat[propertyKeys[j]] = context[c].properties[propertyKeys[j]];

            feature.context.push(contextFeat);
        }
    }

    return feature;
}
