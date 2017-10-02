var uniq = require('./util/uniq');
var decode = require('./util/grid').decode;

module.exports = function analyze(source, callback) {
    var s = source;
    var stats = {
        total: 0,
        byScore: {},
        byRelev: {}
    };
    for (var i = 0; i < 7; i++) stats.byScore[i] = 0;
    for (var j = 0.4; j <= 1; j = j + 0.2) stats.byRelev[j.toFixed(1)] = 0;

    var ids = s._geocoder.grid.list();
    ids.sort();
    while (ids.length) {
        var id = ids.shift();
        var grids = s._geocoder.grid.get(id[0], id[1]);
        var rels = grids.length;

        // Verify that relations are unique.
        if (rels !== uniq(grids).length) {
            return callback(
                new Error('Duplicate grids found for phrase: ' + id)
            );
        }

        var l = grids.length;
        while (l--) {
            var grid = decode(grids[l]);
            stats.total++;
            stats.byScore[grid.score]++;
            stats.byRelev[grid.relev.toFixed(1)]++;
        }
    }

    return callback(null, stats);
};
