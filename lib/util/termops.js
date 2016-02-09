var mp4 = Math.pow(2,4);
var mp8 = Math.pow(2,8);
var mp20 = Math.pow(2,20);
var mp28 = Math.pow(2,28);
var mp32 = Math.pow(2,32);
var mp52 = Math.pow(2,52);
var unidecode = require('unidecode-cxx');
var idPattern = /^(\S+)\.([0-9]+)$/;
var token = require('./token');
var permute = require('./permute');
var murmur = require('murmur');
var mun = require('model-un');

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

    return {dbname:dbname, id:id};
};

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
};

/**
 * encodableText - Cleans and unidecodes a tokenized query
 *
 * @param {Array} tokens Tokenized array of user's input query
 */
function encodableText(tokens) {
    return unidecode(typeof tokens === 'string' ?  tokens : tokens.join(' ')).toLowerCase().trim().replace(/\s+/g, ' ');
}

function encodePhrase(tokens, degen) {
    var text = encodableText(tokens);
    var encoded = parseInt(murmur.hash128(text).hex().substr(-13), 16);
    return encoded - (encoded % 2) + (degen ? 0 : 1);
};

// Generate a hash id from a feature ID. Fits within a 20-bit integer space
// to be encoded cleanly into zxy values (see lib/util/grid).
function feature(id) {
    return Math.abs(parseInt(id,10)) % mp20;
};

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
            numeric[0] = parseFloat(numeric[0].trim());
            numeric[1] = parseFloat(numeric[1].trim());
            if (!isNaN(numeric[0]) && !isNaN(numeric[1])) return numeric;
        }
    }

    var normalized = query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        // collapse apostraphes, periods
        .replace(/['\.]/g, '')
        // all other ascii and unicode punctuation except '-' per
        // http://stackoverflow.com/questions/4328500 split terms
        .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#\$%&\(\)\*\+,\.\/:;<=>\?@\[\]\^_`\{\|\}~]/gi, ' ')
        .split(/[\s+]+/gi);

    var pretokens = [];

    for (var i=0;i<normalized.length;i++) {
        if (/(\d+)-(\d+)[a-z]?/.test(normalized[i])) {
            pretokens.push(normalized[i]);
        } else {
            var splitPhrase = normalized[i].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    var tokens = [];

    for (var i = 0; i < pretokens.length; i++) {
        if (pretokens[i].length) {
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
 * @param query {Array} tokenized query
 * @param relev {Integer} a mask for the given query
 * @return {Object} returns an address object or null
*/
function maskAddress(query, mask) {
    for (var i = 0; i < query.length; i++) {
        if (mask & (1 << i)) {
            var addr = address(query[i]);
            if (addr) return {addr: addr, pos: i};
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
    if (typeof token === 'string' && (/^\d+[a-z]?$/.test(token) || /^(\d+)-(\d+)[a-z]?$/.test(token))) {
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

    if (doc.properties["carmen:addressnumber"]) {
        var keys = typeof doc.properties["carmen:addressnumber"] === 'string' ?
            JSON.parse(doc.properties["carmen:addressnumber"]) :
            doc.properties["carmen:addressnumber"];
        for (var i = 0; i < keys.length; i++) {
            if (typeof keys[i] === "number") keys[i] = keys[i].toString();
            var numToken = parseSemiNumber(keys[i]);
            if (numToken === null) continue;
            add(numTokenV3(numToken.toString()));
        }
    } else if (doc.properties["carmen:rangetype"]) {
        var props = ['carmen:lfromhn','carmen:ltohn','carmen:rfromhn','carmen:rtohn'];
        for (var p = 0; p < props.length; p += 2) {
            if (!doc.properties[props[p]]) continue;
            var a = Array.isArray(doc.properties[props[p]]) ? doc.properties[props[p]] : [doc.properties[props[p]]];
            var b = Array.isArray(doc.properties[props[p+1]]) ? doc.properties[props[p+1]] : [doc.properties[props[p+1]]];
            if (typeof a === "number") a = a.toString();
            if (typeof b === "number") a = b.toString();

            for (var i = 0; i < a.length; i++) {
                var valA = parseSemiNumber(a[i]);
                var valB = parseSemiNumber(b[i]);
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
    ranges.sort();
    return ranges.length ? ranges : false;
}

// Takes a geocoder_tokens token mapping and a text string and returns
// an array of one or more arrays of tokens that should be indexed.
module.exports.getIndexableText = getIndexableText;
function getIndexableText(replacer, doc) {
    var uniqTexts = {};
    var indexableText = [];
    var texts = doc.properties["carmen:text"].split(',');
    getTokens(texts, true);
    getTokens(texts);

    var keys = Object.keys(doc.properties);
    var length = keys.length;
    for (var i = 0; i < length; i ++) {
        var code = keys[i].match(/text_(.+)/);
        if (code) {
            if (!mun.hasLanguage(code[1])) throw new Error(code[1] + ' is an invalid language code');
            if (doc.properties[keys[i]]) getTokens(doc.properties[keys[i]].split(','));
        }
    }

    function getTokens(texts, skip) {
        for (var x = 0; x < texts.length; x++) {
            // push tokens with replacements
            if (skip) {
                var tokens = tokenize(token.replaceToken({}, texts[x]));
            } else {
                var tokens = tokenize(token.replaceToken(replacer, texts[x]));
            }
            if (!tokens.length) continue;

            // push tokens with housenum range token if applicable
            var range = getHousenumRangeV3(doc);
            if (range) {
                var l = range.length;
                while (l--) add([range[l]].concat(tokens));
            } else {
                add(tokens);
            }
        }
    }

    function add(tokens) {
        var key = tokens.join(' ');
        if (!tokens.length || uniqTexts[key]) return;
        uniqTexts[key] = true;
        indexableText.push(tokens.filter(function(elem, pos) {
            return tokens.indexOf(elem) == pos;
        }));
    }
    return indexableText;
};

// Check matched subquery text is probably based on a feature's
// text and not via fnv1a hash collision. Confirms that all
// characters within the subquery text are used somewhere by the
// feature text.
module.exports.decollide = decollide;
function decollide(replacer, doc, subq) {

    subq = unidecode(subq.toLowerCase()).toLowerCase().trim();
    // remove leading/trailing numtokens.
    subq = subq.replace(/^([0-9]*[#]+)/,'').replace(/([0-9]*[#]+)$/,'');
    var texts = token.replaceToken(replacer, doc.properties['carmen:text']).concat(token.replaceToken({}, doc.properties['carmen:text'])).split(',');
    var keys = Object.keys(doc.properties);
    var length = keys.length;
    for (var i = 0; i < length; i ++) {
        var code = keys[i].match(/text_(.+)/);
        if (code && mun.hasLanguage(code[1]) &&
           doc.properties[keys[i]]) texts = texts.concat(token.replaceToken(replacer, doc.properties[keys[i]]).concat(token.replaceToken({}, doc.properties['carmen:text'])).split(','));
    }
    
    var a = texts.length;
    var fails = 0;
    while (a--) {
        var text = unidecode(texts[a].toLowerCase()).toLowerCase().trim();
        var textHash = {
            32: true, // ' ' for spaces
        };
        var b = text.length;
        while (b--) textHash[text.charCodeAt(b)] = true;
        var c = subq.length;
        while (c--) if (!textHash[subq.charCodeAt(c)]) {
            fails++;
            break;
        }
    
    // if subq fails to match every single text, consider it
    // an fnv1a false positive for this feature.
        return fails !== texts.length;
    }
}
function parseSemiNumber(_) {
    _ = parseInt((_ || '').replace(/[^\d]/g,''),10);
    return isNaN(_) ? null : _;
}

function encodeTerm(text) {
    var encoded = parseInt(murmur.hash128(text).hex().substr(-13), 16);
    // Ensures encoded term does not collide with ids 0 or 1 in freq
    // index. These ids are reserved for count + maxscore stat values.
    if (encoded <= 1) encoded += 2;
    return encoded;
}

// Generate all potential permutations of an array of tokenized
// terms (strings) or term IDs (term id numbers).
module.exports.permutations = permutations;
function permutations(terms, weights, all) {
    var masks = all && terms.length <= 8 ? permute.all(terms.length) : permute.continuous(terms.length);

    var length = terms.length;
    var permutations = [];
    for (var i = 0; i < masks.length; i++) {
        var mask = masks[i];
        var permutation = [];

        // Determine whether permutation includes ending term.
        permutation.ender = !!(mask & (1<<length-1));

        // Add a bitmask that represents the slice of terms.
        permutation.mask = mask;

        if (weights) {
            permutation.relev = 0;
            for (var j = 0; j < length; j++) {
                if (!(mask & (1<<j))) continue;
                permutation.push(terms[j]);
                permutation.relev += (weights[j]||0);
            }
            permutation.relev = Math.round(permutation.relev * 5) / 5;
        } else {
            for (var j = 0; j < length; j++) {
                if (!(mask & (1<<j))) continue;
                permutation.push(terms[j]);
            }
        }

        // If it's a trailing numToken swap it to the front.
        // This is an optimization letting us index only the
        // leading-numtoken version of a phrase.
        if (permutation[permutation.length-1].indexOf('#') !== -1) {
            permutation.unshift(permutation.pop());
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
        var middle = permutations[i].slice(1,permutations[i].length-1).join(',');
        if (middle.indexOf('#') !== -1) continue;

        var key = text + '-' +
            permutations[i].ender + '-' +
            permutations[i].mask + '-' +
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

module.exports.getIndexablePhrases = getIndexablePhrases;
function getIndexablePhrases(tokens, freq) {
    var uniq = {};
    var phrases = [];
    var perms = permutations(tokens, getWeights(tokens, freq), true);
    var l = 0;

    perms.sort(sortByRelev);

    for (var i = 0; i < perms.length; i++) {
        // Indexing optimization.
        if (perms[i].relev < 0.8) break;

        var text = perms[i].join(' ');

        // Encode canonical phrase.
        var toEncode = [];
        toEncode.push({
            degen: false,
            relev: perms[i].relev,
            text: encodableText(perms[i].join(' ')),
            phrase: encodePhrase(perms[i].join(' '), false)
        });

        // Encode degens of phrase.
        // Pre-unidecoded text is used to handle CJK degens properly.
        var degens = getPhraseDegens(text);
        l = degens.length;
        while (l--) toEncode.push({
            degen: true,
            relev: perms[i].relev,
            text: encodableText(degens[l]),
            phrase: encodePhrase(degens[l], true)
        });

        l = toEncode.length;
        while (l--) {
            var obj = toEncode[l];

            // Uses the highest scored phrase via sort.
            if (uniq[obj.phrase]) continue;
            uniq[obj.phrase] = true;
            phrases.push(obj);
        }
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
    var totalfreq = freq[0][0] || 1;
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
            weights[i] = Math.log(1 + totalfreq/termfreq);
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

// Generate phrase degenerates from a given array of tokens.
module.exports.getPhraseDegens = getPhraseDegens;
function getPhraseDegens(tokens) {
    var text = typeof tokens === 'string' ? tokens : tokens.join(' ');
    var length = text.length + 1;
    var degens = [];
    var leadsWithNumToken = /#/.test(text.split(' ')[0]);

    // Iterate through subsets of each term to generate degens.
    for (var i = 1; !i || (i < length && length - i > 0); i++) {
        var degen = text.substr(0, i);
        if (degen.charAt(degen.length-1) === ' ') continue;
        if (leadsWithNumToken && degen.indexOf(' ') === -1) continue;
        degens.push(degen);
    }

    return degens;
};

module.exports.numTokenize = numTokenize;
function numTokenize(text, version) {
    if (typeof text === 'string') text = tokenize(text);
    var numTokenized = [];
    for (var i = 0; i < text.length; i++) {
        var replaced = text.slice(0);
        var num = parseSemiNumber(address(text[i]));
        if (num !== null) {
            replaced[i] = version >= 3 ?
                numTokenV3(num.toString()) :
                numTokenV2(num.toString());

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
    var token = str.substr(0,lead);
    while (lead++ < str.length) token += '#';
    return token;
}

