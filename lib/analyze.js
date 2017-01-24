var uniq = require('./util/uniq');
var decode = require('./util/grid').decode;

module.exports = function analyze(source, callback) {
    var s = source;
    var stats = {
        total: 0,
        degen: 0,
        ender: 0,
        byScore: {},
        byRelev: {}
    };
    for (var i = 0; i < 7; i++) stats.byScore[i] = 0;
    for (var j = 0.4; j <= 1; j = j + 0.2) stats.byRelev[j.toFixed(1)] = 0;

    source._geocoder.unloadall('grid');

    getStats(Math.pow(16,4), callback);

    function getStats(i, callback) {
        if (i < 0) return callback(null, stats);
        s.getGeocoderData('grid', i, function(err, buffer) {
            if (err) return callback(err);

            // @TODO should getGeocoderData return a 0-length buffer in this case?
            s._geocoder.loadSync(buffer || new Buffer(0), 'grid', i);
            var ids = s._geocoder.list('grid', i);
            ids.sort();
            while (ids.length) {
                var id = ids.shift();
                var grids = s._geocoder.get('grid', id);
                var rels = grids.length;

                // Verify that relations are unique.
                if (rels !== uniq(grids).length) {
                    return callback(new Error('Duplicate grids found for phrase: ' + id));
                }

                var l = grids.length;
                while (l--) {
                    var grid = decode(grids[l]);
                    stats.total++;

                    // degen vs ender
                    if (id % 2 === 0) {
                        stats.ender++;
                    } else {
                        stats.degen++;
                    }

                    stats.byScore[grid.score]++;
                    stats.byRelev[grid.relev.toFixed(1)]++;
                }
            }

            setImmediate(function() {
                getStats(--i, callback);
            });
        });
    }
};

