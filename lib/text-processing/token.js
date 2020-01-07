'use strict';
const removeDiacritics = require('./remove-diacritics');
const escapeRegExp = require('./closest-lang').escapeRegExp;

/**
 * An individual pattern-based replacement configuration.
 *
 * @access public
 *
 * @typedef {Object} ReplaceRule
 * @property {RegExp} from - pattern to match in a string
 * @property {RegExp|false} fromLastWord - if from is a simple token replacement,
 * pattern to detect if the last word has been simple token replaced. False for complex
 * token replacements.
 * @property {string} to - replacement string (possibly including group references)
 * @property {boolean} inverse - include the opposite tokenization
 */

/**
 * @access public
 *
 * @typedef {Object} TokenizedQuery
 * @property {Array<string>} tokens
 * @property {Array<string>} separators
 * @property {Array<number>} owner
 * @property {boolean} lastWord - whether the last token was replaced
 */

/**
 * Create a per-token replacer
 *
 * @access public
 * @name createComplexReplacer
 *
 * @param {TokenizedQuery} tokens - tokenized text
 * @param {object} options - options for token replacements
 * @param {object} options.includeUnambiguous - option for whether or not to include token replacements that are unambiguous
 * @param {object} options.includeRelevanceReductions - option for whether or not to include token replacements that reduce relevance
 * @returns {Array<ReplaceRule>} an array of replace rules
 */
