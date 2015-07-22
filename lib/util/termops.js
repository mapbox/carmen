var mp4 = Math.pow(2,4);
var mp8 = Math.pow(2,8);
var mp20 = Math.pow(2,20);
var mp28 = Math.pow(2,28);
var mp32 = Math.pow(2,32);
var mp52 = Math.pow(2,52);
var unidecode = require('unidecode');
var idPattern = /^(\S+)\.([0-9]+)$/;
var token = require('./token');

module.exports.address = address;
module.exports.maskAddress = maskAddress;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getHousenumRange = getHousenumRange;
module.exports.fnv1a = fnv1a;
module.exports.encodeTerm = encodeTerm;

//Checks if the query is requesting a specific feature by its id
//province.### address.### etc.
module.exports.id = function(indexes, query) {
    var matches = query.match(idPattern);

    if (!matches) return false;

    var dbname = matches[1];
    var id = matches[2];

    if (!indexes[dbname]) return false;

    return {dbname:dbname, id:id};
};

// Converts text into an array of search term hash IDs.
module.exports.terms = function(tokens) {
    var terms = []; // tokenize(text);
    for (var i = 0; i < tokens.length; i++) {
        terms[i] = encodeTerm(tokens[i]);
    }
    return terms;
};

function getTermWeight(freq, term) {
    var total = freq[0][0] || 1;
    var termfreq;
    var maxweight = 0;

    for (var i = 0; i < tokens.length; i++) {
        terms[i] = encodeTerm(tokens[i]);
        termfreq = freq[terms[i]] ? freq[terms[i]][0] : 1;
        weights[i] = Math.log(1 + total/termfreq);
        maxweight = Math.max(maxweight, weights[i]);
    }
    for (i = 0; i < tokens.length; i++) {
        terms[i] = terms[i] + Math.max(1,Math.floor(weights[i]/maxweight*15));
    }
    return terms;
}

module.exports.encodePhrase = encodePhrase;
function encodePhrase(tokens, degen) {
    var text = unidecode(typeof tokens === 'string' ?  tokens : tokens.join(' ')).toLowerCase().trim();
    var length = Math.max(0, text.split(' ').length - 1);
    var encoded = fnv1a(text);
    encoded = encoded - (encoded % 8);
    encoded += (Math.min(3, length) * 2) + (degen ? 0 : 1);
    return encoded;
};

// Generate a hash id from a feature ID. Fits within a 20-bit integer space
// to be encoded cleanly into zxy values (see lib/util/grid).
module.exports.feature = function(id) {
    return Math.abs(parseInt(id,10)) % mp20;
};

// Normalize input text into lowercase, asciified tokens.
module.exports.tokenize = tokenize;

