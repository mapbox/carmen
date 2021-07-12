'use strict';
const termops = require('../text-processing/termops');
const token = require('../text-processing/token');
const bb = require('../util/bbox');
const cl = require('../text-processing/closest-lang');
const filter = require('./filter-sources');
const whitespace = require('../util/whitespace');
const MIN_CORRECTION_LENGTH = require('../constants').MIN_CORRECTION_LENGTH;
const MAX_QUERY_TOKENS = require('../constants').MAX_QUERY_TOKENS;
const ENDING_TYPE = require('@mapbox/carmen-core').ENDING_TYPE;

/**
 * phrasematch
 * @access public
 *
 * @param {Object} source - a Geocoder datasource
 * @param {TokenizedQuery} query - tokenized query object
 * @param {Object} options - passed through the geocode function in geocode.js
 * @param {Function} callback - called with `(err, phrasematches, source)`
 * @returns {undefined}
 */
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = !!(options.autocomplete || false);
    options.bbox = options.bbox || false;
    options.fuzzyMatch = options.fuzzyMatch === undefined ? true : !!options.fuzzyMatch;

    let anyPartialNumber = false;
    let hasSingleCharPhrasematches = false;
    let hasNonSingleCharPhrasematches = false;

    const hasCorrectlySpelled = new Map();
    const misspelledShortCount = new Map();

    let bounds = undefined;
    // if requested country isn't included, skip
    if (options.stacks) {
        const stackAllowed = filter.sourceMatchesStacks(source, options);
        if (!stackAllowed) return callback(null, []);

        if (source.geocoder_stack_bounds && Object.keys(source.geocoder_stack_bounds).length > 0) {
            bounds = options.stacks.reduce((acc, curr) => {
                const b = source.geocoder_stack_bounds[curr];
                if (acc && b) {
                    return bb.union(acc, b);
                } else if (b) {
                    return b;
                } else {
                    return acc;
                }
            }, undefined);
        }
    }

    // if not in bbox, skip
    if (options.bbox) {
        const intersects = bb.amIntersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, []);
    }

    const proxMatch = options.proximity ?
        bb.amInside(options.proximity, source.bounds) :
        false;

    const phraseSet = source._fuzzyset.reader;

    const hypotheses = [
        {
            query: query,
            maxDistance: (options.fuzzyMatch && query.tokens.length <= options.max_correction_length) ? 1 : 0,
            initialDistance: 0
        }
    ];

    // if this is an address index and fuzzy search is enabled, attempt whitespace
    // correction, which might generate more hypotheses
    if (source.geocoder_address && hypotheses[0].maxDistance > 0) {
        for (const corrector of whitespace.correctors) {
            const correction = corrector(query);
            if (correction) {
                hypotheses.push({
                    query: correction,
                    // we spent our budget on this
                    maxDistance: 0,
                    initialDistance: 1
                });
            }
            // only attempt one correction per query
            break;
        }
    }

    for (const hypo of hypotheses) {
        hypo.replaced = token.replaceToken(source.complex_query_replacer, hypo.query);
        hypo.gapExpansionMasks = gapMasks(hypo.replaced);
        hypo.normalized = termops.normalizeQuery(hypo.replaced);
        if (options.autocomplete) {
            const endsInBoundary = hypo.normalized.separators[hypo.normalized.separators.length - 1] !== '';
            if (hypo.normalized.lastWord || endsInBoundary) {
                // if it's autocomplete but either we token-replaced the last word, or
                // the query ends with a word-boundary, only prefix-match whole-word prefixes
                hypo.endingType = ENDING_TYPE.wordBoundaryPrefix;
            } else {
                // otherwise all prefixes, including partial-world ones, are fine
                hypo.endingType = ENDING_TYPE.anyPrefix;
            }
        } else {
            hypo.endingType = ENDING_TYPE.nonPrefix;
        }
    }

    let subqueries;
    if (!source.geocoder_address) {
        // at least for now, we're just trying the initial hypothesis on non-address indexes
        const hypo = hypotheses[0];

        // this is the common case, in which the permutations we're exploring
        // are just all the substrings of the query; in this case, we can trust
        // fuzzy-phrase to explore the windows of our query for us
        const windowMatches = phraseSet.fuzzyMatchWindows(hypo.normalized.tokens, hypo.maxDistance, hypo.maxDistance, hypo.endingType);

        subqueries = [];
        for (const match of windowMatches) {
            const subquery = match.phrase;
            subquery.original_phrase = hypo.normalized.tokens.slice(
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

            // for multi word queries that end in a single character
            // we don't match everything that starts with the character just the exact match
            if (source.zoom >= 14 && subquery.original_phrase[0].length === 1) {
                if (subquery.original_phrase[0] !== match.phrase[0]) continue;
            }

            subquery.ending_type = match.ending_type;
            subquery.phrase_id_range = match.phrase_id_range;

            // Because we may have altered the number of tokens when applying
            // replacements we build a new mask based on the start position and
            // phrase length.
            const maskBegin = hypo.normalized.owner[match.start_position];
            const endPos = match.start_position + match.phrase.length - 1;
            const maskEnd = hypo.normalized.owner[endPos];

            // If not at the start of the query and the previous token has
            // the same owner as our start we're in the middle of a token
            // that the user input and this match is invalid.
            if (match.start_position !== 0 && hypo.normalized.owner[match.start_position - 1] === maskBegin) continue;

            // If we've got the last term we need to handle the case where
            // the query has been shortened and mask out to end of the original query.
            if (endPos === (hypo.normalized.owner.length - 1)) {
                subquery.mask = buildMask(maskBegin, (query.tokens.length - maskBegin));
            }
            else if (hypo.normalized.owner[endPos + 1] === maskEnd) {
                // If not at the end of the query and the next token has the
                // same owner as ours end we are in the middle of a user
                // entered token and need to discard this match.
                continue;
            }
            else {
                subquery.mask = buildMask(maskBegin, 1 + (maskEnd - maskBegin));
            }

            subquery.edit_distance = match.edit_distance;
            subqueries.push(subquery);

            // If the query covers removed tokens add phrasematches that consume
            // those positions;
            Array.prototype.push.apply(subqueries, coverGaps(hypo.gapExpansionMasks, subquery));
        }
        subqueries.sort((a, b) => b.length - a.length);
    } else {
        // addresses are special and need to do weird rearrangements of tokens,
        // so we'll do this on the JS side

        subqueries = [];
        const alreadyTried = new Set();

        for (let h = 0; h < hypotheses.length; h++) {
            const hypo = hypotheses[h];
            let partialNumber = false;

            // Get all subquery permutations from the query
            let allSubqueries = termops.permutations(hypo.normalized.tokens);

            // Build list of disallowed windows that split ownership
            const requiredWindows = requiredMasks(hypo.normalized);

            if (hypo.normalized.tokens.length > 1) {
                // Include housenum tokenized permutations
                // but only if there are multiple words so we know the number part
                // is complete
                const numTokenized = termops.numTokenize(hypo.normalized.tokens, source.version);
                for (let i = 0; i < numTokenized.length; i++) {
                    allSubqueries = allSubqueries.concat(termops.permutations(numTokenized[i]));
                }
                // ...and filter out anything that doesn't look like an address.
                allSubqueries = termops.addressPermutations(allSubqueries);

                if (source.geocoder_intersection_token) {
                    allSubqueries = allSubqueries.concat(termops.intersectionPermutations(hypo.normalized, source.geocoder_intersection_token));
                }
            } else if (hypo.normalized.tokens.length === 1 && hypo.normalized.tokens[0].match(/^\d+$/) && proxMatch) {
                // if the query is just one word and it's a number, and we're
                // at a prox point inside this index, do some special stuff to
                // consider what different things that number might be short for
                const numTokenized = termops.numTokenizePrefix(hypo.normalized.tokens, source.version);
                for (let i = 0; i < numTokenized.length; i++) {
                    allSubqueries = allSubqueries.concat(termops.permutations(numTokenized[i]));
                }
                partialNumber = true;
                anyPartialNumber = true;
            }
            // if it's one word and not a number, don't do numTokenize at all

            const toMatch = allSubqueries
                .filter((subquery) => {
                    if (!(subquery && demandWindows(requiredWindows, subquery.mask))) return false;
                    // disallow number-only single-token phrases in address indexes unless we're doing a
                    // proximity-matched partial-number search
                    if (!partialNumber && subquery.length === 1 && subquery[0].match(/^[\d#]+$/)) return false;

                    // hypotheses will have overlapping phrases, so if we're not on the first hypo,
                    // only attempt phrases that haven't been tried before
                    const dedupeKey = JSON.stringify(subquery.concat(subquery.ender, subquery.mask));
                    if (h > 0 && alreadyTried.has(dedupeKey)) return false;
                    alreadyTried.add(dedupeKey);

                    return true;
                })
                .map((subquery) => [subquery, subquery.ender ? hypo.endingType : ENDING_TYPE.nonPrefix]);
            const results = phraseSet.fuzzyMatchMulti(toMatch, hypo.maxDistance, hypo.maxDistance);
            let l = toMatch.length;
            while (l--) {
                const subquery = toMatch[l][0];

                const phraseSetMatches = results[l];

                for (let i = 0; i < phraseSetMatches.length; i++) {
                    const sq = phraseSetMatches[i].phrase;
                    sq.original_phrase = subquery;
                    sq.edit_distance = phraseSetMatches[i].edit_distance + hypo.initialDistance;
                    sq.ending_type = phraseSetMatches[i].ending_type;
                    sq.phrase_id_range = phraseSetMatches[i].phrase_id_range;
                    sq.partial_number = partialNumber;

                    // for phrases comprised of a single very short word, don't accept corrections
                    if (sq.edit_distance > 0 && sq.length === 1) {
                        if (
                            sq[0].length < MIN_CORRECTION_LENGTH ||
                            sq.original_phrase[0].length < MIN_CORRECTION_LENGTH
                        ) {
                            continue;
                        }
                    }

                    // Because we may have altered the number of tokens when applying
                    // replacements we need to translate the matched mask to the
                    // original query, first we scan the returned query to get the
                    // start and end of the matched window...
                    const lim = findMaskBounds(subquery.mask, hypo.normalized.tokens.length);

                    // Then, as with the non-address code we lookup build a new
                    // mask, but...
                    const maskBegin = hypo.normalized.owner[lim[0]];
                    // If we've got the last term we need to handle the case where
                    // the query has been shortened and mask out to end of the original query.
                    if (subquery.ender && lim[1] === (hypo.normalized.owner.length - 1)) {
                        sq.mask = buildMask(maskBegin, (query.tokens.length - maskBegin));
                    } else {
                        sq.mask = buildMask(maskBegin, 1 + (hypo.normalized.owner[lim[1]] - maskBegin));
                    }

                    if (subquery.address) {
                        sq.address = {
                            number: subquery.address.number,
                            numberOrder: subquery.address.numberOrder,
                            // map the position to the global position if token
                            // replacements have shifted it
                            position: hypo.normalized.owner[subquery.address.position]
                        };
                    }

                    subqueries.push(sq);

                    // If the query covers removed tokens add phrasematches that consume
                    // those positions;
                    Array.prototype.push.apply(subqueries, coverGaps(hypo.gapExpansionMasks, sq));
                }
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
    const scorefactor = source.maxscore || 1;

    let phrasematches = [];

    for (const subquery of subqueries) {
        const phrase = subquery.join(' ');
        if (phrase.length === 0) continue;
        // Adjust weight relative to input query.
        const b = findMaskBounds(subquery.mask, MAX_QUERY_TOKENS);
        let weight = (b[1] - b[0] + 1) / query.tokens.length;

        if (subquery.edit_distance !== 0) {
            // approximate a levenshtein ratio -- this is usually defined as
            // ratio(a, b) = ((len(a) + len(b)) - distance(a, b)) / (len(a) + len(b))
            // except in this instance we're just going to base it on the query text,
            // so that different matches that are the same distance from the query
            // text can be disambiguated by score even if they have different lengths
            const original = subquery.original_phrase.join(' ');
            const penalty = Math.max(
                (original.length - (subquery.edit_distance / 2)) / original.length,
                .75
            );
            weight *= penalty;

            if (subquery.length === 1 || phrase.length <= 6) {
                misspelledShortCount.set(subquery.mask, (misspelledShortCount.get(subquery.mask) || 0) + 1);
            }
        } else {
            hasCorrectlySpelled.set(subquery.mask, true);
        }

        // If the query matches an index with geocoder_categories set
        // and the query is one of the listed categories, give this
        // possible result a small bump
        let catMatch  = false;
        if (source.categories) {
            catMatch = source.categories.has(phrase);
        }

        // if it's an address match and the number isn't where we expect it to be,
        // penalize slightly
        if (
            // the index has an opinion
            source.geocoder_expected_number_order &&
            // this match is address-y
            subquery.address &&
            // this match's number is at the beginning or end but not both
            subquery.address.numberOrder &&
            // the match's number isn't where the index expects it to be
            subquery.address.numberOrder !== source.geocoder_expected_number_order
        ) {
            weight *= 0.99;
        }

        // Set prefix to determine how carmen cache will handle autocomplete
        const prefix = subquery.ending_type;
        const phrase_id_range = subquery.phrase_id_range;
        const nearbyOnly = subquery.partial_number || false;

        if (phrase.length === 1) {
            hasSingleCharPhrasematches = true;
        } else {
            hasNonSingleCharPhrasematches = true;
        }

        phrasematches.push(new Phrasematch(subquery, weight, subquery.mask, phrase, phrase_id_range, scorefactor, source.idx, source.non_overlapping_indexes, source._gridstore.reader, source.zoom, source.geocoder_coalesce_radius, prefix, languages, proxMatch, catMatch, subquery.partial_number || false, nearbyOnly, bounds, subquery.address));
    }

    if (source.zoom >= 14 && hasSingleCharPhrasematches && hasNonSingleCharPhrasematches && !anyPartialNumber) {
        phrasematches = phrasematches.filter((pm) => pm.phrase.length > 1);
    }

    if (misspelledShortCount.size) {
        phrasematches = phrasematches.filter((pm) => {
            if (
                (misspelledShortCount.get(pm.mask) || 0) > 6 &&
                hasCorrectlySpelled.get(pm.mask) &&
                (pm.subquery.length === 1 || pm.phrase.length <= 6) &&
                pm.subquery.edit_distance > 0
            ) {
                return false;
            } else {
                return true;
            }
        });
    }

    return callback(null, phrasematches);
};

/**
 * Detect the start and end of a continuous block of `1` bits in a bitmask.
 *
 * @param {number} mask - bit mask to walk
 * @param {number} limit - upper limit of mask
 * @return {Array<number>} length two array; [start, end]
 */
function findMaskBounds(mask, limit) {
    if (mask === 0) return [-1, -1];

    const bounds = new Array(2);
    bounds[1] = limit - 1;

    for (let i = 0; i < limit; i++) {
        if (bounds[0] === undefined) {
            if ((mask & 1 << i) > 0) bounds[0] = i;
        }
        else if ((mask & 1 << i) === 0) {
            bounds[1] = i - 1;
            break;
        }
    }
    return bounds;
}
module.exports.findMaskBounds = findMaskBounds;

/**
 * Build a binary bitmask for a starting point for specified length
 *
 * @param {number} start - window starting point
 * @param {number} len - window length
 * @return {number} bitmask
 */
function buildMask(start, len) {
    let mask = 0;
    for (let i = 0; i < len; i++) {
        mask = mask | (1 << (start + i));
    }
    return mask;
}

/**
 * Builds an array of bitmasks which can be used to identify query permutations
 * that include partial tokens.
 *
 * @param {TokenizedQuery} normalized - tokenized query object
 * @return {Array<number>} list of bitmasks
 */
function requiredMasks(normalized) {
    const ret = [];
    let prev = -1;

    for (let i = 0; i < normalized.owner.length; i++) {
        const curr = normalized.owner[i];
        if (prev === curr) {
            // If the owner of this token is the same as the previous create a
            // mask that can be use to require both.
            const m = buildMask(i - 1, 2);
            if ((m & ret[ret.length - 1]) > 0) {
                // If this mask overlaps with the last item on the list
                // the expanded replacement is more than 2 tokens, So we need
                // to extend the existing mask;
                ret[ret.length - 1] |= m;
            } else {
                ret.push(m);
            }
            continue;
        }
        prev = curr;
    }
    return  ret;
}
module.exports.requiredMasks = requiredMasks;

/**
 * Builds an array of bitmasks which can be used to identify query permutations
 * that should include missing tokens.
 *
 * @param {TokenizedQuery} replaced - pre-normalized query object
 * @return {Array<number>} list of bitmasks
 */
function gapMasks(replaced) {
    const ret = [];
    const len = replaced.tokens.length;

    let gapStart = -1;
    for (let i = 0; i < len; i++) {
        if (replaced.tokens[i].length === 0) {
            // If this is the first missing piece, record the position
            if (gapStart === -1) gapStart = i;
        }
        else if (gapStart !== -1) {
            // We're out of the gap now, build the masks
            if (gapStart > 0) {
                ret.push(buildMask(gapStart - 1, i - gapStart + 1));
            }
            ret.push(buildMask(gapStart, i - gapStart + 1));
            gapStart = -1;
        }
    }
    if (gapStart !== -1) {
        ret.push(buildMask(gapStart - 1, len - gapStart + 1));
    }
    return ret;
}
module.exports.gapMasks = gapMasks;

/**
 * Tests a mask against a list of required windows. If the mask covers any part
 * of a window it must cover the entire window.
 *
 * @param {Array<number>} requiredWindows - bitmasks which a query must cover
 *                                          fully or not at all.
 * @param {number} mask - bitmask
 * @return {boolean} true if mask is acceptable
 */
function demandWindows(requiredWindows, mask) {
    if (requiredWindows.length === 0) return true;
    return !requiredWindows.some((v) => {
        const overlap = mask & v;
        return (overlap !== 0 && overlap !== v);
    });
}

/**
 * If the query covers removed tokens add phrasematches that consume
 * those positions
 *
 * @param {Array<number>} masks - list of bitmasks
 * @param {object} sq - subquery object
 * @return {Array<object>} array of subquery objects
 */
function coverGaps(masks, sq) {
    const ret = [];
    const additions = new Set([sq.mask]);
    for (let i = 0; i < masks.length; i++) {
        if (masks[i] & sq.mask) {
            const m = (masks[i] | sq.mask);
            // Do add if the mask is unchanged, or if some pathological set of
            // changes would create a duplicate.
            if (additions.has(m)) continue;

            const expanded = sq.slice(0);
            expanded.original_phrase = sq.original_phrase.slice(0);
            expanded.edit_distance = sq.edit_distance;
            expanded.ending_type = sq.ending_type;
            expanded.address = sq.address;
            expanded.phrase_id_range = sq.phrase_id_range;
            expanded.mask = m;

            ret.push(expanded);
            additions.add(m);
        }
    }
    return ret;
}

/**
 * Phrasematch Object constructor
 * Attributes used by carmen-cache, all phrasematches from the same source have the same values for idx, cache, zoom
 *
 * @param {Array} subquery an array of tokens, with properties added for metadata because arrays are just objects. TODO: document the properties
 * @param {Number} weight the weight of the match
 * @param {Number} mask bitmask
 * @param {string} phrase matched phrase
 * @param {Number} phrase_id_range range of matched phrases
 * @param {Number} scorefactor the number the score is scaled against
 * @param {Number} idx id of the source index
 * @param {Number} non_overlapping_indexes mask of all indexes that their geocoder_stacks do not intersect with
 * @param {Object} store carmen-cache grid
 * @param {Number} zoom zoom of the source
 * @param {Number} radius proximity radius of the source to use in coalesce
 * @param {Number} prefix the ending type of the match - nonPrefix: 0, anyPrefix: 1, wordBoundaryPrefix: 2
 * @param {Array} languages languages matched
 * @param {boolean} proxMatch whether the proximity point is inside the source bounds, or false if no proximity was specified
 * @param {boolean} catMatch whether the phrase matches any categories specified on the source index
 * @param {boolean} partialNumber whether the phrase is a number-only query
 * @param {boolean} nearbyOnly whether or not to do an extended scan
 * @param {Array} bounds bounding box to limit results to
 * @param {Number} address the address number that matches the query
 */
function Phrasematch(subquery, weight, mask, phrase, phrase_id_range, scorefactor, idx, non_overlapping_indexes, store, zoom, radius, prefix, languages, proxMatch, catMatch, partialNumber, nearbyOnly, bounds, address) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.phrase_id_range = phrase_id_range;
    this.scorefactor = scorefactor;
    this.prefix = prefix;
    this.idx = idx;
    this.non_overlapping_indexes = non_overlapping_indexes;
    this.store = store;
    this.zoom = zoom;
    this.radius = radius;
    this.proxMatch = proxMatch || false;
    this.catMatch = catMatch || false;
    this.partialNumber = partialNumber || false;
    this.nearby_only = nearbyOnly || false;
    this.bounds = bounds;
    this.address = address || null;
    if (languages) {
        // carmen-cache gives special treatment to the "languages" property
        // being absent, so if we don't get one passed in, don't pass it through
        this.languages = languages;
    }

    // format a couple of the items the way carmen-core expects them
    this.match_key = {
        lang_set: this.languages,
        match_phrase: {
            'Range': {
                start: this.phrase_id_range[0],
                end: this.phrase_id_range[1] + 1
            }
        }
    };

    this.id = 0;
}

Phrasematch.prototype.clone = function() {
    const subquery = this.subquery.slice();
    for (const key of Object.keys(this.subquery)) {
        // copy over all the extra keys we hacked onto the array
        if (!subquery.hasOwnProperty(key)) subquery[key] = JSON.parse(JSON.stringify(this.subquery[key]));
    }
    const cloned = new Phrasematch(subquery, this.weight, this.mask, this.phrase, this.phrase_id_range, this.scorefactor, this.idx, this.non_overlapping_indexes, this.store, this.zoom, this.radius, this.prefix, this.languages, this.proxMatch, this.catMatch, this.partialNumber, this.nearby_only, this.bounds, this.address);
    cloned.id = this.id;
    return cloned;
};

module.exports.Phrasematch = Phrasematch;
