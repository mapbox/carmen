var mp20 = Math.pow(2, 20);
var removeDiacritics = require('./remove-diacritics');
var idPattern = /^(\S+)\.([0-9]+)$/;
var token = require('./token');
var permute = require('./permute');
var cl = require('./closest-lang');

module.exports.id = id;
module.exports.terms = terms;
module.exports.address = address;
module.exports.maskAddress = maskAddress;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getHousenumRangeV3 = getHousenumRangeV3;
module.exports.encodeTerm = encodeTerm;
module.exports.encodableText = encodableText;
module.exports.encodePhrase = encodePhrase;
module.exports.tokenize = tokenize;
module.exports.feature = feature;

/**
 * id - Checks if the query is requesting a specific feature by its id
 *      province.### address.### etc.
 *
 * @param {Array} indexes Array of indexes & their specific configs
 * @param {String} query User's geocode query
 * @return {Object|false} Return false or an object containing the index name and id of the feature
 */
function id(indexes, query) {
    var matches = query.match(idPattern);

    if (!matches) return false;

    var dbname = matches[1];
    var id = matches[2];

    if (!indexes[dbname]) return false;

    return { dbname: dbname, id: id };
}

/**
 * terms - converts text into an array of search term hash IDs.
 *
 * @param {Array} tokens Tokenized array of user's input query
 * @return {Array} Array of term hashes
 */
function terms(tokens) {
    var terms = []; // tokenize(text);
    for (var i = 0; i < tokens.length; i++) {
        terms[i] = encodeTerm(tokens[i]);
    }
    return terms;
}

