'use strict';
const termops = require('../text-processing/termops');
const token = require('../text-processing/token');
const bb = require('../util/bbox');
const cl = require('../text-processing/closest-lang');
const filter = require('./filter-sources');

// TODO: unit test for phrasematch

/**
* phrasematch
* @access public
*
* @param {Object} source a Geocoder datasource
* @param {Array} a list of terms composing the query to Carmen
* @param {Object} options passed through the geocode function in geocode.js
* @param {Function} callback called with `(err, phrasematches, source)`
*/
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = options.autocomplete || false;
    options.bbox = options.bbox || false;
    options.fuzzyMatch = options.fuzzyMatch || false;
    const tokenized = termops.tokenize(token.replaceToken(source.token_replacer, query));

    // if requested country isn't included, skip
    if (options.stacks) {
        const stackAllowed = filter.sourceMatchesStacks(source, options);
        if (!stackAllowed) return callback(null, new PhrasematchResult([], source));
    }

    // if not in bbox, skip
    if (options.bbox) {
        const intersects = bb.intersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, new PhrasematchResult([], source));
    }

    // Get all subquery permutations from the query
    let subqueries = termops.permutations(tokenized);

    // Include housenum tokenized permutations if source has addresses
    if (source.geocoder_address) {
        const numTokenized = termops.numTokenize(tokenized, source.version);
        for (let i = 0; i < numTokenized.length; i++) {
            subqueries = subqueries.concat(termops.permutations(numTokenized[i]));
        }
    }

    subqueries = termops.uniqPermutations(subqueries);
    const phraseSet = source._dictcache;

    // load up scorefactor used at indexing time.
    // it will be used to scale scores for approximated
    // cross-index comparisons.
    const scorefactor = (source._geocoder.freq.get('__MAX__') || [0])[0] || 1;

    const phrasematches = [];

    let l = subqueries.length;
    while (l--) {
        const subquery = subqueries[l];
        const text = termops.encodableText(subquery);
        if (text) {
            const scanPrefix = subquery.ender && options.autocomplete;
            let variants;

            if (options.fuzzyMatch) {
                let phraseSetMatches;
                if (scanPrefix) {
                    phraseSetMatches = phraseSet.reader.fuzzy_match_prefix(text.split(' '), 1, 2);
                } else {
                    phraseSetMatches = phraseSet.reader.fuzzy_match(text.split(' '), 1, 2);
                }
                if (phraseSetMatches.length === 0) {
                    continue;
                } else {
                    variants = [];
                    for (let i = 0; i < phraseSetMatches.length; i++) {
                        const _psm = phraseSetMatches[i];
                        variants.push({
                            text: _psm.phrase.join(' '),
                            prefix: scanPrefix,
                            edit_distance: _psm.edit_distance
                        });
                    }
                }
            } else {
                let phraseSetMatch;
                if (scanPrefix) {
                    phraseSetMatch = phraseSet.reader.contains_prefix(text.split(' '));
                } else {
                    phraseSetMatch = phraseSet.reader.contains(text.split(' '));
                }
                if (!phraseSetMatch) {
                    continue;
                } else {
                    variants = [
                        { text: subquery.join(' '), prefix: scanPrefix, edit_distance: 0 }
                    ];
                }
            }

            for (const variant of variants) {
                // Augment permutations with matched grids,
                // index position and weight relative to input query.
                const phrase = termops.encodePhrase(variant.text);
                // use the original subquery to calculate weight, in case the variant has a different cardinality
                const weight = subquery.length / tokenized.length;

                const prefix = (variant.prefix && !(source.geocoder_address && termops.isAddressNumber(text)));

                let languages;
                if (options.language) {
                    languages = [options.language[0]];
                } else {
                    // this may not be what we want to do here
                    // if effectively treats 'default' as its own language, and a lack of
                    // specified language flag as a search over this language
                    // we could alternatively search all languages here by setting this field
                    // to undefined, or emply some other strategy
                    languages = ['default'];
                }
                languages = languages.map((l) => {
                    // use the built-in language if we have it
                    if (source.lang.lang_map.hasOwnProperty(l)) {
                        return source.lang.lang_map[l];
                    } else {
                        const label = cl.closestLangLabel(l, source.lang.lang_map);
                        return source.lang.lang_map[label || 'unmatched'];
                    }
                });
                // TODO: need to add data to Phrasematch to be used in
                // relevance rankings. could be edit distance, or maybe the
                // distance adjusted by overall length of query <27-06-18, boblannon> //
                phrasematches.push(new Phrasematch(variant.text.split(' '), weight, subquery.mask, phrase, scorefactor, source.idx, source._geocoder.grid, source.zoom, prefix, languages, variant.edit_distance, variant.text.split(' ').length));
            }
        }
    }
    return callback(null, new PhrasematchResult(phrasematches, source));
};

/**
* PhrasematchResult
* @param {Object} phrasematches for the subquery combinations generated from the phrasematch function
* @param {Object} source a Geocoder datasource
**/
module.exports.PhrasematchResult = PhrasematchResult;
function PhrasematchResult(phrasematches, source) {
    this.phrasematches = phrasematches;
    this.idx = source.idx;
    this.nmask = 1 << source.ndx;
    this.bmask = source.bmask;
}

/**
* Phrasematch Object constructor
* Attributes used by carmen-cache, all phrasematches from the same source have the same values for idx, cache, zoom
**/
module.exports.Phrasematch = Phrasematch;
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom, prefix, languages, edit_distance, subquery_length) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.scorefactor = scorefactor;
    this.prefix = prefix;
    this.languages = languages;
    this.idx = idx;
    this.cache = cache;
    this.zoom = zoom;
    this.edit_distance = edit_distance;
    this.subquery_length = subquery_length;
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom, this.prefix, this.languages, this.edit_distance, this.subquery_length);
};