module.exports.createComplexReplacer = function(tokens, options) {
    tokens = JSON.parse(JSON.stringify(tokens));
    if (!Array.isArray(tokens)) {
        tokens = Object.keys(tokens).map((k) => { return { from: k, to: tokens[k] }; });
    }
    options = options || {};
    options.includeUnambiguous = options.includeUnambiguous || false;

    const replacers = [];
    const isInverse = {};

    if (options.includeUnambiguous) {
        // go through the keys and if check if their values are unique; if so,
        // include them backwards as well
        const tos = {};
        const froms = new Set(tokens.map((t) => t.from));
        for (const tokenPair of tokens) {
            let to, from;
            if (typeof tokenPair.to == 'object') {
                to = tokenPair.to.text;
                from = JSON.parse(JSON.stringify(tokenPair.to));
                from.text = tokenPair.from;
            } else {
                from = tokenPair.from;
                to = tokenPair.to;
            }
            if (tos[to]) {
                tos[to].push(from);
            } else {
                tos[to] = [from];
            }
        }
        for (const to in tos) {
            if (tos[to].length === 1 && !froms.has(to) && ! to.match(/[\(\)\$]/)) {
                const clone = JSON.parse(JSON.stringify(tos[to][0]));
                tokens.push({ from: to, to: clone });
                isInverse[to] = true;
            }
        }
    }
    for (const tokenPair of tokens) {
        let from = tokenPair.from; // normalize expanded
        let orig_to = tokenPair.to;

        let replacementOpts = {};
        if (typeof orig_to == 'object') {
            if (orig_to.text === undefined) continue;
            if (tokenPair.to.reduceRelevance && !options.includeRelevanceReduction) continue;
            replacementOpts = orig_to;
            orig_to = orig_to.text.toLowerCase();
        } else {
            orig_to = orig_to.toLowerCase();
        }

        // If the replacement is not a regular expression we strip characters
        // that we know won't be present in the tokens.
        if (!replacementOpts.regex) {
            from = from.replace(/[\u2018\u2019\u02BC\u02BB\uFF07'\.\^]/g, '');
        }

        const inverse = !!isInverse[from];

        for (let u = 0; u < 2; u++) {
            // first add to the token replacer without stripping diacritics, then,
            // if stripping them changes the string, add it again
            if (u) {
                const stripped = removeDiacritics(from);
                if (from === stripped || replacementOpts.skipDiacriticStripping) {
                    continue;
                } else {
                    from = stripped.toLowerCase();
                }
            }

            const entry = {};
            if (replacementOpts.skipBoundaries) {
                entry.from = new RegExp(replacementOpts.regex ? from : escapeRegExp(from), 'giu');
            } else {
                entry.from = new RegExp((replacementOpts.regex ? from : escapeRegExp(from)) + '$', 'yiu');

                if (replacementOpts.spanBoundaries !== undefined) {
                    entry.spanBoundaries = replacementOpts.spanBoundaries;
                } else {
                    entry.spanBoundaries = from.split(/\s/).length - 1;
                }
            }
            if (tokenPair.to.reduceRelevance && options.includeRelevanceReduction) entry.reduceRelevance = true;
            entry.fromLastWord = false;
            entry.to = orig_to;
            entry.inverse = inverse;
            entry._from = from;
            replacers.push(entry);
        }
    }

    // When enumerating replaced string we want replacement to happen is a
    // predictable order; with large transformations happening before smaller
    // ones.
    replacers.sort((a, b) => {
        if (a.from.global && !b.from.global) return 1;
        if (!a.from.global && b.from.global) return -1;
        return a.to.length - b.to.length;
    });

    return replacers;
};

/**
 * Create a per-token replacer that's really dumb -- all it can do is swap
 * whole words for whole other words, in one direction
 *
 * @access public
 * @name createSimpleReplacer
 *
 * @param {object|Array<object>} tokens - object of  "from": "to" conversions or
 *     array of `{"from": <string>: "to":<string>}` objects.
 * @returns {Array<ReplaceRule>} an array of replace rules
 */
module.exports.createSimpleReplacer = function(tokens) {
    const replacements = new Map();
    if (Array.isArray(tokens)) {
        for (const t of tokens) {
            replacements.set(t.from.toLowerCase(), t.to.toLowerCase());
        }
    } else {
        Object.keys(tokens).forEach((k) => {
            replacements.set(k.toLowerCase(), tokens[k].toLowerCase());
        });
    }

    return {
        tokens: replacements,
        replacer: (v) => v.map((word) => replacements.get(word) || word)
    };
};

/**
 * Replace tokens in a given string
 *
 * @param {Array<ReplaceRule>} replacements - replacement rules
 * @param {TokenizedQuery} query - tokenized text
 * @returns {Object} - tokenized query object whe replaced tokens and boolean
 *                     indicating if the last word in the query was replaced.
 */
module.exports.replaceToken = function(replacements, query) {
    const ret = {
        tokens: query.tokens.slice(0),
        separators: query.separators.slice(0),
        owner: query.owner.slice(0),
        lastWord: query.lastWord
    };

    const l = ret.tokens.length;
    for (let i = 0; i < l; i++) {
        for (const replacement of replacements) {
            let cnt = 1;
            if (replacement.spanBoundaries !== undefined) cnt += replacement.spanBoundaries;

            // If the replacement is longer than 1 token and we have enough
            // tokens to satify it then attempt a replacement.
            if (cnt > 1 && i + cnt <= l) {
                // Limit loop to one less than actual length to avoid grabbing trailing separator.
                const lim = i + cnt - 1;
                let part = '';
                for (let j = i; j < lim; j++) {
                    part += `${ret.tokens[j]}${ret.separators[j]}`;
                }
                part += ret.tokens[lim];

                const replaced = part.replace(replacement.from, replacement.to);
                if (replacement.from.lastIndex > 0) {
                    replacement.from.lastIndex = 0;
                    ret.tokens[i] = replaced;
                    for (let j = i + 1; j < i + cnt; j++) {
                        ret.tokens[j] = '';
                        ret.owner[j] = i;
                    }
                    if (i + cnt === l) ret.lastWord = true;
                }
            } else {
                const replaced = ret.tokens[i].replace(replacement.from, replacement.to);
                if (replacement.from.lastIndex > 0) {
                    replacement.from.lastIndex = 0;
                    ret.tokens[i] = replaced;
                    if (i + 1 === l) ret.lastWord = true;
                } else if (replacement.from.global && replaced !== ret.tokens[i]) {
                    ret.tokens[i] = replaced;
                }
            }
        }
    }
    return ret;
};

/**
 * Produce a list of possible ways replacement can be applied to tokenized text.
 *
 * This method limits the combinatorial space substantially if more than 3
 * tokens are replaceable in an input of 3 or more tokens. Specifically it
 * limits the number of times a replacement will be tolerated on a single token
 * and has a hard cap on output array.
 *
 * @param {Array<ReplaceRule>} replacers - replacement rules
 * @param {Array<TokenizedQuery>} text - tokenized text
 * @return {Array<string>} List of possible replacement permutations
 */
module.exports.enumerateTokenReplacements = function(replacers, text) {
    if (text.tokens.length === 0) return [];

    const outLimit = 8;
    const depthLimit = 8;

    const terms = [];
    for (let i = 0; i < text.tokens.length; i++) {
        terms[i] = [{
            t: text.tokens[i],
            l: 1,
            d: 0,
            reduceRelevance: false
        }];
    }
    // Iterate thourgh replacers and attempt to apply them to each token. If a
    // replacement changes a token, add it to the `terms` list, which contains
    // alternate versions of that token. Then recurse and allow unapplied
    // replacements to generate additional versions.
    const replace = (replacers, text, offset) => {
        if (replacers.length === 0) return;
        for (let k = 0; k < replacers.length; k++) {
            let cnt = 1;
            if (replacers[k].spanBoundaries !== undefined) cnt += replacers[k].spanBoundaries;


            for (let i = 0; i < text.tokens.length; i++) {
                const segment = {
                    tokens: text.tokens.slice(i, i + cnt),
                    separators: text.separators.slice(i, i + cnt),
                    owner: new Array(cnt).fill(0).map((v, i) => i)
                };
                const altered = module.exports.replaceToken([replacers[k]], segment);
                // If a complex replacement consumes or produces what would be
                // more than one token that text is written, untokenized, into
                // the first spot in the tokens array. So it's safe to use the
                // index-0 element for comparison and addition to the terms list.
                if (altered.tokens[0] !== text.tokens[i]) {
                    if (replacers[k].reduceRelevance) altered.reduceRelevance = true;
                    // If the replacer is inverse get a low output position
                    if (replacers[k].inverse) {
                        altered.changes = text.changes === undefined ? -1 : text.changes - 1;
                    } else {
                        altered.changes = text.changes === undefined ? 1 : text.changes + 1;
                    }
                    terms[i + offset].push({
                        t: altered.tokens[0],
                        l: cnt,
                        d: altered.changes,
                        reduceRelevance: altered.reduceRelevance
                    });

                    // Recurse, but prevent more that depthLimit variants
                    if (terms[i + offset].length < depthLimit) {
                        // ...and don't allow anything previously applied or an
                        // inverse of the last replacement
                        replace(replacers.slice(k + 1).filter((v) => replacers[k].to !== v._from), altered, i);
                    }

                }
            }
        }
    };
    replace(replacers, text, 0);

    // Sort the replaced terms so that ones that have see the most replacements
    // are first as they are considered more canonical.
    for (let i = 0; i < terms.length; i++) terms[i].sort((a, b) => {
        if (b.d === a.d) {
            // As a fallback sort by text length, shorter string first.
            return a.t.length - b.t.length;
        } else {
            return b.d - a.d;
        }
    });

    // Iterate through the versions of each input token and assemble possible
    // combinations of the subsequent tokens.
    const out = [];
    const assemble = (termsArray, i, o, reduceRelevance) => {
        const len = termsArray[i].length;
        for (let j = 0; j < len; j++) {
            if (out.length >= outLimit) break;
            const ordinal = termsArray[i][j].reduceRelevance;
            const r = ordinal ? reduceRelevance || true : reduceRelevance;
            const t = termsArray[i][j].t;
            const offset = termsArray[i][j].l;
            const s = o ? `${o} ${t}` : t;
            if (i + offset < termsArray.length) {
                assemble(termsArray, i + offset, s, r);
            } else {
                out.push({
                    phrase: s,
                    reduceRelevance: r
                });
            }
        }
    };
    assemble(terms, 0, false, false);
    return out;
};


/**
 * A mapping from patterns (keys) to replacements (values).
 *
 *   - The patterns are used in {@link createGlobalReplacer} to create `RegExp`s (case-insensitive)
 *   - Patterns can match anywhere in a string, regardless of whether the match is a full word, multiple words, or part of a word.
 *   - Matching substrings are replaced with the associated replacement
 *
 * This map is used on input strings at both query and index time.
 *
 * **Example use case: Abbreviating multiple words:**
 *
 * There are a lot of different ways to write "post office box" in US Addresses. You can normalize them with a pattern replace entry:
 *
 * ```javascript
 * patternReplaceMap = {
 *     "\\bP\\.?\\ ?O\\.? Box ([0-9]+)\\b": " pob-$1 "
 * }
 *
 * // "P.O. Box 985" -> "pob-985"
 * // "PO Box 985"   -> "pob-985"
 * // "p.o. box 985" -> "pob-985"
 * ```
 *
 * @typedef {Object<string, string>} PatternReplaceMap
 * @access public
 */

/**
 * Create an array of {@link ReplaceRule}s from a {@link PatternReplaceMap}.
 *
 * @access public
 * @name createGlobalReplacer
 *
 * @param {PatternReplaceMap} tokens - a pattern-based string replacement specification
 * @returns {Array<ReplaceRule>} an array of rules for replacing substrings
 */
module.exports.createGlobalReplacer = function(tokens) {
    const replacers = [];

    for (const token in tokens) {
        const from = token;
        const to = tokens[token];

        const entry = {
            from: new RegExp(from, 'giu'),
            _from: from,
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
};

/**
 * Perform global replacements
 *
 * @param {Array<replaceRule>} replacers - replacement rules
 * @param {string} text - string to modified with replacemnets
 * @return {string} modified text
 */
module.exports.replaceGlobalTokens = function(replacers, text) {
    for (const replacer of replacers) {
        text = text.trim().replace(replacer.from, replacer.to);
    }
    return text;
};

/**
 * we want our simple ones to actually be simple: lowercase, no diacritics,
 * no apostrophies, caret or period
 * @param {string} s - string to clean
 * @return {string} simplified string
 */
function simplify(s) {
    return removeDiacritics(s.toLowerCase().replace(/[\u2018\u2019\u02BC\u02BB\uFF07'\.\^]/g, ''));
}

/**
*
* Categorizes word replacements into simple and complex
* Simple and complex word replacements are used during index time
* Only complex word replacements are used during query time
*
* @access private
*
* @param {Object} geocoder_tokens - word mapping object, eg: Street => St
* @returns {Object}  object with two keys; "simple" & "complex" that each
*        contain a list of word replacements.
*/
module.exports.categorizeTokenReplacements = function(geocoder_tokens) {
    const wordReplacements = { 'simple': [], 'complex': [] };

    if (geocoder_tokens === undefined) return wordReplacements;

    geocoder_tokens = JSON.parse(JSON.stringify(geocoder_tokens));

    const innerWordBoundary = /[^-\s][-\s][^-\s]/iu;

    // filters out words that are replaced by functions and objects
    for (const _from in geocoder_tokens) {
        const orig_from = _from;
        const orig_to = geocoder_tokens[_from];

        let replacementOpts = {};
        let to = orig_to;
        if (typeof orig_to == 'object' && typeof orig_to.text == 'string') {
            replacementOpts = orig_to;
            to = orig_to.text;
        }

        const complex = (
            replacementOpts.spanBoundaries ||
            replacementOpts.skipBoundaries ||
            replacementOpts.skipDiacriticStripping ||
            replacementOpts.regex ||
            (typeof orig_to == 'string' && (
                /\$(\d+|{\w+})/.test(to) ||
                innerWordBoundary.test(_from) ||
                innerWordBoundary.test(to)
            ))
        ) || false;


        if (complex) {
            wordReplacements.complex.push({ 'from': orig_from, 'to': orig_to });
        } else {
            const simple_to = simplify(orig_to);
            const simple_from = simplify(orig_from);
            if (simple_to !== simple_from) {
                wordReplacements.simple.push({
                    'from': simple_from,
                    'to': simple_to
                });
            }
        }
    }
    return wordReplacements;
};
