'use strict';
const removeDiacritics = require('./remove-diacritics');

// Regexp pattern to determine word boundaries when making token replacements
// detects punctuation including and whitespace
const WORD_BOUNDARY = [
    '[',

    // Equivalient to \u0020\f\n\r\t\v\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF
    '\\s',

    // \u2000 - \u206F "General Punctuation"
    '\u2000-\u206F',

    // \u2E00 - \u2E7F "Supplemental Punctuation"
    '\u2E00-\u2E7F',

    // The usual suspects from \u0020 - \u007F "Basic Latin"
    // !"#$%&'()*+,-./
    '\u0021-\u002F',
    // :;<=>?@
    '\u003A-\u0040',
    // [\]^_`
    '\u005B-\u0060',
    // {|}~
    '\u007B-\u007E',

    ']'
].join('');
module.exports.WORD_BOUNDARY = WORD_BOUNDARY;

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
        if (typeof orig_to == 'object' && orig_to.text) {
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
            entry.from = new RegExp(
                (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|^)') +
                from.replace('.', '\\.') +
                (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|$)'),
                'gi');
            entry.fromLastWord = false;
            // count groups in original regex, using the trick from https://stackoverflow.com/a/16046903
            const count = new RegExp(from + '|').exec('').length - 1;

            // increment replacements indexes in `to`
            if (typeof orig_to == 'string' && !replacementOpts.skipBoundaries) {
                const new_to = orig_to.replace(/\$(\d+)/g, (str, index) => {
                    return '$' + (parseInt(index, 10) + 1).toString();
                });

                entry.to = '$1' + new_to + '$' + (count + 2).toString(); // normalize abbrev
            } else {
                entry.to = orig_to; // normalize abbrev
            }

            entry.inverse = inverse;
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
 * @param {Array} tokens - an array of token replacement regex rules
 * @param {String} query - a query string
 * @returns {Object} - replacement object containing a query property, the
 * token-replaced query and boolean indicating
 * whether the last word in the query was replaced or not
 */
module.exports.replaceToken = function(tokens, query) {
    let abbr = query;
    let lastWord = false;
    for (const token of tokens) {
        abbr = abbr.trim();
        if (!lastWord && token.fromLastWord && abbr.match(token.fromLastWord))
            lastWord = true;

        abbr = abbr.replace(token.from, token.to);
    }
    return { query: abbr, lastWord: lastWord };
};

/**
 * TODO
 * @param {Array} tokens
 * @param {String} text
 * @return {Array<string>}
 */
module.exports.enumerateTokenReplacements = function(replacers, text) {
    // maintain two lists of the output, one ordered (because the order matters)
    // and one set, so we can easily test to see if the new string is one we've
    // seen before

    const out = [text.trim()];
    const outSet = new Set([text.trim().toLowerCase()]);

    for (const token of replacers) {
        for (let i = 0; i < out.length; i++) {
            // escape hatch on the check to make sure we don't run away with infinite recursion
            if (i > 64) break;

            // we want to enumerate each possible replacement of each token,
            const occurrenceCount = (out[i].match(token.from) || []).length;

            // we add replacements before the string we replaced into for most replacements
            // because it's "more canonical" I guess? unless the token is inverse
            // in which case we add it after since the text we have is the canonical text
            let insertPos = token.inverse ? i + 1 : i;
            let replaced;

            // Optimized code path if there's only one occurrence of `from`
            // Does not need to support positional replacement
            if (occurrenceCount === 1) {
                replaced = out[i].replace(token.from, token.to);
                if (replaced !== out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                }
                continue;
            }

            // More expensive code path for supporting positional replacement
            for (let j = 0; j < occurrenceCount; j++) {
                let occurrence = 0;

                replaced = out[i].replace(token.from, function(match) {
                    let out;
                    if (occurrence === j) {
                        const args = Array.from(arguments);
                        out = typeof token.to == 'function' ?
                            token.to.apply(this, args) :
                            // this replaces the '$n' params with the parenthesized matches
                            token.to.replace(/\$(\d)/g, (match, p1) => {
                                const group = parseInt(p1);
                                return group < (args.length - 2) ? args[parseInt(p1)] : '';
                            });
                    } else {
                        out = match;
                    }
                    occurrence++;
                    return out;
                });

                if (replaced !== out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                    insertPos++;
                }
            }
        }
    }

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
            from: new RegExp(from, 'gi'),
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
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
    for (let i = 0; i < token_replacer.length; i++) {
        if (token_replacer[i].from.toString().indexOf(' ') >= 0 || (typeof token_replacer[i].to != 'function' && token_replacer[i].to.toString().indexOf(' ') >= 0)) {
            return true;
        }
    }
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
    const nonWordBoundary = '[^' + WORD_BOUNDARY.substr(1);
    const innerWordBoundary = new RegExp(nonWordBoundary + '+' + WORD_BOUNDARY + '+' + nonWordBoundary + '+');
    const outerWordBoundary = new RegExp('(^' + WORD_BOUNDARY + '|' + WORD_BOUNDARY + '$)', 'g');
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
                // - no leading/trailing word boundaries (like periods)
                const simple_from = removeDiacritics(
                    orig_from
                        .replace(outerWordBoundary, '')
                        .toLowerCase()
                );
                const simple_to = removeDiacritics(
                    orig_to
                        .replace(outerWordBoundary, '')
                        .toLowerCase()
                );
                wordReplacements.simple.push({ 'from': simple_from, 'to': simple_to });
            }
        }
    }
    return wordReplacements;
};
