var fnv1a = require('./fnv'),
    mp20 = Math.pow(2,20),
    unidecode = require('unidecode');
var idPattern = /^(\S+)\.([0-9]+)$/;
var token = require('./token');

module.exports.address = address;
module.exports.maskAddress = maskAddress;

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

// Generate degenerates from a given token.
module.exports.degens = function(token) {
    var length = token.length;
    var tokenid = fnv1a(token, 28);
    var degens = [tokenid, tokenid];
    for (var i = 1; !i || (i < length && length - i > 2); i++) {
        var degen = fnv1a(token.substr(0, length - i), 28);
        degens.push(degen);
        degens.push(tokenid + Math.min(i,15));
    }
    return degens;
};

// Converts text into an array of search term hash IDs.
module.exports.terms = function(tokens) {
    var terms = []; // tokenize(text);
    for (var i = 0; i < tokens.length; i++) terms[i] = fnv1a(tokens[i], 28);
    return terms;
};

// Converts text into an array of search term hash IDs with encoded integer
// weights based on IDF term frequency.
module.exports.termsWeighted = function(tokens, freq) {
    var terms = []; // tokenize(text);
    var weights = [];
    var total = freq[0][0];
    var termfreq;
    var maxweight = 0;

    for (var i = 0; i < tokens.length; i++) {
        terms[i] = fnv1a(tokens[i], 28);
        termfreq = freq[terms[i]] ? freq[terms[i]][0] : 1;
        weights[i] = total/termfreq;
        maxweight = Math.max(maxweight, weights[i]);
    }
    for (i = 0; i < tokens.length; i++) {
        var weight = Math.floor(weights[i]/maxweight*15);
        terms[i] = terms[i] + (weight === 0 ? 1 : weight)
    }
    return terms;
};

// Map terms to their original token.
module.exports.termsMap = function(tokens) {
    // var tokens = tokenize(text);
    var mapped = {};
    for (var i = 0; i < tokens.length; i++) mapped[fnv1a(tokens[i], 28)] = tokens[i];
    return mapped;
};

// Converts text into a name ID.
// Encodes a modifier based on the first term in the last 8 bits to help cluster
// phrases in shards. Reduces the extent to which phrase shards from fan out,
// reducing IO for real life queries.
module.exports.phrase = function(tokens, cluster) {
    var a = fnv1a(tokens.join(' ')) % mp20;
    var b = fnv1a(cluster) >>> 20 << 20 >>> 0;
    return a + b;
};

// Generate a hash id from a feature ID. Fits within a 25-bit integer space
// to be encoded cleanly into zxy values (see ops.zxy).
module.exports.feature = function(id) {
    return Math.abs(parseInt(id,10)) % Math.pow(2,25);
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
        var numeric = query
            .split(/[^\.\-\d+\w+]/i)
            .filter(function(t) { return t.length; });
        if (numeric.length === 2) {
            numeric = numeric
                .map(function(t) {
                    if (!(/^[0-9\.\-]+$/).test(t)) return false;
                    var float = parseFloat(t);
                    return !isNaN(float) ? float : false;
                })
                .filter(function(t) {
                    return t !== false && !isNaN(t);
                });
        }
        if (numeric.length === 2) return numeric;
    }

    var normalized = unidecode(query)
        .toLowerCase()
        .replace(/[\^]+/g, '')
        .replace(/[,]+/g, ' ')
        .replace(/[^\w+^\s+^-]/gi, '')
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
        if ((mask & Math.pow(2, i)) === 0) {
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

// Takes a geocoder_tokens token mapping and a text string and returns
// an array of one or more arrays of tokens that should be indexed.
module.exports.getIndexableText = function(replacer, text) {
    var uniqTexts = {};
    var indexableText = [];
    var texts = text.split(',');
    // Loop over all phrases.
    for (var x = 0; x < texts.length; x++) {
        // Loop 2x per phrase, generating a canonical version
        // and token-mapped version. The uniqTexts hash ensures
        // phrases are indexed uniquely.
        for (var mapTokens = 0; mapTokens < 2; mapTokens++) {
            var tokens = mapTokens ?
                tokenize(token.replaceToken(replacer, texts[x])) :
                tokenize(texts[x]);
            var key = tokens.join(' ');
            if (!tokens.length || uniqTexts[key]) continue;
            uniqTexts[key] = true;
            indexableText.push(tokens);
        }
    }
    return indexableText;
};
