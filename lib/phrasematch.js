var termops = require('./util/termops');
var token = require('./util/token');
var bb = require('./util/bbox');
var cl = require('./util/closest-lang');

/**
* phrasematch
*
* @param {Object} source a Geocoder datasource
* @param {Array} query a list of terms composing the query to Carmen
* @param {Function} callback called with `(err, features, result, stats)`
*/
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = options.autocomplete || false;
    options.bbox = options.bbox || false;
    var tokenized = termops.tokenize(token.replaceToken(source.token_replacer, query));

    // if not in bbox, skip
    if (options.bbox) {
        var intersects = bb.intersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, new PhrasematchResult([], source));
    }

    // Get all subquery permutations from the query
    var subqueries = termops.permutations(tokenized);

    // Include housenum tokenized permutations if source has addresses
    if (source.geocoder_address) {
        var numTokenized = termops.numTokenize(tokenized, source.version);
        for (var i = 0; i < numTokenized.length; i++) {
            subqueries = subqueries.concat(termops.permutations(numTokenized[i]));
        }
    }

    subqueries = termops.uniqPermutations(subqueries);
    var dawg = source._dictcache;

    // load up scorefactor used at indexing time.
    // it will be used to scale scores for approximated
    // cross-index comparisons.
    var scorefactor = (source._geocoder.freq.get('__MAX__')||[0])[0] || 1;

    var phrasematches = [];

    var l = subqueries.length;
    while (l--) {
        var subquery = subqueries[l];
        var text = termops.encodableText(subquery);
        var exactMatch = false;
        if (text) {
            var scanPrefix = subquery.ender && options.autocomplete;

            // only try text normalization if this index has it enabled, and if either we're not doing autocomplete or, if we are, the text is at least 3 chars long
            // (so th process isn't totally batshit slow)
            var tryNormalization = source.use_normalization_cache && (!scanPrefix || text.length >= 3);

            var dawgMatch = tryNormalization ?
                dawg.hasPhraseOrNormalizations(text, scanPrefix) :
                (latinCheck(query) ? dawg.hasPhrase(text, scanPrefix, true) : dawg.hasPhrase(text, scanPrefix, false));

            if (!dawgMatch) continue;

            exactMatch = dawgMatch.exact_match;

            var variants;
            if (!tryNormalization) {
                variants = [{text: dawgMatch.text, prefix: scanPrefix}];
            } else if (scanPrefix) {
                variants = [{text: subquery.join(' '), prefix: scanPrefix}];
                for (let v of dawgMatch.normalizations) {
                    variants.push({text: v, prefix: false});
                }
            } else {
                variants = dawgMatch.normalizations.length ? dawgMatch.normalizations.map((n) => { return {text: n, prefix: scanPrefix}; }) : [{text: subquery.join(' '), prefix: scanPrefix}];
            }

            for (let variant of variants) {
                // Augment permutations with matched grids,
                // index position and weight relative to input query.
                var phrase = termops.encodePhrase(variant.text);
                // use the original subquery to calculate weight, in case the variant has a different cardinality
                var weight = subquery.length / tokenized.length;

                var prefix = (variant.prefix && !(source.geocoder_address && termops.isAddressNumber(text)));

                var languages;
                if (options.language) {
                    languages = [options.language[0]];
                } else {
                    // this may not be what we want to do here
                    // if effectively treats 'default' as its own language, and a lack of
                    // specified language flag as a search over this language
                    // we could alternatively search all languages here by setting this field
                    // to undefined, or emply some other strategy
                    languages = ['default'];
                }
                languages = languages.map(function(l) {
                    // use the built-in language if we have it
                    if (source.lang.lang_map.hasOwnProperty(l)) {
                        return source.lang.lang_map[l];
                    } else {
                        var label = cl.closestLangLabel(l, source.lang.lang_map);
                        return source.lang.lang_map[label || 'unmatched'];
                    }
                });
                phrasematches.push(new Phrasematch(variant.text.split(' '), weight, subquery.mask, phrase, scorefactor, source.idx, source._geocoder.grid, source.zoom, prefix, languages, exactMatch));
            }
        }
    }

    return callback(null, new PhrasematchResult(phrasematches, source));
};

module.exports.PhrasematchResult = PhrasematchResult;
function PhrasematchResult(phrasematches, source) {
    this.phrasematches = phrasematches;
    this.idx = source.idx;
    this.nmask = 1 << source.ndx;
    this.bmask = source.bmask;
}

module.exports.latinCheck = latinCheck;
function latinCheck(query) {
    var regexp = /[A-z\u00C0-\u00ff]+/g;
    var latinFlag = regexp.test(query) ? true : false;
    return latinFlag;
};

module.exports.Phrasematch = Phrasematch;
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom, prefix, languages, exactMatch) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.scorefactor = scorefactor;
    this.prefix = prefix;
    this.languages = languages;

    // Attributes used by carmen-cache.
    // All phrasematches from the same source have the same values.
    this.idx = idx;
    this.cache = cache;
    this.zoom = zoom;
    this.exactMatch = exactMatch;
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom, this.prefix, this.languages, this.exactMatch);
};

