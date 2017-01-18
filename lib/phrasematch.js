var termops = require('./util/termops');
var token = require('./util/token');
var bb = require('./util/bbox');

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
    var getter = source.getGeocoderData.bind(source);
    var loadall = source._geocoder.loadall.bind(source._geocoder);

    // if not in bbox, skip
    if (options.bbox) {
        var intersects = bb.intersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, new PhrasematchResult([], getter, loadall, source));
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

    loadall(getter, 'freq', [1], function(err) {
        if (err) return callback(err);

        // load up scorefactor used at indexing time.
        // it will be used to scale scores for approximated
        // cross-index comparisons.
        var scorefactor = (source._geocoder.get('freq', 1)||[0])[0] || 1;

        var phrasematches = [];

        var l = subqueries.length;
        while (l--) {
            var subquery = subqueries[l];
            var text = termops.encodableText(subquery);
            if (text) {
                if (!source._dictcache.hasPhrase(text, subquery.ender)) continue;
                // Augment permutations with matched grids,
                // index position and weight relative to input query.
                var phrase = termops.encodePhrase(subquery, options.autocomplete ? subquery.ender : false);
                var weight = subquery.length / tokenized.length;
                phrasematches.push(new Phrasematch(subquery, weight, subquery.mask, phrase, scorefactor, source.idx, source._geocoder, source.zoom));
            }
        }

        return callback(null, new PhrasematchResult(phrasematches, getter, loadall, source));
    });
};

module.exports.PhrasematchResult = PhrasematchResult;
function PhrasematchResult(phrasematches, getter, loadall, source) {
    this.phrasematches = phrasematches;
    this.getter = getter;
    this.loadall = loadall;
    this.idx = source.idx;
    this.nmask = 1 << source.ndx;
    this.bmask = source.bmask;
}

module.exports.Phrasematch = Phrasematch;
function Phrasematch(subquery, weight, mask, phrase, scorefactor, idx, cache, zoom) {
    this.subquery = subquery;
    this.weight = weight;
    this.mask = mask;
    this.phrase = phrase;
    this.scorefactor = scorefactor;

    // Attributes used by carmen-cache.
    // All phrasematches from the same source have the same values.
    this.idx = idx;
    this.cache = cache;
    this.zoom = zoom;
}

Phrasematch.prototype.clone = function() {
    return new Phrasematch(this.subquery.slice(), this.weight, this.mask, this.phrase, this.scorefactor, this.idx, this.cache, this.zoom);
};

