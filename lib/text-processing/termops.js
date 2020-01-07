'use strict';
const mp24 = Math.pow(2,24);
const removeDiacritics = require('./remove-diacritics');
const idPattern = /^(\S+)\.([0-9]+)$/;
const token = require('./token');
const permute = require('../util/permute');
const cl = require('./closest-lang');
const murmurHash = require('murmurhash-native').murmurHash;
const MAX_QUERY_TOKENS = require('../constants').MAX_QUERY_TOKENS;

module.exports.id = id;
module.exports.address = address;
module.exports.asReverse = asReverse;
module.exports.decode3BitLogScale = decode3BitLogScale;
module.exports.encode3BitLogScale = encode3BitLogScale;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getHousenumRangeV3 = getHousenumRangeV3;
module.exports.getIndexableText = getIndexableText;
module.exports.getIndexablePhrases = getIndexablePhrases;
module.exports.getIntersectionText = getIntersectionText;
module.exports.getMinimalIndexableText = getMinimalIndexableText;
module.exports.getWeights = getWeights;
module.exports.normalizeQuery = normalizeQuery;
module.exports.numTokenize = numTokenize;
module.exports.numTokenizePrefix = numTokenizePrefix;
module.exports.numTokenV3 = numTokenV3;
module.exports.tokenize = tokenize;
module.exports.feature = feature;
module.exports.permutations = permutations;
module.exports.addressPermutations = addressPermutations;
module.exports.intersectionPermutations = intersectionPermutations;
module.exports.phraseHash = phraseHash;

/**
 * id - Checks if the query is requesting a specific feature by its id
 *      province.### address.### etc.
 *
 * @param {Array} indexes Array of indexes & their specific configs
 * @param {String} query User's geocode query
 * @return {Object|false} Return false or an object containing the index name and id of the feature
 */
function id(indexes, query) {
    const matches = query.match(idPattern);

    if (!matches) return false;

    const dbname = matches[1];
    const id = matches[2];

    if (!indexes[dbname]) return false;

    return { dbname:dbname, id:id };
}

/**
 * Removes Emjoji from a string.
 * from http://stackoverflow.com/a/40825394
 * @param {string} str - input text to be stripped
 * @return {string} text without emoji
 */
