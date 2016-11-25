var termops = require('./util/termops');
var bb = require('./util/bbox');

// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, query, options, callback) {
    options = options || {};
    options.autocomplete = options.autocomplete || false;
    options.bbox = options.bbox || false;
    var getter = source.getGeocoderData.bind(source);
    var loadall = source._geocoder.loadall.bind(source._geocoder);

    // if not in bbox, skip
    if (options.bbox) {
        var intersects = bb.intersect(options.bbox, source.bounds);
        if (!intersects) return callback(null, []);
    }

    // For a given query, generate all permutations of the query where tokens
    // have and have not been replaced. For example, for the query:
    //
    // - Mountain Drive
    //
    // The resulting queries might be:
    //
    // - Mountain Drive
    // - Mt Drive
    // - Mountain Dr
    // - Mt Dr
    var queries = termops.replaceTokenPermutations(source.token_replacer, query, termops.tokenize(query).length);
    var subqueries = [];
    queries.forEach(function(query) {
        // Split a query string into an array of tokens. Splits phrases along
        // whitespace and other word boundaries. Example:
        //
        // "Lake View Drive" => ["Lake", "View", "Drive"]
        var tokenized = termops.tokenize(query);

        // Get all subquery permutations from the query. Generates subquery
        // objects which represent a grouping of tokens that may be considered
        // together to represent an individual feature. Example:
        //
        // ["New", "York", "Avenue"] =>
        // [["New", "York", "Avenue"]]
        // [["New"], ["York", "Avenue"]]
        // [["New", "York"], ["Avenue"]]
        // [["New"], ["York"], ["Avenue"]]
        var _subqueries = termops.permutations(tokenized);

        if (source.geocoder_address) {
            var numTokenized = termops.numTokenize(tokenized, source.version);
            for (var i = 0; i < numTokenized.length; i++) {
                _subqueries = _subqueries.concat(termops.permutations(numTokenized[i]));
            }
        }

        _subqueries = _subqueries.concat(subqueries);

        _subqueries = termops.uniqPermutations(_subqueries);
        for (var l = 0; l < _subqueries.length; l++) {
            var phrase = termops.encodePhrase(_subqueries[l], options.autocomplete ? _subqueries[l].ender : false);
            _subqueries[l].text = termops.encodableText(_subqueries[l]);
            _subqueries[l].phrase = phrase;
            _subqueries[l].weight = _subqueries[l].length/tokenized.length;
        }

        subqueries = subqueries.concat(_subqueries);
    });

    subqueries = deDuplicateSubqueries(subqueries);

    loadall(getter, 'freq', [1], function(err) {
        if (err) return callback(err);

        // load up scorefactor used at indexing time.
        // it will be used to scale scores for approximated
        // cross-index comparisons.
        var scorefactor = (source._geocoder.get('freq', 1)||[0])[0] || 1;

        var results = [];

        var l = subqueries.length;
        while (l--) {
            if (!source._dictcache.hasPhrase(subqueries[l])) continue;
            // Augment permutations with matched grids,
            // index position and weight relative to input query.
            subqueries[l].scorefactor = scorefactor;
            subqueries[l].getter = getter;
            subqueries[l].loadall = loadall;
            subqueries[l].cache = source._geocoder;
            subqueries[l].idx = source.idx;
            subqueries[l].zoom = source.zoom;
            subqueries[l].nmask = 1 << source.ndx;
            subqueries[l].bmask = source.bmask;
            results.push(subqueries[l]);
        }

        return callback(null, results);
    });
};

module.exports.deDuplicateSubqueries = deDuplicateSubqueries;
function deDuplicateSubqueries(items, key) {
    var set = {};
    var deduped = [];

    items.forEach(function(item, itemIndex) {
        var key = item.text + item.mask + item.ender;
        if (!(key in set)) {
            deduped.push(item);
            set[key] = true;
        }
    });

    return deduped;
}

