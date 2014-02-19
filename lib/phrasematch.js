var termops = require('./util/termops'),
    ops = require('./util/ops'),
    uniq = require('./util/uniq'),
    Relev = require('./util/relev');

var idmod = Math.pow(2,25);

// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {String} input search query
// @param {Object} options
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, query, options, callback) {
    var idx = source._geocoder.idx,
        dbname = source._geocoder.name,
        terms = termops.terms(termops.tokenize(query)),
        relevs = {},
        // statistics, stored as
        // [call count, result length, call time]
        stats = {
            degen: [0,0,0],
            phrase: [0,0,0],
            term: [0,0,0],
            relevd: [0,0,0],
            grid: [0,0,0]
        },
        // maps terms to first index of occurrence in input query.
        queryidx = {},
        // maps terms to index(es) in a reason bitmask in input query.
        querymask = {},
        // maps terms to degenerate distance from canonical terms.
        querydist = {},
        docrelev = {};

    options = options || {};
    options.threshold = options.threshold !== undefined ? options.threshold : 0.75;

    getDegen(terms, [], 0, function degenDone(err, terms) {
        if (err) return callback(err);
        getPhrases(terms, function phrasesDone(err, phrases) {
            if (err) return callback(err);
            getTerms(phrases, function termsDone(err, terms) {
                if (err) return callback(err);
                var sets = getSets(phrases);
                getgrids(sets, function gridsDone(err, features, result) {
                    if (err) return callback(err);
                    return callback(null, features, result, stats);
                });
            });
        });
    });

    // First, for all of the terms searched, get degenerate variations
    // from the geocoder source.
    //
    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Array} result a list of results so far
    // @param {Number} idx the index of iterations of this function - the
    // depth of this function's recursion
    // @param {Function} callback called with `(err, result)`
    function getDegen(queue, result, idx, callback) {
        if (!queue[idx]) {
            stats.degen[2] = stats.degen[2] && (+new Date() - stats.degen[2]);
            stats.degen[1] = result.length;
            return callback(null, result);
        }

        stats.degen[0]++;
        stats.degen[2] = +new Date();

        source._geocoder.getall(source.getGeocoderData.bind(source), 'degen', [queue[idx]], mapTerms);

        function mapTerms(err, termdist) {
            if (err) return callback(err);

            termdist.sort(ops.sortDegens);

            for (var i = 0; i < termdist.length && i < 10; i++) {
                var term = termdist[i] >>> 4 << 4 >>> 0;
                queryidx[term] = queryidx[term] !== undefined ? queryidx[term] : idx;
                querymask[term] = (querymask[term]||0) + (1<<idx);
                querydist[term] = termdist[i]%16;
                result.push(term);
            }

            return getDegen(queue, result, idx+1, callback);
        }
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getPhrases(queue, callback) {
        stats.phrase[0]++;
        stats.phrase[2] = +new Date();
        source._geocoder.getall(source.getGeocoderData.bind(source), 'term', queue, function(err, result) {
            if (err) return callback(err);
            stats.phrase[2] = stats.phrase[2] && (+new Date() - stats.phrase[2]);
            stats.phrase[1] = result.length;
            return callback(null, result);
        });
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getTerms(queue, callback) {
        stats.term[0]++;
        stats.term[2] = +new Date();
        source._geocoder.getall(source.getGeocoderData.bind(source), 'phrase', queue, function(err, result) {
            if (err) return callback(err);
            stats.term[2] = stats.term[2] && (+new Date() - stats.term[2]);
            stats.term[1] = result.length;
            return callback(null, result);
        });
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @returns {Array} list of sets that match with this phrase
    function getSets(phrases) {
        stats.relevd[2] = +new Date();
        var result = [];
        for (var a = 0; a < phrases.length; a++) {
            var id = phrases[a];
            var data = source._geocoder.get('phrase', id);
            if (!data) throw new Error('Failed to get phrase');

            // relev each feature:
            // - across all feature synonyms, find the max relev of the sum
            //   of each synonym's terms based on each term's frequency of
            //   occurrence in the dataset.
            // - for the max relev also store the 'reason' -- the index of
            //   each query token that contributed to its relev.
            var term = 0,
                relev = 0,
                total = 0,
                count = 0,
                reason = 0,
                termmask = -1,
                lastidx = -1,
                termidx = -1,
                termdist = 0,
                chardist = 0;

            var text = data;
            for (var i = 0; i < data.length; i++) {
                total += data[i] % 16;
            }

            if (total < 0) throw new Error('Bad freq total ' + total);

            for (i = 0; i < text.length; i++) {
                term = text[i] >>> 4 << 4 >>> 0;
                if (!querymask[term]) {
                    if (relev !== 0) {
                        break;
                    } else {
                        continue;
                    }
                }
                termidx = queryidx[term];
                termmask = querymask[term];
                termdist = querydist[term];
                if (relev === 0 || termidx === lastidx + 1) {
                    relev += (text[i]%16)/total;
                    reason = reason | termmask;
                    chardist += termdist;
                    lastidx = termidx;
                    count++;
                }
            }

            // relev represents a score based on comparative term weight
            // significance alone. If it passes this threshold check it is
            // adjusted based on degenerate term character distance (e.g.
            // degens of higher distance reduce relev score).
            if (relev > options.threshold) {
                result.push(id);
                relev = (relev > 0.99 ? 1 : relev) - (chardist * 0.01);
                relevs[id] = {
                    count: count,
                    relev: relev,
                    reason: reason,
                    // encode relev, reason count together
                    tmprelev: relev * 1e6 + count
                };
            }
        }

        result = uniq(result);
        stats.relevd[2] = +new Date() - stats.relevd[2];
        stats.relevd[1] = result.length;
        return result;
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getgrids(queue, callback) {
        stats.grid[0]++;
        stats.grid[2] = +new Date();

        source._geocoder.getall(source.getGeocoderData.bind(source), 'grid', queue, function(err) {
            if (err) return callback(err);

            var result = [],
                features = {},
                id, relev, grids,
                grid, feat;

            for (var a = 0; a < queue.length; a++) {
                id = queue[a];
                relev = relevs[id];
                grids = source._geocoder.get('grid', id);

                for (var i = 0; i < grids.length; i++) {
                    grid = grids[i];
                    feat = grid % idmod;
                    if (!features[feat] || docrelev[feat] < relev.tmprelev) {
                        features[feat] = new Relev(feat,
                            relev.relev,
                            relev.reason,
                            relev.count,
                            idx,
                            dbname,
                            idx * 1e14 + feat);
                        docrelev[feat] = relev.tmprelev;
                    }
                }

                result.push.apply(result, grids);
            }

            stats.grid[2] = stats.grid[2] && (+new Date() - stats.grid[2]);
            stats.grid[1] = result.length;
            return callback(null, features, result);
        });
    }
};
