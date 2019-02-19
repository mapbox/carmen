'use strict';
const removeDiacritics = require('./remove-diacritics');

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
 * Create a per-token replacer
 *
 * @access public
 * @name createComplexReplacer
 *
 * @param {TokenConfig} tokens - tokens
 * @param {object} inverseOpts - options for inverting token replacements
 * @param {object} inverseOpts.includeUnambiguous - options for
 * @returns {Array<ReplaceRule>} an array of replace rules
 */
module.exports.createComplexReplacer = function(tokens, inverseOpts) {
    // opts
    tokens = JSON.parse(JSON.stringify(tokens));
    if (!Array.isArray(tokens)) {
        tokens = Object.keys(tokens).map((k) => { return { from: k, to: tokens[k] }; });
    }
    inverseOpts = inverseOpts || {};
    inverseOpts.includeUnambiguous = inverseOpts.includeUnambiguous || false;

    const replacers = [];
    const isInverse = {};

    if (inverseOpts.includeUnambiguous) {
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
        if (typeof orig_to == 'object' && orig_to.text !== undefined) {
            replacementOpts = orig_to;
            orig_to = orig_to.text;
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
                    from = stripped;
                }
            }

            const entry = {};
            if (replacementOpts.skipBoundaries) {
                entry.from = new RegExp(from, 'giu');
            } else {
                entry.from = new RegExp(from + '$', 'yiu');

                if (replacementOpts.spanBoundaries !== undefined) {
                    entry.spanBoundaries = replacementOpts.spanBoundaries;
                } else {
                    entry.spanBoundaries = from.split(/\s/).length - 1;
                }
            }
            entry.fromLastWord = false;
            entry.to = orig_to;
            entry.inverse = inverse;
            entry._from = from;
            replacers.push(entry);
        }
    }
    return replacers;
};

/**
 * Create a per-token replacer that's really dumb -- all it can do is swap
 * whole words for whole other words, in one direction
 *
 * @access public
 * @name createSimpleReplacer
 *
 * @param {object} tokens - tokens
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
 * @param {Array} replacements - an array of token replacement regex rules
 * @param {Object} query - a tokenized query
 * @returns {Object} - tokenized query object whe replaced tokens and boolean
 *                     indicating if the last word in the query was replaced.
 */
module.exports.replaceToken = function(replacements, query) {
    const l = query.tokens.length;
    for (let i = 0; i < l; i++) {
        for (const replacement of replacements) {
            let cnt = 1;
            if (replacement.spanBoundaries !== undefined) cnt += replacement.spanBoundaries;

            // If the replacement it longer than 1 token and we have enough
            // tokens to satify it attempt a replacement.
            if (cnt > 1 && i + cnt <= l) {
                let part = '';
                for (let j = i; j < i + cnt; j++) {
                    part += `${query.tokens[j]}${query.separators[j]}`;
                }

                const replaced = part.trim().replace(replacement.from, replacement.to); // TODO not sure about this trim
                if (replacement.from.lastIndex > 0) {
                    replacement.from.lastIndex = 0;
                    query.tokens[i] = replaced;
                    for (let j = i + 1; j < i + cnt; j++) {
                        query.tokens[j] = '';
                        query.owner[j] = i;
                    }
                    if (i + cnt === l) query.lastWord = true;
                }
            } else {
                const replaced = query.tokens[i].replace(replacement.from, replacement.to);
                if (replacement.from.lastIndex > 0) {
                    replacement.from.lastIndex = 0;
                    query.tokens[i] = replaced;
                    if (i + 1 === l) query.lastWord = true;
                } else if (replacement.from.global && replaced !== query.tokens[i]) {
                    query.tokens[i] = replaced;
                }
            }
        }
    }
    return query;
};

/**
 * TODO
 * @param {Array} replacers
 * @param {string} text
 * @return {Array<string>}
 */
