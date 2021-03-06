'use strict';
const closestLang = require('../text-processing/closest-lang');
const equivalent = require('../text-processing/equivalent-languages.json');

module.exports = {};
module.exports.sourceAllowed = sourceAllowed;
module.exports.sourceMatchesTypes = sourceMatchesTypes;
module.exports.sourceMatchesStacks = sourceMatchesStacks;
module.exports.featureAllowed = featureAllowed;
module.exports.featureMatchesTypes = featureMatchesTypes;
module.exports.featureMatchesStacks = featureMatchesStacks;
module.exports.featureMatchesLanguage = featureMatchesLanguage;
module.exports.equivalentLanguages = equivalentLanguages;

/**
 * For a given source, determine if it is allowed to participate in forward
 * geocode results for a given set of stacks/types filters.
 *
 * This filter is usually applied as an early optimization in our process
 * before we have actual features in hand. We exclude sources when we know
 * they will _never_ give us valid results.
 */
function sourceAllowed(source, options) {
    let allowed = true;
    if (options.stacks) allowed = allowed && sourceMatchesStacks(source, options);
    if (options.types) allowed = allowed && sourceMatchesTypes(source, options);
    return allowed;
}

function sourceMatchesStacks(source, options) {
    // No stack restriction on source
    // If stack is undefined or false
    if (!source.stack || (source.stack && source.stack.length === 0)) return true;
    // Matches a stack
    for (let j = 0; j < source.stack.length; j++) {
        const stack = source.stack[j];
        if (options.stacks.indexOf(stack) !== -1) return true;
    }
    // No matches
    return false;
}

function sourceMatchesTypes(source, options) {
    for (let t = 0; t < source.types.length; t++) {
        const type = source.types[t];
        // Matches a type
        if (options.types.indexOf(type) !== -1) return true;
        // Matches a subtype
        const subtypes = source.scoreranges ? Object.keys(source.scoreranges) : [];
        for (let st = 0; st < subtypes.length; st++) {
            const subtype = type + '.' + subtypes[st];
            if (options.types.indexOf(subtype) !== -1) return true;
        }
    }
    // No matches
    return false;
}

/**
 * For a given feature, determine if it is allowed to participate in forward
 * geocode results for a given set of stacks/types filters. This filter is the
 * final say since we have the full data for a feature in hand.
 */
function featureAllowed(source, feature, options) {
    let allowed = true;
    if (options.types) allowed = allowed && featureMatchesTypes(source, feature, options);
    if (options.languageMode) allowed = allowed && featureMatchesLanguage(feature, options);
    return allowed;
}

function featureMatchesStacks(feature, options) {
    // No stack restriction on feature
    if (!feature || !feature.properties || !feature.properties['carmen:geocoder_stack']) return true;
    // Check stacks for feature stack
    return options.stacks.indexOf(feature.properties['carmen:geocoder_stack']) !== -1;
}

// For a feature to match a type filter it must:
// - Pass the type check
// - Pass the subtype check by score (if it exists)
function featureMatchesTypes(source, feature, options) {
    for (let i = 0; i < options.types.length; i++) {
        const type = options.types[i].split('.');

        // Type-only check
        if (type[0] && !type[1]) {
            if (feature.properties['carmen:types'].indexOf(type[0]) !== -1) {
                return true;
            } else {
                continue;
            }
        }

        // Subtype check
        if (feature.properties['carmen:types'].indexOf(type[0]) !== -1 &&
            feature.properties['carmen:score'] &&
            source.scoreranges &&
            source.scoreranges[type[1]] !== undefined) {
            const range = source.scoreranges[type[1]].slice(0);
            range[0] = source.maxscore * range[0];
            range[1] = source.maxscore * range[1];
            if (feature.properties['carmen:score'] >= range[0] &&
                feature.properties['carmen:score'] <= range[1]) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Filter function for determining whether a feature is allowed by a
 * languageMode: strict filter.
 *
 * @param {object} A geojson feature or proto-geojson feature object with a `properties` key
 * @param {options} A geocoder query options object
 * @return {boolean}
 */
function featureMatchesLanguage(feature, options) {
    if (!options.language) return true;
    if (!options.language[0]) return true;
    if (options.languageMode !== 'strict') return true;
    const label = closestLang.closestLangLabel(options.language[0], feature.properties, 'carmen:text_', options.languageMode);

    const a = closestLang.getLanguageCode(label);
    const b = closestLang.getLanguageCode(options.language[0]);
    return a && b && (a === 'universal' || a === b || equivalentLanguages(label, b));
}

/**
 * Determine whether two different languages are equivalent enough to pass the `languageMode: strict` filter
 *
 * @param {string} a The language label from a feature
 * @param {string} b The language label from the `options.language` setting
 * @return {boolean}
 */
function equivalentLanguages(a, b) {
    return equivalent[a] && equivalent[a].indexOf(b) > -1;
}