function removeEmoji(str) {
    return str.replace(/([#0-9]\u20E3)|[\xA9\xAE\u203C\u2047-\u2049\u2122\u2139\u3030\u303D\u3297\u3299][\uFE00-\uFEFF]?|[\u2190-\u21FF][\uFE00-\uFEFF]?|[\u2300-\u23FF][\uFE00-\uFEFF]?|[\u2460-\u24FF][\uFE00-\uFEFF]?|[\u25A0-\u25FF][\uFE00-\uFEFF]?|[\u2600-\u27BF][\uFE00-\uFEFF]?|[\u2900-\u297F][\uFE00-\uFEFF]?|[\u2B00-\u2BF0][\uFE00-\uFEFF]?|(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDEFF])[\uFE00-\uFEFF]?/g, '');
}

/**
 * Cleans and removes diacritics from a tokenized query. Preserves ownership
 * record while removing empty tokens and splitting any tokens containing spaces.
 *
 * @param {Array<TokenizedQuery>} query - Tokenized array of user's input query
 * @return {Array<TokenizedQuery>} normalized clone of input query
 */
function normalizeQuery(query) {
    if (typeof query === 'string') throw (new Error('Bad argument type "string" for normalizeQuery'));

    const normalized = { tokens:[], owner:[], separators: [], lastWord: query.lastWord };
    for (let i = 0; i < query.tokens.length; i++) {
        // Replacement that removed a token will leave an empty spot, remove it.
        if (query.tokens[i].length === 0) continue;

        if (normalized.tokens.length === MAX_QUERY_TOKENS) break;

        // Replacment may split a token into two words, we need to expand that
        // for fuzzyMatch.
        if (query.tokens[i].includes(' ')) {
            const words = query.tokens[i].split(' ');
            if (normalized.tokens.length + words.length <= MAX_QUERY_TOKENS) {
                for (let j = 0; j < words.length; j++) {
                    normalized.tokens.push(normalizeText(words[j]));
                    normalized.owner.push(query.owner[i]);
                    normalized.separators.push(' ');
                }
                continue;
            }
        }

        // CJK works differently and it handled in a way that iscompatible with
        // latin/cyrillic/etc... replacements.
        const words = query.tokens[i].split(/([\u4E00-\u9FFF])/u); // \u4E00 - \u9FFF "CJK Unified Ideographs"
        if (words.length > 1 && (normalized.tokens.length + words.length <= MAX_QUERY_TOKENS)) {
            for (let j = 0; j < words.length; j++) {
                if (words[j].length > 0) {
                    normalized.tokens.push(normalizeText(words[j]));
                    normalized.owner.push(query.owner[i]);
                    normalized.separators.push('');
                }
            }
            continue;
        }

        normalized.tokens.push(normalizeText(query.tokens[i]));
        normalized.separators.push(query.separators[i]);
        normalized.owner.push(query.owner[i]);
    }
    return normalized;
}

/**
 * Remove emoji, diacritics, extra spaces
 *
 * @param {string} s - input text to be stripped.
 * @return {string} text withough emoji, diacritics, duplicat spaces.
 */
function normalizeText(s) {
    return removeEmoji(removeDiacritics(s)).trim().replace(/\s+/g, ' '); // TODO can we simplify this whitespace cleanup?
}

/**
 * Generate a hash id from a feature ID. Fits within a 24-bit integer space.
 *
 * @param {string} id - string version of numeric id
 * @return {number} id as 20 bit number
 */
function feature(id) {
    return Math.abs(parseInt(id,10)) % mp24;
}

/**
 * Determine if input query appears to be a reverse geocode and parse the input
 * string into lon/lat
 *
 * @param {string} query - text that will be evaluated as a reverse query.
 * @return{false|Array<number>} false if the query can't be parsed as a location,
 *     parsed location otherwise.
 */
function asReverse(query) {
    const numeric = query.split(',', 3);
    if (numeric.length === 2) {
        numeric[0] = Number(numeric[0].trim());
        numeric[1] = Number(numeric[1].trim());
        if (!isNaN(numeric[0]) && !isNaN(numeric[1])) {
            return numeric;
        }
    }
    return false;
}

// Split queries based on other ascii and unicode punctuation.
const WORD_SEPARATOR = [
    // Equivalient to \u0020\f\n\r\t\v\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF
    '\\s',

    // \u2000 - \u206F "General Punctuation"
    '\u2000-\u206F',

    // \u2E00 - \u2E7F "Supplemental Punctuation"
    '\u2E00-\u2E7F',

    // The usual suspects from \u0020 - \u007F "Basic Latin"
    // !"#$%&'()*+-./,
    '\u0021-\u002F',
    // :;<=>?@
    '\u003A-\u0040',
    // [\]^_`
    '\u005B-\u0060',
    // {|}~
    '\u007B-\u007E',

    // Similar symbols from \uFF00 - \uFFEF "Halfwidth and Fullwidth Forms"
    '\uFF01-\uFF0F',
    '\uFF1A-\uFF20',
    '\uFF3B-\uFF40',
    '\uFF5B-\uFF65'

].join('');
module.exports.WORD_SEPARATOR = WORD_SEPARATOR;

/**
 * tokenize - Normalize input text into lowercase, asciified tokens.
 *
 * @param  {String} query  A string to tokenize
 * @param  {Boolean} lonlat Whether to attempt lon,lat parse
 * @return {TokenizedQuery} A tokenized query
 */
function tokenize(query, lonlat) {
    if (lonlat) throw new Error('Unsupported usage of tokenize. Use asReverse instead');

    const tokens = [];
    const separators = [];

    const normalized = query
        .toLowerCase()
        // collapse apostraphes, periods, caret
        .replace(/[\u2018\u2019\u02BC\u02BB\uFF07'\.\^]/g, '')
        // If the query begins with a separators, tear it off.
        .replace(new RegExp(`^[${WORD_SEPARATOR}]+`, 'u'), '');

    const split = new RegExp(`([^${WORD_SEPARATOR}]+)([${WORD_SEPARATOR}]+|$)`, 'yu');
    let part;
    let tail;
    // eslint-disable-next-line no-cond-assign
    while (part = split.exec(normalized)) {
        let t = part[1].toString();
        const s = part[2].toString();

        if (tail) {
            if (tail.s === '-' || tail.s === '/') {
                const combined = `${tail.t}${tail.s}${t}`;
                // Allow numbers like 1-2, 1/2, 1a, 1-2a, 1/2a, 1/2-3b
                if  (/^(\d+)(-|\/)(\d+)((-|\/)(\d+))?[a-z]?$/.test(combined)) {
                    t = combined;
                } else {
                    tokens.push(tail.t);
                    separators.push(tail.s);
                }
            } else {
                tokens.push(tail.t);
                separators.push(tail.s);
            }
        }
        tail = false;

        if (t.length === 0) continue;
        if (removeEmoji(t).length === 0) continue;

        // \u4E00 - \u9FFF "CJK Unified Ideographs" characters are indexed
        // individually to support addresses being written from largest to
        // smallest geographical entity without delimiters. Adjacent numbers,
        // normal and full-width, are not split.
        const subtoken = t.split(/([\u4E00-\u9FFF])/u);
        if (subtoken.length > 1) {
            for (let l = 0; l < subtoken.length; l++) {
                if (subtoken[l].length > 0) {
                    tokens.push(subtoken[l]);
                    separators.push('');
                }
            }
            continue;
        }

        // In some cases we want to combine two tokens.
        if (s === '-' || s === '/') {
            tail = { t, s };
        } else {
            tokens.push(t);
            separators.push(s);
        }
    }

    if (tail) {
        tokens.push(tail.t);
        separators.push(tail.s);
    }

    const owner = new Array(tokens.length);
    for (let i = 0; i < owner.length; i++) owner[i] = i;

    return { tokens, separators, owner, lastWord: false };
}

/**
 * address - finds an address giving a single string token
 *
 * @param  {String} token - a single String query token
 * @return {String} Returns a string of the address or null
 */
function address(token) {
    if (
        typeof token === 'string'
        && (
            /^\d+[a-z]?$/.test(token) // 10 or 10a Style
            || /^(\d+)-(\d+)[a-z]?$/.test(token) // 10-19 or 10-19a Style
            || /^(\d+)([nsew])(\d+)[a-z]?$/.test(token) // 6N23 Style (ie Kane County, IL)
            || /^([nesw])(\d+)([nesw]\d+)?$/.test(token) // W350N5337 or N453 Style (ie Waukesha County, WI)
            || /^\d+(к\d+)?(с\d+)?$/.test(token) // Russian style including korpus (cyrillic к) and stroenie (cyrillic с)
        )
    ) {
        return token;
    } else {
        return null;
    }
}

/**
 * Get the min + max housenum range for a doc with carmen:addressnumber or carmen:rangetype
 * housenumber properties.
 *
 * @param {object} doc - geojson feature document
 * @return {Array<string>} list of house numbers
 */
function getHousenumRangeV3(doc) {
    const ranges = [];
    const used = {};

    /**
     * Add a numToken to our range
     * @param {string} numToken - waffled address
     */
    function add(numToken) {
        if (!used[numToken]) {
            used[numToken] = true;
            ranges.push(numToken);
        }
    }

    if (doc.properties['carmen:addressnumber']) {
        const keys = typeof doc.properties['carmen:addressnumber'] === 'string' ?
            JSON.parse(doc.properties['carmen:addressnumber']) :
            doc.properties['carmen:addressnumber'];
        for (let i = 0; i < keys.length; i++) {
            if (!keys[i]) continue;

            for (let j = 0; j < keys[i].length; j++) {
                if (typeof keys[i][j] === 'number') keys[i][j] = keys[i][j].toString();
                const numToken = parseSemiNumber(keys[i][j]);
                if (numToken === null) continue;
                add(numTokenV3(numToken.toString()));
            }
        }
    }

    if (doc.properties['carmen:rangetype']) {
        const props = ['carmen:lfromhn','carmen:ltohn','carmen:rfromhn','carmen:rtohn'];

        for (let c_it = 0; c_it < doc.geometry.geometries.length; c_it++) {
            for (let p = 0; p < props.length; p += 2) {
                if (!doc.properties[props[p]]) continue;

                const a = doc.properties[props[p]][c_it];
                const b = doc.properties[props[p + 1]][c_it];

                for (let k = 0; k < a.length; k++) {
                    if (typeof a[k] === 'number') a[k] = a[k].toString();
                    if (typeof b[k] === 'number') b[k] = b[k].toString();

                    const valA = parseSemiNumber(a[k]);
                    const valB = parseSemiNumber(b[k]);
                    if (valA === null || valB === null) continue;

                    const min = Math.min(valA, valB);
                    const max = Math.max(valA, valB);
                    add(numTokenV3(max.toString()));
                    let val = min;
                    while (val < max) {
                        add(numTokenV3(val.toString()));
                        val += val < 10 ? 10 : 100;
                    }
                }
            }
        }
    }
    ranges.sort();
    return ranges.length ? ranges : false;
}

/**
 * Takes a phrase and returns a one-byte hash extract of the phrase calculated
 * using murmurHash.
 *
 * @param {String} phrase - the phrase to hash
 * @return {Number} A single byte extracted from the hash of the phrase
 */
function phraseHash(phrase) {
    return murmurHash(phrase, 'buffer')[0];
}

/**
 * Takes a geocoder_tokens token mapping and a text string and returns
 * an array of one or more arrays of tokens that should be indexed.
 *
 * @param {object} simpleReplacer - simple relacements
 * @param {Array<ReplaceRule>} complexReplacer - complex replacements
 * @param {Array<ReplaceRule>} globalReplacer - global replacements
 * @param {object} doc - geojson feature
 * @param {Set<string>} defaultLanguages - set of default languages
 * @param {Set<string>} categories - set of categories
 * @return {Array<object>} List of { tokens, languages } objects.
 */
function getIndexableText(simpleReplacer, complexReplacer, globalReplacer, doc, defaultLanguages, categories) {
    const indexableText = new Map();
    const indexableHashes = new Map();
    const intersectionText = [];

    // find all the per-language fields
    const langTexts = new Map();
    langTexts.set('default', 'carmen:text');
    const keys = Object.keys(doc.properties);
    const length = keys.length;
    for (let i = 0; i < length; i ++) {
        const code = keys[i].match(/^carmen:text_(.+)/);
        if (code) {
            const language = code[1].replace('-', '_');
            if (!cl.hasLanguage(language)) throw new Error(code[1] + ' is an invalid language code');
            if (doc.properties[keys[i]]) langTexts.set(language, keys[i]);
        }
    }

    let autoPopulate = [];
    if (defaultLanguages && defaultLanguages.length) {
        // only include a language in the auto-populate list if we don't have
        // supplied translations for it
        autoPopulate = defaultLanguages.filter((lang) => !langTexts.has(lang));
    }


    const intersections = getIntersectionText(doc);
    const housenumRange = getHousenumRangeV3(doc);

    // consolidate all the phrases together across languages
    const texts = new Map();
    const hashes = new Map();
    for (const langText of langTexts) {
        const prop = doc.properties[langText[1]];
        const synonyms = Array.isArray(prop) ? prop : prop.split(',');
        for (let i = 0; i < synonyms.length; i++) {
            const text = synonyms[i];
            hashes.set(text, phraseHash(text));

            let lang;
            // treat category terms in the non-display position as universal
            if (langText[0] === 'universal' || (i > 0 && categories && categories.has(text))) {
                lang = 'all';
            } else {
                lang = langText[0];
            }

            let langsForText = texts.get(text);
            if (!langsForText) {
                langsForText = [];
                texts.set(text, langsForText);
            }
            langsForText.push(lang);
            if (lang === 'default' && autoPopulate.length) {
                for (const autoLang of autoPopulate) langsForText.push(autoLang);
            }
        }
    }

    // at this point we have a map of a bunch of phrases (so, individual synonyms)
    // each of which is mapped to a list of languages for which it's valid

    // next we'll get the variants of each phrase, and add them for each language
    for (const entry of texts) {
        let text = entry[0].trim();
        const langs = entry[1];
        const hash = hashes.get(entry[0]);

        // Global replacements
        if (globalReplacer && globalReplacer.length) {
            text = token.replaceGlobalTokens(globalReplacer, text);
        }

        if (intersections) {
            // We don't support translated cross streets

            let l = intersections.length;
            while (l--) {
                //  enumerate token replacements for intersection search
                const intersectionVariants = token.enumerateTokenReplacements(complexReplacer, tokenize(intersections[l]));

                for (const intersectionVariant of intersectionVariants) {
                    if (intersectionVariant.reduceRelevance) continue;
                    let intersectionTokens = normalizeQuery(tokenize(intersectionVariant.phrase)).tokens;

                    // simpleReplacer to covert things like northwest => nw
                    intersectionTokens = simpleReplacer ? simpleReplacer.replacer(intersectionTokens) : intersectionTokens;

                    // Because '+' is considered a word separator tokenize will
                    // have stripped it out. It has special meaning here so we
                    // add it back.
                    intersectionTokens.splice(0, 1, '+intersection');
                    intersectionTokens.push(',');
                    intersectionText.push(intersectionTokens);
                }
            }
        }

        // push tokens with replacements
        const variants = token.enumerateTokenReplacements(complexReplacer, tokenize(text));

        for (const variant of variants) {
            const tokenized = tokenize(variant.phrase);
            const encoded = normalizeQuery(tokenized).tokens;

            // do simple token replacements without regexes -- just look them up in a dict
            const tokens = simpleReplacer ? simpleReplacer.replacer(encoded) : encoded;
            if (!tokens.length) continue;

            const keys = [tokens.join(' ')];
            // push tokens with housenum range token if applicable

            if (intersectionText.length) {
                for (let i = 0; i < intersectionText.length; i++) {
                    const withIntersections = intersectionText[i].concat(tokens);
                    keys.push(withIntersections.join(' '));
                }
            }

            if (housenumRange) {
                let l = housenumRange.length;
                while (l--) {
                    const withHousenums = [housenumRange[l]].concat(tokens);
                    keys.push(withHousenums.join(' '));
                }
            }

            for (const key of keys) {
                let set = indexableText.get(key);
                if (!set) {
                    set = new Set();
                    indexableText.set(key, set);
                }
                for (const language of langs) set.add(language);
                if (variant.reduceRelevance) {
                    set.reduceRelevance = variant.reduceRelevance;
                }
                if (!indexableHashes.has(key)) {
                    indexableHashes.set(key, hash);
                }
            }
        }
    }

    const output = [];
    for (const phrase of indexableText.keys()) {
        const obj = { tokens: phrase.split(' '), languages: Array.from(indexableText.get(phrase)), hash: indexableHashes.get(phrase), reduceRelevance: indexableText[phrase].reduceRelevance };
        output.push(obj);
    }
    return output;
}

/**
 * DEPRECATED
 * Takes a geocoder_tokens token mapping and a text string and returns
 * an array of one or more arrays of tokens that should be indexed.
 *
 * Note: we don't include intersection text here.
 *
 * @param {object} simpleReplacer - simple relacements
 * @param {Array<ReplaceRule>} complexReplacer - complex replacements
 * @param {Array<ReplaceRule>} globalReplacer - global replacements
 * @param {object} doc - geojson feature
 * @return {Array<Array<string>>} Array of token arrays
 */
function getMinimalIndexableText(simpleReplacer, complexReplacer, globalReplacer, doc) {
    const uniqTexts = new Set();
    const indexableText = [];
    const housenumRange = getHousenumRangeV3(doc);

    let texts = doc.properties['carmen:text'].split(',');

    for (const key of Object.keys(doc.properties)) {
        if (key.match(/text_(.+)/) && doc.properties[key]) {
            texts = texts.concat(doc.properties[key].split(','));
        }
    }

    for (let x = 0; x < texts.length; x++) {

        let text = texts[x];
        // Global replacements
        if (globalReplacer && globalReplacer.length) {
            text = token.replaceGlobalTokens(globalReplacer, text);
        }

        const tokenized = token.replaceToken(complexReplacer, tokenize(text));
        let tokens = simpleReplacer.replacer ? simpleReplacer.replacer(tokenized.tokens) : tokenized.tokens;

        tokens = tokens.filter((v) => v.length > 0);

        if (!tokens.length) continue;

        if (housenumRange) {
            let l = housenumRange.length;
            while (l--) {
                const withHousenums = [housenumRange[l]].concat(tokens);
                add(withHousenums);
            }
        } else {
            add(tokens);
        }
    }

    /**
     * Add text to the indexable list
     * @param {Array<string>} tokens - tokenized string
     */
    function add(tokens) {
        const key = tokens.join(' ');
        if (!tokens.length || uniqTexts.has(key)) return;
        uniqTexts.add(key);
        indexableText.push(tokens);
    }
    return indexableText;
}

/**
 * Detect and extract a number from a mixed string
 *
 * @param {string} _ - text to try an pull number from
 * @return {null|number} a number or null
 */
function parseSemiNumber(_) {
    if (/[ск]/g.test(_)) {
        // for russian style addresses, only return first \d+
        _ = parseInt(_, 10);
    } else {
        // checks if things are like 9th, 10th etc
        _ = parseInt((_ || '').replace(/[^\d]/g,''),10);
    }
    return isNaN(_) ? null : _;
}

/**
 * Generate all potential permutations of an array of tokenized
 * terms (strings) or term IDs (term id numbers).
 *
 * @param {Array<string>} terms - list of terms
 * @param {Array<number>} weights - weights of each term
 * @param {boolean} all - If true and if the terms array is less than 8 elements,
 *        return all permutations, rather then only continuous regions. This
 *        flag is UNSAFE at query time and should only be used during indexing.
 * @return {Array<Array<string>>} In addition to its string elements the
 *        nested array it also has the following properties;
 *        - ender: {boolean}
 *        - mask: {number}
 *        - relev: {number}
 */
function permutations(terms, weights, all, frequentWords) {
    const reduceRelevance = terms.reduceRelevance;
    const minRelevance = 0.8;
    terms = (terms && Array.isArray(terms)) ? terms : terms.tokens;
    const length = terms.length;
    const masks = all && length <= 8 ? permute.all(length) : permute.continuous(length);

    const permutations = [];
    for (let i = 0; i < masks.length; i++) {
        let wordDropped = false;
        const mask = masks[i];
        const permutation = [];

        // Determine whether permutation includes ending term.
        permutation.ender = !!(mask & (1 << length - 1));

        // Add a bitmask that represents the slice of terms.
        permutation.mask = mask;

        let relev = 0;
        for (let j = 0; j < length; j++) {
            if (!(mask & (1 << j))) {
                if (frequentWords && frequentWords.has(terms[j])) {
                    wordDropped = true;
                }
                continue;
            }
            permutation.push(terms[j]);
            if (terms.address && j === terms.address.position) {
                permutation.address = {
                    position: terms.address.position,
                    number: terms.address.number,
                    numberOrder: 'first'
                };
            }
            if (weights) relev += (weights[j] || 0);
        }

        if (weights) {

            if (reduceRelevance && permutation.length === length) permutation.relev = minRelevance;
            else {
                permutation.relev  = (wordDropped && (permutation.length === terms.length - 1)) ? Math.max(minRelevance, Math.round(relev * 5) / 5) : Math.round(relev * 5) / 5;
            }
        }

        // If it's a trailing numToken swap it to the front.
        // This is an optimization letting us index only the
        // leading-numtoken version of a phrase.
        if (permutation.address) {
            if (permutation.length > 1) {
                if (permutation[permutation.length - 1].indexOf('#') !== -1) {
                    permutation.unshift(permutation.pop());
                    permutation.ender = false;
                    permutation.address.numberOrder = 'last';
                }
            } else {
                // the number is the only token, so it's both first and last
                permutation.address.numberOrder = null;
            }
        }

        permutations.push(permutation);
    }
    return permutations;
}

/**
 * Filter token permutations which contain masked address number in the middle.
 *
 * @param {Array<Array<string>>} permutations - array of tokenized text permutations
 * @return {Array<Array<string>>} filtered list of permutations
 */
function addressPermutations(permutations) {
    const ret = [];
    const memo = new Set();
    // Outer for loop is labeled so we can `continue` based on contents of each
    // permutation as we review them.
    outer: for (let i = 0; i < permutations.length; i++) {
        const terms = permutations[i];

        // Disallow permutations where housenum token is not at the front or back.
        for (let j = 1; j < terms.length - 1; j++) {
            if (terms[j].includes('#')) continue outer;
        }

        const key = `${terms.join(',')}-${terms.ender}-${terms.mask}-${terms.relev || 0}`;

        if (!memo.has(key)) {
            memo.add(key);
            ret.push(permutations[i]);
        }
    }
    ret.sort((a, b) => b.length - a.length);
    return ret;
}

/**
* getIndexablePhrases
*
* @param {TokenizedQuery} text - tokenized text
* @param {freq} freq - TODO
* @return {Array<Object>} List of phrase objects { relev, text, phrase }
*/
function getIndexablePhrases(text, freq, frequentWords) {
    const uniq = new Set();
    const phrases = [];
    let obj = {};
    if (text.tokens[0] === '+intersection') {
        const etext = normalizeText(text.tokens.join(' '));
        return [{
            relev: 1,
            phrase: etext,
            hash: text.hash
        }];
    }

    const perms = permutations(text, getWeights(text.tokens, freq), true, frequentWords);
    perms.sort(sortByRelev);

    for (let i = 0; i < perms.length; i++) {
        // Indexing optimization.
        const relev = perms[i].relev;
        if (relev < 0.8) break;

        const joined = perms[i].join(' ');
        const etext = normalizeText(joined);

        // Encode canonical phrase.
        obj = {
            relev: relev,
            phrase: etext,
            hash: text.hash
        };

        // Uses the highest scored phrase via sort.
        if (uniq.has(obj.phrase)) continue;
        uniq.add(obj.phrase);
        phrases.push(obj);
    }
    return phrases;
}

/**
 * Sort phrases by relevence
 * @param {object} a - phrase to compare
 * @param {object} b - phrase to compare
 * @return {number} difference between relevence of b & a
 */
function sortByRelev(a, b) {
    return b.relev - a.relev;
}

/**
 *
 * @param {Array<string>} tokens - list of individual terms
 * @param {Object} freq - frequencies of terms in the index
 * @return {Array<number>} array of weights
 */
function getWeights(tokens, freq) {
    let i = 0;
    let termfreq = 0;
    let weightsum = 0;
    const weights = [];
    const totalfreq = freq['__COUNT__'][0] || 1;
    let numTokens = false;

    // Determine weights of all terms relative to one another.
    i = tokens.length;
    while (i--) {
        if (/#/.test(tokens[i])) {
            numTokens = true;
            weights[i] = -1;
        } else {
            const term = tokens[i];
            termfreq = freq[term] ? freq[term][0] : 1;
            weights[i] = Math.log(1 + totalfreq / termfreq);
            weightsum += weights[i];
        }
    }

    // When numTokens are present, numTokens are a constant 0.2 weight.
    // Adjust other weights to fit within a 0-0.8 range.
    i = weights.length;
    if (numTokens) {
        while (i--) {
            if (weights[i] === -1) {
                weights[i] = 0.2;
            } else {
                weights[i] = Math.max(weights[i] / weightsum) * 0.8;
            }
        }
    } else {
        while (i--) {
            weights[i] = Math.max(weights[i] / weightsum);
        }
    }
    return weights;
}

/**
 * Generate variants of the input tokens each with one number masked for address
 * searches.
 *
 * @param {Array<string>} text - array of tokens
 * @param {number} version - For backwards compatiblity, should always be 3
 * @return {Array<Array<string>>} variants of text
 */
function numTokenize(text, version) {
    if (version < 3) throw (new Error(`Source version ${version} is unsupported`));
    if (typeof text === 'string') throw (new Error('First argument must be an Array'));

    const numTokenized = [];
    for (let i = 0; i < text.length; i++) {
        const replaced = text.slice(0);
        const num = parseSemiNumber(address(text[i]));
        if (num !== null) {
            replaced.address = { number: text[i], position: i };
            replaced[i] = numTokenV3(num.toString());
            numTokenized.push(replaced);
        }
    }
    return numTokenized;
}

/**
 * @param {TokenizedQuery} tokens - tokens
 * @param {string} intersectionToken - 'and' or the like.
 * @return {Array<string>} permutations array, has a few extras;
 *        - ender: {boolean}
 *        - mask: {number}
 *        - relev: {number}
 */
function intersectionPermutations(tokens, intersectionToken) {
    const ret = [];
    const tokenizedQuery = tokens.tokens; // todo use this to calculate mask
    if (tokenizedQuery.length < 3) return ret;
    // intersection token can't be at the start or the end of the query
    // eg. "and first street" or "first street and"
    for (let i = 1; i < tokenizedQuery.length - 1; i++) {
        if (tokenizedQuery[i] === intersectionToken) {
            // f st and 9th st
            // for intersections we need a way to replace the and with a token that we recognise as an intersection
            // which is +intersection
            const replaced = tokenizedQuery.slice(0);
            replaced[i] = ',';
            replaced.unshift('+intersection');
            for (let j = i + 2; j < replaced.length; j++) {
                const permutation = replaced.slice(0, j + 1);
                permutation.ender = (j === replaced.length - 1);
                // Intersection queries MUST start at the start of the query so
                // we can assume the mask starts at the first token. We get the
                // correct bits set by taking two's compliment of one bit past
                // our desired end.
                permutation.mask = (1 << (j)) - 1;
                // need to do weights?
                permutation.relev = 0;
                ret.push(permutation);
            }
        }
    }

    return ret;
}

/**
 * Given a query string (tokenized or not) consisting of a numerical prefix of
 * an address number and an index version number, return variants of the query
 * string that represent all the possible strings that might be generated by
 * "waffling" any strings that start with the prefix. For example, "19" might
 * be short for "19" (which would waffle as "##") or for "190" (the "19" part of
 * which would waffle as "1#") or "1900" (the "19" part of which would waffle as
 * 19); we'd return all three.
 *
 * @param {Array<string>} text - array of tokens
 * @param {number} version - For backwards compatiblity, should always be 3
 * @return {Array<Array<string>>} List of new query variants
 */
function numTokenizePrefix(text, version) {
    if (typeof text === 'string') throw (new Error('First argument must be an Array'));

    const numTokenized = [];
    if (text.length !== 1 || version < 3) return numTokenized;

    const num = parseSemiNumber(address(text[0]));
    if (num != null) {
        const strNum = num.toString();
        const prefixVariants = new Set();
        for (const suffix of ['', '0', '00']) {
            // see how it would be waffled if it were short for something longer
            let waffled = numTokenV3(strNum + suffix);
            // but then cut it back down to size
            waffled = waffled.substr(0, strNum.length);
            prefixVariants.add(waffled);
        }
        for (const variant of prefixVariants) {
            if (variant !== text[0]) {
                const replaced = text.slice(0);
                replaced[0] = variant;
                numTokenized.push(replaced);
            }
        }
    }
    return numTokenized;
}

/**
 * "Waffle" some text
 * @param {string} str - text to "waffle"
 * @return {string} "waffled" text
 */
function numTokenV3(str) {
    if (str.length === 0) return '';
    if (str.length === 1) return '#';
    if (str.length === 2) return '##';
    let lead = str.length === 3 ? 1 : 2;
    let token = str.substr(0,lead);
    while (lead++ < str.length) token += '#';
    return token;
}

/**
 * encode3BitLogScale - Convert a number to a 3-bit log scale integer
 * @param {number} num - The number to be converted
 * @param {number} max - The value `num` is scaled against
 * @return {number} 3 bit value
 */
function encode3BitLogScale(num, max) {
    if (num <= 0 || !num || !max) return 0;
    if (num === 1) return 1;
    return Math.ceil(7 * Math.fround(Math.log(num)) / Math.fround(Math.log(max)));
}

/**
 * decode3BitLogScale - Convert a 3-bit log scale integer to a number
 * @param {number} num - The number to be converted
 * @param {number} max - The value `num` is scaled against
 * @param {bool} round - Whether or not to round to the nearest integer
 * @return {number} scaled up value
 */
function decode3BitLogScale(num, max, round) {
    if (!num || !max) return 0;
    if (round) {
        return Math.round(Math.pow(max, num / 7));
    }
    else {
        return Math.pow(max, num / 7);
    }
}

/**
* getIntersectionText - Indexes intersection data differently by marking it with a special word "intersectionsearch"
* @param {Object} doc The document to be indexed
* @return {(Object|Boolean)} ranges An array of indexed intersection data, false if nothing was indexed
*/
function getIntersectionText(doc) {
    const intersections = [];

    if (doc.properties['carmen:intersections']) {
        // carmen:intersections will look something like [null, [intersections array], null]
        const intersectionsArray = doc.properties['carmen:intersections'];
        for (let i = 0; i < intersectionsArray.length; i++) {
            if (!intersectionsArray[i]) continue;
            const keys = intersectionsArray[i];
            for (let j = 0; j < keys.length; j++) {
                intersections.push('+intersection ' + keys[j] + ' , ');
            }
        }
    }
    return intersections.length ? intersections : false;
}