module.exports.enumerateTokenReplacements = function(replacers, text) {
    if (text.tokens.length === 0) return [];

    const outLimit = 64;
    const depthLimit = outLimit / text.tokens.length;

    const terms = [];
    for (let i = 0; i < text.tokens.length; i++) {
        terms[i] = [{
            t: text.tokens[i],
            l: 1
        }];
    }
    const replace = (replacers, text, offset) => {
        if (replacers.length === 0) return;
        for (let k = 0; k < replacers.length; k++) {
            let cnt = 1;
            if (replacers[k].spanBoundaries !== undefined) cnt += replacers[k].spanBoundaries;

            // we add replacements before the string we replaced into for most replacements
            // because it's "more canonical" I guess? unless the replacer is inverse
            // in which case we add it after since the text we have is the canonical text
            const insertMethod = replacers[k].inverse ? 'push' : 'unshift';

            for (let i = 0; i < text.tokens.length; i++) {
                const segment = {
                    tokens: text.tokens.slice(i, i + cnt),
                    separators: text.separators.slice(i, i + cnt),
                    owner: new Array(cnt).fill(0).map((v, i) => i)
                };
                const altered = module.exports.replaceToken([replacers[k]], segment);
                if (altered.tokens[0] !==  text.tokens[i]) {
                    terms[i + offset][insertMethod]({
                        t: altered.tokens[0], // TODO join "cnt" tokens?
                        l: cnt
                    });

                    // Recurse, but prevent more that 64 variants to accrue across the query.
                    if (terms[i + offset].length < depthLimit) {
                        // ...but don't allow previosly applied or an inverse of the last replacement
                        replace(replacers.slice(k + 1).filter((v) => replacers[k].to !== v._from), altered, i);
                    }

                }
            }
        }
    };
    replace(replacers, text, 0);

    const out = [];
    const assemble = (a, i, o) => {
        const len = a[i].length;
        for (let j = 0; j < len; j++) {
            if (out.length >= outLimit) break;
            const t = a[i][j].t;
            const offset = a[i][j].l;
            const s = o ? `${o} ${t}` : t;
            if (i + offset < a.length) {
                assemble(a, i + offset, s);
            } else {
                out.push(s);
            }
        }
    };
    assemble(terms, 0, false);

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
 * @param ..
 * @param ..
 * @return ..
 */
module.exports.replaceGlobalTokens = function(replacers, text) {
    for (const replacer of replacers) {
        text = text.trim().replace(replacer.from, replacer.to);
    }
    return text;
};

/**
 * Validates token replacer. Ensures that none of the values in from or to include blank space.
 *
 * @access private
 *
 * @param {Object} token_replacer - a token replacer
 * @returns {(null|true)} true if any 'from' or 'to' values contains blank space
 */
module.exports.tokenValidator = function(token_replacer) {
    return false;
    // for (let i = 0; i < token_replacer.length; i++) {
    //     if (token_replacer[i].from.toString().indexOf(' ') >= 0 || (typeof token_replacer[i].to != 'function' && token_replacer[i].to.toString().indexOf(' ') >= 0)) {
    //         return true;
    //     }
    // }
};

/**
*
* Categorizes word replacements into simple and complex
* Simple and complec word replacements are used during index time
* Only complex word replacements are used during query time
*
* @access private
*
* @param {Object} geocoder_tokens - word mapping object, eg: Street => St
* @returns {Array} wordReplacement - An array of word replacements categorised as simple or complex (simple: false)
*/
module.exports.categorizeTokenReplacements = function(geocoder_tokens) {
    // make some regexes
    const innerWordBoundary = /[^-.\s][-.\s][^-.\s]/iu;
    const wordReplacements = {
        'simple': [],
        'complex': []
    };
    if (geocoder_tokens !== undefined) {
        geocoder_tokens = JSON.parse(JSON.stringify(geocoder_tokens));

        // filters out words that are replaced by functions and objects
        for (const _from in geocoder_tokens) {
            const orig_from = _from;
            const orig_to = geocoder_tokens[_from];

            let replacementOpts = {};
            let to = orig_to;
            if (typeof orig_to == 'object' && orig_to.text) {
                replacementOpts = orig_to;
                to = orig_to.text;
            }

            const complex = (
                replacementOpts.spanBoundaries ||
                replacementOpts.skipBoundaries ||
                replacementOpts.skipDiacriticStripping ||
                (typeof orig_to == 'string' && (
                    /\$(\d+|{\w+})/.test(to) ||
                    innerWordBoundary.test(_from) ||
                    innerWordBoundary.test(to)
                ))
            ) || false;


            if (complex) {
                wordReplacements.complex.push({ 'from': orig_from, 'to': orig_to });
            } else {
                // we want our simple ones to actually be simple:
                // - lowercase
                // - no diacritics
                const simple_from = removeDiacritics(orig_from.toLowerCase());
                const simple_to = removeDiacritics(orig_to.toLowerCase());
                wordReplacements.simple.push({ 'from': simple_from, 'to': simple_to });
            }
        }
    }
    return wordReplacements;
};