// from http://stackoverflow.com/a/40825394
function removeEmoji(str) {
    return str.replace(
        /([#0-9]\u20E3)|[\xA9\xAE\u203C\u2047-\u2049\u2122\u2139\u3030\u303D\u3297\u3299][\uFE00-\uFEFF]?|[\u2190-\u21FF][\uFE00-\uFEFF]?|[\u2300-\u23FF][\uFE00-\uFEFF]?|[\u2460-\u24FF][\uFE00-\uFEFF]?|[\u25A0-\u25FF][\uFE00-\uFEFF]?|[\u2600-\u27BF][\uFE00-\uFEFF]?|[\u2900-\u297F][\uFE00-\uFEFF]?|[\u2B00-\u2BF0][\uFE00-\uFEFF]?|(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDEFF])[\uFE00-\uFEFF]?/g,
        ''
    );
}

/**
 * encodableText - Cleans and removes diacritics from a tokenized query
 *
 * @param {Array} tokens - Tokenized array of user's input query
 * @return {String} If tokens are encodable, returns
 *                 encoded string. Otherwise returns ''.
 */
function encodableText(tokens) {
    var text = typeof tokens === 'string' ? tokens : tokens.join(' ');
    var decodedText = removeEmoji(removeDiacritics(text));
    if (decodedText.trim().length > 0) {
        return decodedText
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    } else {
        return '';
    }
}

function encodePhrase(tokens, skipEncoding) {
    return skipEncoding ? tokens : encodableText(tokens);
}

// Generate a hash id from a feature ID. Fits within a 20-bit integer space
// to be encoded cleanly into zxy values (see lib/util/grid).
function feature(id) {
    return Math.abs(parseInt(id, 10)) % mp20;
}

/**
 * tokenize - Normalize input text into lowercase, asciified tokens.
 *
 * @param  {String} query  A string to tokenize
 * @param  {String} lonlat A lon,lat pair to tokenize
 * @return {Array}         A tokenized array
 */
function tokenize(query, lonlat) {
    if (lonlat) {
        var numeric = query.split(',');
        if (numeric.length === 2) {
            numeric[0] = Number(numeric[0].trim());
            numeric[1] = Number(numeric[1].trim());
            if (!isNaN(numeric[0]) && !isNaN(numeric[1])) return numeric;
        }
    }
    var normalized = query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        // collapse apostraphes, periods
        .replace(/[\u2018\u2019\u02BC\u02BB\uFF07'\.]/g, '')
        // all other ascii and unicode punctuation except '-' per
        // http://stackoverflow.com/questions/4328500 split terms
        .replace(
            /[\u2000-\u206F\u2E00-\u2E7F\\'!"#\$%&\(\)\*\+,\.\/:;<=>\?@\[\]\^_`\{\|\}~]/gi,
            ' '
        )
        .split(/[\s+]+/gi);

    var pretokens = [];

    for (var k = 0; k < normalized.length; k++) {
        // keep multi-digit numbers from being split in CJK queries
        if (
            normalized[k].length &&
            normalized[k][0].charCodeAt() >= 19968 &&
            normalized[k][0].charCodeAt() <= 40959
        ) {
            pretokens = pretokens.concat(normalized[k].split(/([0-9０-９]+)/));
        } else if (/(\d+)-(\d+)[a-z]?/.test(normalized[k])) {
            pretokens.push(normalized[k]);
        } else {
            var splitPhrase = normalized[k].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    var tokens = [];

    for (var i = 0; i < pretokens.length; i++) {
        // Exclude any empty strings or strings that will be empty after
        // emoji-stripping. This is applied as tokenized strings will eventually
        // be rejoined into phrases or subqueries and unidecoded.
        if (pretokens[i].length && removeEmoji(pretokens[i]).length) {
            var charCode = pretokens[i][0].charCodeAt();
            if (charCode >= 19968 && charCode <= 40959) {
                tokens = tokens.concat(pretokens[i].split(''));
            } else {
                tokens.push(pretokens[i]);
            }
        }
    }

    return tokens;
}

/**
 * maskAddress - finds an address given the bitmask of a query
 * This ensures that an address is only used if it does not currently
 * match any of the currently matched features in teh bitmask and it
 * is a valid address
 *
 * @param {Array} query tokenized query
 * @param {String} cover text
 * @param {Integer} mask a mask for the given query
 * @return {Object} returns an address object or null
*/
function maskAddress(query, coverText, mask) {
    var coverTokens = new Set(tokenize(coverText));
    for (var i = 0; i < query.length; i++) {
        if (mask & (1 << i)) {
            if (coverTokens.has(query[i])) {
                coverTokens.delete(query[i]);
            } else {
                var addr = address(query[i]);
                if (addr) return { addr: addr, pos: i };
            }
        }
    }
    return null;
}

/**
 * address - finds an address giving a single string token
 *
 * @param  {String} token a single String query token
 * @return {String}       Returns a string of the address or null
 */
function address(token) {
    //                                  10 or 10a Style               10-19 or 10-19a Style              6N23 Style (ie Kane County, IL)
    if (
        typeof token === 'string' &&
        (/^\d+[a-z]?$/.test(token) ||
            /^(\d+)-(\d+)[a-z]?$/.test(token) ||
            /^(\d+)([nsew])(\d+)[a-z]?$/.test(token))
    ) {
        return token;
    } else {
        return null;
    }
}

// Get the min + max housenum range for a doc with carmen:addressnumber or carmen:rangetype
// housenumber properties.
function getHousenumRangeV3(doc) {
    var ranges = [];
    var used = {};

    function add(numToken) {
        if (!used[numToken]) {
            used[numToken] = true;
            ranges.push(numToken);
        }
    }

    if (doc.properties['carmen:addressnumber']) {
        var keys =
            typeof doc.properties['carmen:addressnumber'] === 'string'
                ? JSON.parse(doc.properties['carmen:addressnumber'])
                : doc.properties['carmen:addressnumber'];
        for (var i = 0; i < keys.length; i++) {
            if (!keys[i]) continue;

            for (var j = 0; j < keys[i].length; j++) {
                if (typeof keys[i][j] === 'number')
                    keys[i][j] = keys[i][j].toString();
                var numToken = parseSemiNumber(keys[i][j]);
                if (numToken === null) continue;
                add(numTokenV3(numToken.toString()));
            }
        }
    }
    if (doc.properties['carmen:rangetype']) {
        var props = [
            'carmen:lfromhn',
            'carmen:ltohn',
            'carmen:rfromhn',
            'carmen:rtohn'
        ];

        for (var c_it = 0; c_it < doc.geometry.geometries.length; c_it++) {
            for (var p = 0; p < props.length; p += 2) {
                if (!doc.properties[props[p]]) continue;

                var a = doc.properties[props[p]][c_it];
                var b = doc.properties[props[p + 1]][c_it];

                for (var k = 0; k < a.length; k++) {
                    if (typeof a[k] === 'number') a[k] = a[k].toString();
                    if (typeof b[k] === 'number') b[k] = b[k].toString();

                    var valA = parseSemiNumber(a[k]);
                    var valB = parseSemiNumber(b[k]);
                    if (valA === null || valB === null) continue;

                    var min = Math.min(valA, valB);
                    var max = Math.max(valA, valB);
                    add(numTokenV3(max.toString()));
                    var val = min;
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

// Takes a geocoder_tokens token mapping and a text string and returns
// an array of one or more arrays of tokens that should be indexed.
module.exports.getIndexableText = getIndexableText;
function getIndexableText(replacer, globalTokens, doc, markVariants) {
    var indexableText = {};
    var phraseVariants = {};

    var langTexts = new Map();
    var keys = Object.keys(doc.properties);
    var length = keys.length;
    for (var i = 0; i < length; i++) {
        var code = keys[i].match(/text_(.+)/);
        if (code) {
            var language = code[1].replace('-', '_');
            if (!cl.hasLanguage(language))
                throw new Error(code[1] + ' is an invalid language code');
            if (doc.properties[keys[i]]) langTexts.set(keys[i], language);
        }
    }

    var texts = doc.properties['carmen:text'].split(',');

    // get tokens for default text
    getTokens(texts, 'default');

    // get tokens for each of the languages' text
    for (var langText of langTexts) {
        var lang = langText[1] === 'universal' ? 'all' : langText[1];
        getTokens(doc.properties[langText[0]].split(','), lang);
    }

    function getTokens(texts, language) {
        var combinedReplacer = [];
        if (globalTokens && globalTokens.length)
            combinedReplacer = combinedReplacer.concat(globalTokens);
        if (replacer && replacer.length)
            combinedReplacer = combinedReplacer.concat(replacer);

        for (var x = 0; x < texts.length; x++) {
            // push tokens with replacements
            let variants = token.enumerateTokenReplacements(
                combinedReplacer,
                texts[x]
            );

            // if we're not using the normalization cache, we should limit how many we produce to a not-insane number
            if (!markVariants) variants = variants.slice(0, 8);

            let primary = null;
            for (let variant of variants) {
                var tokens = tokenize(variant);
                if (!tokens.length) continue;

                // push tokens with housenum range token if applicable
                var range = getHousenumRangeV3(doc);
                if (range) {
                    var l = range.length;
                    while (l--) {
                        var withHousenums = [range[l]].concat(tokens);
                        add(
                            withHousenums,
                            language,
                            primary ? [range[l]].concat(primary) : null
                        );
                    }
                }
                add(tokens, language, primary);

                if (markVariants && !primary) primary = tokens;
            }
        }
    }

    function add(tokens, language, variantOf) {
        if (!tokens.length) return;

        var key;
        if (variantOf) {
            key = variantOf.join(' ');
            var secondary = tokens.join(' ');
            phraseVariants[key] = phraseVariants[key] || new Set();
            phraseVariants[key].add(secondary);
        } else {
            key = tokens.join(' ');
        }
        indexableText[key] = indexableText[key] || new Set();
        indexableText[key].add(language);
    }

    var output = [];
    Object.keys(indexableText).forEach(function(phrase) {
        let obj = {
            tokens: phrase.split(' '),
            languages: Array.from(indexableText[phrase])
        };
        if (phraseVariants[phrase])
            obj.variants = Array.from(phraseVariants[phrase]).map(function(v) {
                return v.split(' ');
            });
        output.push(obj);
    });

    return output;
}

function parseSemiNumber(_) {
    _ = parseInt((_ || '').replace(/[^\d]/g, ''), 10);
    return isNaN(_) ? null : _;
}

function encodeTerm(text) {
    return text;
}

// Generate all potential permutations of an array of tokenized
// terms (strings) or term IDs (term id numbers).
module.exports.permutations = permutations;
function permutations(terms, weights, all) {
    var masks =
        all && terms.length <= 8
            ? permute.all(terms.length)
            : permute.continuous(terms.length);

    var length = terms.length;
    var permutations = [];
    for (var i = 0; i < masks.length; i++) {
        var mask = masks[i];
        var permutation = [];

        // Determine whether permutation includes ending term.
        permutation.ender = !!(mask & (1 << (length - 1)));

        // Add a bitmask that represents the slice of terms.
        permutation.mask = mask;

        if (weights) {
            permutation.relev = 0;
            for (var j = 0; j < length; j++) {
                if (!(mask & (1 << j))) continue;
                permutation.push(terms[j]);
                permutation.relev += weights[j] || 0;
            }
            permutation.relev = Math.round(permutation.relev * 5) / 5;
        } else {
            for (var k = 0; k < length; k++) {
                if (!(mask & (1 << k))) continue;
                permutation.push(terms[k]);
            }
        }

        // If it's a trailing numToken swap it to the front.
        // This is an optimization letting us index only the
        // leading-numtoken version of a phrase.
        if (
            permutation.length > 1 &&
            permutation[permutation.length - 1].indexOf('#') !== -1
        ) {
            permutation.unshift(permutation.pop());
            permutation.ender = false;
        }

        permutations.push(permutation);
    }
    return permutations;
}

module.exports.uniqPermutations = uniqPermutations;
function uniqPermutations(permutations) {
    var uniq = [];
    var memo = {};
    for (var i = 0; i < permutations.length; i++) {
        var text = permutations[i].join(',');

        // Disallow permutations where housenum token is not
        // at the front or back.
        var middle = permutations[i]
            .slice(1, permutations[i].length - 1)
            .join(',');
        if (middle.indexOf('#') !== -1) continue;

        var key =
            text +
            '-' +
            permutations[i].ender +
            '-' +
            permutations[i].mask +
            '-' +
            (permutations[i].relev || 0);
        if (memo[key]) continue;
        memo[key] = true;
        uniq.push(permutations[i]);
    }
    uniq.sort(function(a, b) {
        return b.length - a.length;
    });
    return uniq;
}

/**
* getIndexablePhrases
*
* @param {Array} tokens
* @param {Object} freq
*/
module.exports.getIndexablePhrases = getIndexablePhrases;
function getIndexablePhrases(tokens, freq) {
    var uniq = {};
    var phrases = [];
    var perms = permutations(tokens, getWeights(tokens, freq), true);

    perms.sort(sortByRelev);

    for (var i = 0; i < perms.length; i++) {
        // Indexing optimization.
        var relev = perms[i].relev;
        if (relev < 0.8) break;

        var text = perms[i].join(' ');
        var etext = encodableText(text);

        // Encode canonical phrase.
        var obj = {
            relev: relev,
            text: etext,
            phrase: etext
        };

        // Uses the highest scored phrase via sort.
        if (uniq[obj.phrase]) continue;
        uniq[obj.phrase] = true;
        phrases.push(obj);
    }
    return phrases;
}

function sortByRelev(a, b) {
    return b.relev - a.relev;
}

module.exports.getWeights = getWeights;
function getWeights(tokens, freq) {
    var i = 0;
    var encoded = 0;
    var termfreq = 0;
    var weightsum = 0;
    var weights = [];
    var totalfreq = freq['__COUNT__'][0] || 1;
    var numTokens = false;

    // Determine weights of all terms relative to one another.
    i = tokens.length;
    while (i--) {
        if (/#/.test(tokens[i])) {
            numTokens = true;
            weights[i] = -1;
        } else {
            encoded = encodeTerm(tokens[i]);
            termfreq = freq[encoded] ? freq[encoded][0] : 1;
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

// check if a set of tokens consists soley of numtokenized tokens
module.exports.isAddressNumber = isAddressNumber;
function isAddressNumber(tokens) {
    var text = typeof tokens === 'string' ? tokens : tokens.join(' ');
    var leadsWithNumToken = /#/.test(text.split(' ')[0]);
    var hasSpace = /\s/.test(text);

    return leadsWithNumToken && !hasSpace;
}

module.exports.numTokenize = numTokenize;
function numTokenize(text, version) {
    if (typeof text === 'string') text = tokenize(text);
    var numTokenized = [];
    for (var i = 0; i < text.length; i++) {
        var replaced = text.slice(0);
        var num = parseSemiNumber(address(text[i]));
        if (num !== null) {
            replaced[i] =
                version >= 3
                    ? numTokenV3(num.toString())
                    : numTokenV2(num.toString());

            numTokenized.push(replaced);
        }
    }
    return numTokenized;
}

module.exports.numTokenV2 = numTokenV2;
function numTokenV2(str) {
    var len = str.length;
    var numToken = '';
    while (len--) numToken += '#';
    return numToken;
}

module.exports.numTokenV3 = numTokenV3;
function numTokenV3(str) {
    if (str.length === 0) return '';
    if (str.length === 1) return '#';
    if (str.length === 2) return '##';
    var lead = str.length === 3 ? 1 : 2;
    var token = str.substr(0, lead);
    while (lead++ < str.length) token += '#';
    return token;
}

/**
* encode3BitLogScale - Convert a number to a 3-bit log scale integer
* @param {number} num The number to be converted
* @param {number} max The value `num` is scaled against
* @return {number}
*/
module.exports.encode3BitLogScale = encode3BitLogScale;
function encode3BitLogScale(num, max) {
    if (num <= 0 || !num || !max) return 0;
    if (num === 1) return 1;
    return Math.ceil(
        7 * Math.fround(Math.log(num)) / Math.fround(Math.log(max))
    );
}

/**
* decode3BitLogScale - Convert a 3-bit log scale integer to a number
* @param {number} num The number to be converted
* @param {number} max The value `num` is scaled against
* @return {number}
*/
module.exports.decode3BitLogScale = decode3BitLogScale;
function decode3BitLogScale(num, max) {
    if (!num || !max) return 0;
    return Math.round(Math.pow(max, num / 7));
}
