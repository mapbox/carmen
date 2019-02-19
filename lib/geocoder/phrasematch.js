'use strict';
const termops = require('../text-processing/termops');
const token = require('../text-processing/token');
const bb = require('../util/bbox');
const cl = require('../text-processing/closest-lang');
const filter = require('./filter-sources');
const MIN_CORRECTION_LENGTH = require('../constants').MIN_CORRECTION_LENGTH;
const PREFIX_SCAN = require('@mapbox/carmen-cache').PREFIX_SCAN;

// TODO: unit test for phrasematch

/**
* phrasematch
* @access public
*
* @param {Object} source a Geocoder datasource
* @param {Objext} tokenized query object
* @param {Object} options passed through the geocode function in geocode.js
* @param {Function} callback called with `(err, phrasematches, source)`
*/
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = !!(options.autocomplete || false);
    options.bbox = options.bbox || false;
    options.fuzzyMatch = options.fuzzyMatch === undefined ? true : !!options.fuzzyMatch;
    let partialNumber = false;

    // if requested country isn't included, skip
    if (options.stacks) {
        const stackAllowed = filter.sourceMatchesStacks(source, options);
        if (!stackAllowed) return callback(null, new PhrasematchResult([], source));
    }

    // if not in bbox, skip
    if (options.bbox) {
        const intersects = bb.amIntersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, new PhrasematchResult([], source));
    }

    const proxMatch = options.proximity ?
        bb.amInside(options.proximity, source.bounds) :
        false;

    const phraseSet = source._dictcache.reader;

    termops.encodableText(token.replaceToken(source.complex_query_replacer, query));

    // TODO move upstream, maybe into encodableText
    const normalized = { tokens:[], owner:[] };
    for (let i = 0; i < query.normalized.length; i++) {
        // Replacement that removed a token will leave an empty spot, remove it.
        if (query.normalized[i].length === 0) continue;

        // Replacment may split a token into two words, we need to expand that
        // for fuzzyMatch.
        if (query.normalized[i].includes(' ')) {
            const words = query.normalized[i].split(' ');
            for (let j = 0; j < words.length; j++) {
                normalized.tokens.push(words[j]);
                normalized.owner.push(query.owner[i]);
            }
        } else {
            normalized.tokens.push(query.normalized[i]);
            normalized.owner.push(query.owner[i]);
        }
    }

    const maxDistance = (options.fuzzyMatch && query.normalized.length <= options.max_correction_length) ? 1 : 0;
    const endingType = options.autocomplete ?
        (query.lastWord ? PREFIX_SCAN.word_boundary : PREFIX_SCAN.enabled) :
        PREFIX_SCAN.disabled;

    let subqueries;
    if (!source.geocoder_address) {
        // this is the common case, in which the permutations we're exploring
        // are just all the substrings of the query; in this case, we can trust
        // fuzzy-phrase to explore the windows of our query for us
        const windowMatches = phraseSet.fuzzyMatchWindows(normalized.tokens, maxDistance, maxDistance, endingType);

        subqueries = [];
        for (const match of windowMatches) {
            const subquery = match.phrase;
            subquery.original_phrase = normalized.tokens.slice(
                match.start_position,
                match.start_position + match.phrase.length
            );

            // for phrases comprised of a single very short word, don't accept corrections
            if (match.edit_distance > 0 && match.phrase.length === 1) {
                if (
                    // if the original thing was really short...
                    subquery.original_phrase[0].length < MIN_CORRECTION_LENGTH ||
                    // or if the output is really short and it actually seems like a fuzzy match to
                    // a short word instead of a token replacement (ie, they have similar lengths)
                    (
                        match.phrase[0].length < MIN_CORRECTION_LENGTH &&
                        Math.abs(match.phrase[0].length - subquery.original_phrase[0].length) <= 1
                    )
                ) {
                    continue;
                }
            }
            subquery.ending_type = match.ending_type;

            const maskBegin = normalized.owner[match.start_position];
            const maskSpan = 1 + (normalized.owner[match.start_position + match.phrase.length - 1] - maskBegin);
            let mask = 0;
            for (let i = 0; i < maskSpan; i++) {
                mask = mask | (1 << (maskBegin + i));
            }
            subquery.mask = mask;
            subquery.edit_distance = match.edit_distance;
            subqueries.push(subquery);
        }
        subqueries.sort((a, b) => b.length - a.length);
    } else {
        // addresses are special and need to do weird rearrangements of tokens,
        // so we'll do this on the JS side

        subqueries = [];

        // Get all subquery permutations from the query
        let allSubqueries = termops.permutations(normalized.tokens);
        allSubqueries = termops.uniqPermutations(allSubqueries);

        if (normalized.tokens.length > 1) {
            // Include housenum tokenized permutations
            // but only if there are multiple words so we know the number part
            // is complete
            const numTokenized = termops.numTokenize(normalized.tokens, source.version);
            for (let i = 0; i < numTokenized.length; i++) {
                allSubqueries = allSubqueries.concat(termops.permutations(numTokenized[i]));
            }
        } else if (normalized.tokens.length === 1 && normalized.tokens[0].match(/^\d+$/)) {
            if (proxMatch) {
                // if the query is just one word and it's a number, and we're
                // at a prox point inside this index, do some special stuff to
                // consider what different things that number might be short for
                const numTokenized = termops.numTokenizePrefix(normalized.tokens, source.version);
                for (let i = 0; i < numTokenized.length; i++) {
                    allSubqueries = allSubqueries.concat(termops.permutations(numTokenized[i]));
                }
                partialNumber = true;
            } else if (options.proximity) {
                // if proximity is turned on but we're in a different index,
                // and the query is just a number, go even further and nuke even
                // non-waffle candidates
                allSubqueries = [];
            }
        }
        // if it's one word and not a number, don't do numTokenize at all

        const toMatch = allSubqueries
            .filter((subquery) => subquery)
            .map((subquery) => [subquery, subquery.ender ? endingType : PREFIX_SCAN.disabled]);
        const results = phraseSet.fuzzyMatchMulti(toMatch, maxDistance, maxDistance);
        let l = toMatch.length;
        while (l--) {
            const subquery = toMatch[l][0];

            const phraseSetMatches = results[l];

            for (let i = 0; i < phraseSetMatches.length; i++) {
                const sq = phraseSetMatches[i].phrase;
                sq.original_phrase = subquery;
                sq.edit_distance = phraseSetMatches[i].edit_distance;
                sq.ending_type = phraseSetMatches[i].ending_type;

                // for phrases comprised of a single very short word, don't accept corrections
                if (sq.edit_distance > 0 && sq.length === 1) {
                    if (
                        sq[0].length < MIN_CORRECTION_LENGTH ||
                        sq.original_phrase[0].length < MIN_CORRECTION_LENGTH
                    ) {
                        continue;
                    }
                }

                // Translate the matched mask to original query
                let start;
                let end = normalized.tokens.length - 1;
                for (let j = 0; j < normalized.tokens.length; j++) {
                    if (start === undefined) {
                        if ((subquery.mask & 1 << j) > 0) start = j;
                    }
                    else if ((subquery.mask & 1 << j) === 0) {
                        end = j - 1;
                        break;
                    }
                }
                const maskBegin = normalized.owner[start];
                const maskSpan = 1 + (normalized.owner[end] - maskBegin);
                let mask = 0;
                for (let i = 0; i < maskSpan; i++) {
                    mask = mask | (1 << (maskBegin + i));
                }
                sq.mask = mask;

                subqueries.push(sq);
            }
        }
    }

    let languages;
    if (source.geocoder_universal_text) {
        // if all text in the index is unversal, we won't apply any language
        // penalties at all
        languages = null;
    } else {
        const languageName = options.language ? options.language[0] : 'default';
        // use the built-in language if we have it
        if (source.lang.lang_map.hasOwnProperty(languageName)) {
            languages = [source.lang.lang_map[languageName]];
        } else {
            const label = cl.closestLangLabel(languageName, source.lang.lang_map);
            languages = [source.lang.lang_map[label || 'unmatched']];
        }
    }

    // load up scorefactor used at indexing time.
    // it will be used to scale scores for approximated
    // cross-index comparisons.
    const scorefactor = (source._geocoder.freq.get('__MAX__') || [0])[0] || 1;

    const phrasematches = [];

    for (const subquery of subqueries) {
        const phrase = subquery.join(' ');
        // Augment permutations with matched grids,
        // index position and weight relative to input query.
        // use the original subquery to calculate weight, in case the variant has a different cardinality
        const weight = subquery.length / normalized.tokens.length;
        let editMultiplier = 1;
        if (subquery.edit_distance !== 0) {
            // approximate a levenshtein ratio -- this is usually defined as
            // ratio(a, b) = ((len(a) + len(b)) - distance(a, b)) / (len(a) + len(b))
            // except in this instance we're just going to base it on the query text,
            // so that different matches that are the same distance from the query
            // text can be disambiguated by score even if they have different lengths
            const original = subquery.original_phrase.join(' ');
            editMultiplier = Math.max(
                (original.length - (subquery.edit_distance / 2)) / original.length,
                .75
            );
        }

        // If the query matches an index with geocoder_categories set
        // and the query is one of the listed categories, give this
        // possible result a small bump
        let catMatch  = false;
        if (source.categories) {
            catMatch = source.categories.has(phrase);
        }

        // Set prefix to determine how carmen cache will handle autocomplete
        const prefix = subquery.ending_type;
        const extendedScan = partialNumber;
        phrasematches.push(new Phrasematch(subquery, weight, subquery.mask, phrase, scorefactor, source.idx, source._geocoder.grid, source.zoom, prefix, languages, editMultiplier, proxMatch, catMatch, partialNumber, extendedScan));
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
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom, prefix, languages, editMultiplier, proxMatch, catMatch, partialNumber, extendedScan) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.scorefactor = scorefactor;
    this.prefix = prefix;
    this.idx = idx;
    this.cache = cache;
    this.zoom = zoom;
    this.editMultiplier = editMultiplier || 1;
    this.proxMatch = proxMatch || false;
    this.catMatch = catMatch || false;
    this.partialNumber = partialNumber || false;
    this.extendedScan = extendedScan || false;
    if (languages) {
        // carmen-cache gives special treatment to the "languages" property
        // being absent, so if we don't get one passed in, don't pass it through
        this.languages = languages;
    }
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom, this.prefix, this.languages, this.editMultiplier, this.proxMatch, this.catMatch, this.partialNumber, this.extendedScan);
};