/**
 * tokenize - Acceps a query string or lonlat and returns a tokenized array
 *
 * @param  {String} query  A string to tokenize
 * @param  {String} lonlat A lon,lat pair to tokenie
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

    for(i=0;i<normalized.length;i++){
        if (/(\d+)-(\d+)[a-z]?/.test(normalized[i])){
            pretokens.push(normalized[i]);
        } else {
            var splitPhrase = normalized[i].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    var tokens = [];

    for (var i = 0; i < pretokens.length; i++) {
        if (pretokens[i].length) {
            tokens.push(pretokens[i]);
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
    for (var i = 0; i < query.length; i++ ) {
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

// Get the min + max housenum range for a doc with _cluster or _rangetype
// housenumber properties.
function getHousenumRange(doc) {
    var ranges = [];
    var used = {};
    if (doc._cluster) {
        var keys = typeof doc._cluster === 'string' ?
            Object.keys(JSON.parse(doc._cluster)) :
            Object.keys(doc._cluster);
        for (var i = 0; i < keys.length; i++) {
            var housenum = parseSemiNumber(keys[i]);
            if (housenum === null) continue;
            var len = housenum.toString().length;
            if (!used[len]) {
                used[len] = true;
                var numToken = '';
                while (len--) numToken += '#';
                ranges.push(numToken);
            }
        }
    } else if (doc._rangetype) {
        var props = ['_lfromhn', '_ltohn', '_rfromhn', '_rtohn'];
        var min = Infinity;
        var max = -Infinity;
        for (var p = 0; p < props.length; p++) {
            if (!doc[props[p]]) continue;
            var prop = Array.isArray(doc[props[p]]) ? doc[props[p]] : [doc[props[p]]];
            for (var i = 0; i < prop.length; i++) {
                var housenum = parseSemiNumber(prop[i]);
                if (housenum !== null && housenum < min) min = housenum;
                if (housenum !== null && housenum > max) max = housenum;
            }
        }
        if (isFinite(min) && isFinite(max)) {
            min = min.toString().length;
            max = max.toString().length;
            for (var i = min; i <= max; i++) {
                var len = i;
                if (!used[len]) {
                    used[len] = true;
                    var numToken = '';
                    while (len--) numToken += '#';
                    ranges.push(numToken);
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
    var texts = doc._text.split(',');
    for (var x = 0; x < texts.length; x++) {
        // push tokens with replacements
        var tokens = tokenize(token.replaceToken(replacer, texts[x]));
        if (!tokens.length) continue;

        // push tokens with housenum range token if applicable
        var range = getHousenumRange(doc);
        if (range) {
            var l = range.length;
            while (l--) {
                add([range[l]].concat(tokens));
                add(tokens.concat([range[l]]));
            }
        } else {
            add(tokens);
        }
    }
    function add(tokens) {
        var key = tokens.join(' ');
        if (!tokens.length || uniqTexts[key]) return;
        uniqTexts[key] = true;
        indexableText.push(tokens);
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
    var texts = token.replaceToken(replacer, doc._text).split(',');
    var a = texts.length;
    var fails = 0;
    while (a--) {
        var text = unidecode(texts[a].toLowerCase()).toLowerCase().trim();
        var textHash = {
            32: true, // ' ' for spaces
            35: true  // '#' for housenums
        };
        var b = text.length;
        while (b--) textHash[text.charCodeAt(b)] = true;
        var c = subq.length;
        while (c--) if (!textHash[subq.charCodeAt(c)]) {
            fails++;
            break;
        }
    }
    // if subq fails to match every single text, consider it
    // an fnv1a false positive for this feature.
    return fails !== texts.length;
}

function parseSemiNumber(_) {
    _ = parseInt((_ || '').replace(/[^\d]/g,''),10);
    return isNaN(_) ? null : _;
}

// # [FNV](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function)
// hash is a simple non-cryptographic hash.
//
// FNV-1a hash.
// Defaults to a 32 bit unsigned int from a string. Optional second argument
// specifies number of bits to be kept, clearing out the remaining as 0s.
// For 32-bit: offset = 2166136261, prime = 16777619.
function fnv1a(str, bits) {
    var hash = 0x811C9DC5;
    if (str.length) for (var i = 0; i < str.length; i++) {
        hash = hash ^ str.charCodeAt(i);
        // 2**24 + 2**8 + 0x93 = 16777619
        hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1);
    }
    if (bits) {
        var clear = 32 - bits;
        hash = hash >>> clear << clear;
    }
    return hash >>> 0;
}

function encodeTerm(text) {
    var encoded = fnv1a(unidecode(text).toLowerCase().trim());
    // Ensures encoded term does not collide with ids 0 or 1 in freq
    // index. These ids are reserved for count + maxscore stat values.
    if (encoded <= 1) encoded += 2;
    return encoded;
}

// Generate all potential permutations of an array of tokenized
// terms (strings) or term IDs (term id numbers).
module.exports.permutations = permutations;
function permutations(terms, weights) {
    var length = terms.length;
    var permutations = [];
    for (var i = 0; i < terms.length; i++) {
        for (var j = 0; j <= i; j++) {
            var from = j;
            var to = j+(terms.length-i);
            var permutation = terms.slice(from, to);

            // Mark permutations that include the final term as
            // an "ender" -- such that these permutations may
            // match degens.
            permutation.ender = terms.length === to;

            // Add a bitmask that represents the slice of terms.
            var mask = 0;
            for (var k = from; k < to; k++) mask = mask | (1 << k);
            permutation.mask = mask;

            // Optionally add a relev attribute to the permutation array.
            if (weights) {
                permutation.relev = 0;
                var permutationWeights = weights.slice(j,j+(terms.length-i));
                var k = permutationWeights.length;
                while (k--) permutation.relev += permutationWeights[k];
                permutation.relev = Math.round(permutation.relev * 5) / 5;
            }

            permutations.push(permutation);
        }
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
        if (text.indexOf('#') !== -1 && !(/(^#|#$)/).test(text)) continue;

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
    var perms = permutations(tokens, getWeights(tokens, freq));
    var i = perms.length;
    var l = 0;

    perms.sort(sortByRelev);
    while (i--) {
        if (perms[i].relev < 0.5) continue;

        // Encode canonical phrase.
        var toEncode = [];
        toEncode.push({
            degen: false,
            relev: perms[i].relev,
            text: perms[i].join(' '),
            phrase: encodePhrase(perms[i].join(' '), false)
        });

        // Encode degens of phrase.
        var degens = getPhraseDegens(toEncode[0].text);
        l = degens.length;
        while (l--) toEncode.push({
            degen: true,
            relev: perms[i].relev,
            text: degens[l],
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
    return a.relev - b.relev;
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
        if (tokens[i].charAt(0) === '#') {
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

    // Iterate through subsets of each term to generate degens.
    for (var i = 1; !i || (i < length && length - i > 0); i++) {
        var degen = text.substr(0, i);
        if (degen.charAt(degen.length-1) === ' ') continue;
        if (/^#+$/.test(degen)) continue;
        degens.push(degen);
    }

    return degens;
};

module.exports.numTokenize = numTokenize;
function numTokenize(text) {
    if (typeof text === 'string') text = tokenize(text);
    var numTokenized = [];
    for (var i = 0; i < text.length; i++) {
        var replaced = text.slice(0);
        var num = parseSemiNumber(text[i]);
        if (num !== null) {
            var len = num.toString().length;
            var numToken = '';
            while (len--) numToken += '#';
            replaced[i] = numToken;
            numTokenized.push(replaced);
        }
    }
    return numTokenized;
}

