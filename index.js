var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Step = require('step');
var basepath = path.resolve(__dirname + '/tiles');
var sm = new (require('sphericalmercator'))();

// Split on a specified delimiter but retain it as a suffix in the parts,
// e.g. "foo st washington dc", "st" => ["foo st", "washington dc"]
function keepsplit(str, delim) {
    var rev = function(str) {
        return str.split('').reverse().join('');
    };
    return rev(str)
        .split(new RegExp('\\s(?=' + delim
            .map(rev)
            .map(function(s) { return s + '\\s' })
            .join('|')  + ')', 'i'))
        .map(rev)
        .reverse();
};

// For a given z,x,y find its parent tile.
function pyramid(z, x, y, parent) {
    var depth = z - parent;
    var side = Math.pow(2, depth);
    return [z - depth, Math.floor(x / side), Math.floor(y / side)];
};

// Resolve the UTF-8 encoding stored in grids to simple number values.
function resolveCode(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
};

function toChar(key) {
    key += 32;
    if (key >= 34) key++;
    if (key >= 92) key++;
    return String.fromCharCode(key);
};

function Carmen(options) {
    if (!options) throw new Error('Carmen options required.');
    this.indexes = _(options).reduce(function(memo, db, key) {
        var dbname = key;
        memo[key] = _(db).defaults({
            context: true,
            query: true,
            weight: 1,
            sortBy: function(data) { return data.score || 0 },
            filter: function(token) { return true },
            map: function(data) {
                delete data.search;
                delete data.rank;
                data.type = data.type || dbname;
                if (data.bounds) data.bounds = data.bounds.split(',').map(parseFloat);
                return data;
            }
        });
        return memo;
    }, {});
};

Carmen.S3 = function() { return require('./api-s3') };
Carmen.MBTiles = function() { return require('./api-mbtiles') };

Carmen.prototype._open = function(callback) {
    if (!_(this.indexes).all(function(d) { return d.source.open }))
        return callback(new Error('DB not open.'));

    if (this._opened) return callback();

    var carmen = this;
    var remaining = _(this.indexes).size();
    _(this.indexes).each(function(db) {
        db.source.getInfo(function(err, info) {
            if (info) db.zoom = info.maxzoom;
            if (err) {
                remaining = -1
                return callback(err);
            }
            if (--remaining === 0) {
                carmen.zooms = _(carmen.indexes).chain()
                    .pluck('zoom')
                    .uniq()
                    .sortBy(function(z) { return z })
                    .value();
                carmen._opened = true;
                return callback();
            }
        });
    });
};

Carmen.prototype.tokenize = function(query) {
    query = query.split(/,| in | near |\n|;/i);

    // lon, lat pair.
    if (query.length === 2 &&
        _(query).all(function(part) { return !isNaN(parseFloat(part)) }))
        return query.map(parseFloat);

    // text query.
    var tokens = _(query).chain()
        // Don't attempt to handle streets for now.
        // .map(function(str) { return keepsplit(str, ['nw','ne','sw','se']); })
        // .flatten()
        // .map(function(str) { return keepsplit(str, ['st','ave','dr']); })
        // .flatten()
        // 2 letter codes that look like postal.
        // .map(function(str) {
        //     var matches = str.match(/\s[a-z]{2}$/i);
        //     if (matches && str !== matches[0]) return [str, matches[0]];
        //     else return str;
        // })
        // .flatten()
        // trim, lowercase.
        // For whatever reason, sqlite FTS does not like dashes in search
        // tokens, e.g. "foo-bar" does not match anything, where "foo bar" does.
        .map(function(str) {
            while (str.substring(0,1) == ' ')
                str = str.substring(1, str.length);
            while (str.substring(str.length-1,str.length) == ' ')
                str = str.substring(0, str.length-1);
            return str.toLowerCase().replace('-', ' ');
        })
        .compact()
        .value();
    return tokens;
};

Carmen.prototype.context = function(lon, lat, callback) {
    var indexes = this.indexes;
    var carmen = this;
    var scan = [
        [0,0],
        [0,1],
        [0,-1],
        [1,0],
        [1,1],
        [1,-1],
        [-1,0],
        [-1,1],
        [-1,-1]
    ];

    Step(function() {
        carmen._open(this);
    }, function(err) {
        if (err) return callback(err);

        var group = this.group();
        _(indexes).each(function(d, type) {
            if (!d.context) return;
            var xyz = sm.xyz([lon,lat,lon,lat], d.zoom);
            var next = group();
            d.source.getGrid(d.zoom, xyz.minX, xyz.minY, function(err, grid) {
                if (err) return next(err);

                var resolution = 4;
                var px = sm.px([lon,lat], d.zoom);
                var y = Math.round((px[1] % 256) / resolution);
                var x = Math.round((px[0] % 256) / resolution);
                x = x > 63 ? 63 : x;
                y = y > 63 ? 63 : y;
                var key, sx, sy;
                for (var i = 0; i < scan.length; i++) {
                    sx = x + scan[i][0];
                    sy = y + scan[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[resolveCode(grid.grid[sy].charCodeAt(sx))];
                    if (key) break;
                }

                if (!key) return next();

                var data = d.map(grid.data[key]);
                data.id = data.id || type + '.' + key;
                if ('lon' in data && 'lat' in data) return next(null, data);
                carmen.centroid(type + '.' + key, function(err, lonlat) {
                    if (err) return next(err);
                    data.lon = lonlat[0];
                    data.lat = lonlat[1];
                    return next(null, data);
                });

            });
        });
    }, function(err, context) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        return callback(null, _(context).chain().compact().reverse().value());
    });
};

// Retrieve the context for a feature given its id in the form [type].[id].
Carmen.prototype.contextByFeature = function(id, callback) {
    this.centroid(id, function(err, lonlat) {
        if (err) return callback(err);
        this.context(lonlat[0], lonlat[1], callback);
    }.bind(this));
};

// Get the [lon,lat] of a feature given its id in the form [type].[id].
// Looks up a point in the feature geometry using a point from a central grid.
Carmen.prototype.centroid = function(id, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.centroid(id, callback);
    }.bind(this));

    var type = id.split('.').shift();
    var id = id.split('.').pop();
    var carmen = this;
    var indexes = this.indexes;
    var c = {};

    Step(function() {
        indexes[type].source.search(null, id, this);
    }, function(err, row) {
        if (err) throw err;
        if (!row || !row.length) return this();
        row = row.shift();
        var rows = row.zxy.map(function(zxy) {
            zxy = zxy.split('/');
            return _({
                z: zxy[0] | 0,
                x: zxy[1] | 0,
                y: (Math.pow(2,zxy[0]|0) - zxy[2] - 1) | 0
            }).defaults(row);
        });
        c.z = rows[0].z;
        c.x = _(rows).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.y = _(rows).chain()
            .filter(function(row) { return row.x === c.x })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        indexes[type].source.getGrid(c.z,c.x,c.y,this);
    }, function(err, grid) {
        if (err) return callback(err);
        if (!grid) return callback(new Error('Grid does not exist'));

        var chr = toChar(grid.keys.indexOf(id));
        var xy = [];
        _(grid.grid).each(function(row, y) {
            if (row.indexOf(chr) === -1) return;
            for (var x = 0; x < 64; x++) if (row[x] === chr) xy.push({x:x,y:y});
        });
        c.px = _(xy).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.py = _(xy).chain()
            .filter(function(xy) { return xy.x === c.px })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        callback(null, sm.ll([
            (256*c.x) + (c.px*4),
            (256*c.y) + (c.py*4)
        ], c.z));
    });
};

Carmen.prototype.geocode = function(query, callback) {
    if (!this._opened) return this._open(function(err) {
        if (err) return callback(err);
        this.geocode(query, callback);
    }.bind(this));

    var indexes = this.indexes;
    var zooms = this.zooms;
    var types = Object.keys(indexes);
    var data = { query: this.tokenize(query) };
    var carmen = this;

    // lon,lat pair. Provide the context for this location.
    if (data.query.length === 2 && _(data.query).all(_.isNumber)) {
        return this.context(data.query[0], data.query[1], function(err, context) {
            if (err) return callback(err);
            data.results = context.length ? [context] : [];
            return callback(null, data);
        });
    }

    // keyword search. Find matching features.
    Step(function() {
        var group = this.group();
        _(indexes).each(function(db, dbname) {
            _(data.query||[]).each(function(t, i) {
                // Skip tokens that do not pass filter callback.
                if (!db.filter(t)) return;

                var next = group();
                db.source.search(t, null, function(err, rows) {
                    if (err) return next(err);
                    rows = rows.map(function(row) {
                        row.token = t;
                        row.db = dbname;
                        row.i = i;
                        return row;
                    });
                    next(err, rows);
                });
            });
        });
    }, function(err, rows) {
        if (err) throw err;

        var results = _(rows).chain()
            .flatten()
            .reduce(function(memo, row) {
                // Reward exact matches.
                var score = (_(row.text.split(',')).chain()
                    .map(function(part) { return part.toLowerCase().replace(/^\s+|\s+$/g, ''); })
                    .any(function(part) { return part === row.token; })
                    .value() ? 1 : 0.5) * indexes[row.db].weight;
                row.zxy.forEach(function(zxy) {
                    memo[zxy] = memo[zxy] || [];
                    memo[zxy].push({
                        i:row.i,
                        id:row.id,
                        db:row.db,
                        text:row.text,
                        token:row.token,
                        score:score
                    });
                });
                return memo;
            }, {})
            .reduce(function(memo, rows, zxy) {
                if (rows.length <= 1) return (memo[zxy] = rows) && memo;
                rows = _(rows).chain()
                    .sortBy(function(r) { return r.score })
                    .reverse()
                    .value();
                memo[zxy] = _(rows).filter(function(r) {
                    return types.indexOf(r.db) <= types.indexOf(rows[0].db)
                });
                return memo;
            }, {})
            .value();
        results = _(results).chain()
            .map(function(rows, zxy) {
                zxy = zxy.split('/').map(function(num) {
                    return parseInt(num, 10);
                });
                // coalesce parent results into child results.
                _(zooms).chain()
                    .filter(function(z) { return z < zxy[0] })
                    .each(function(z) {
                        var p = pyramid(zxy[0], zxy[1], zxy[2], z).join('/');
                        if (!results[p]) return;
                        rows = rows.concat(_(results[p]).filter(function(r) {
                            return types.indexOf(r.db) <= types.indexOf(rows[0].db);
                        }));
                    });

                if (rows.length <= 1) return rows;

                rows = _(rows).chain()
                    // prevent db/token reduction from reducing to single case
                    // when there are identical tokens e.g. "new york, new york"
                    // @TODO unclear whether this scales beyond x2 tokens.
                    .groupBy(function(r) { return r.db }).toArray()
                    .map(function(rows, i) {
                        rows = _(rows).sortBy(function(r) { return r.i });
                        if (i%2) rows.reverse();
                        return rows;
                    })
                    .flatten()
                    // ensure at most one result for each db.
                    .reduce(function(memo, r) {
                        memo[r.db] = memo[r.db] || r;
                        return memo;
                    }, {})
                    // ensure at most one result for each token.
                    .reduce(function(memo, r) {
                        memo[r.i] = memo[r.i] || r;
                        return memo;
                    }, {})
                    .toArray()
                    .value();
                return rows;
            })
            // Remove results that don't match enough of the query tokens.
            // Prevents "Ohio" from being returned for queries like "Seattle, Ohio".
            // @TODO revisit this for fuzzier matching in the future.
            .filter(function(rows) { return rows.length >= data.query.length; })
            // Highest score.
            .groupBy(function(rows) { return _(rows).reduce(function(memo, row) {
                return memo + row.score;
            }, 0); })
            .sortBy(function(rows, score) { return -1 * score; })
            .first()
            .map(function(rows) {
                return rows.map(function(r) { return r.db + '.' + r.id }).join(',');
            })
            .uniq()
            .value();

        if (!results.length) return this(null, []);

        // Not using this.group() here because somehow this
        // code triggers Step's group bug.
        var next = this;
        var matches = [];
        var contexts = [];
        var remaining = results.length;
        _(results).each(function(terms) {
            var term = terms.split(',')[0];
            var termid = term.split('.')[1];
            var dbname = term.split('.')[0];
            indexes[dbname].source.feature(termid, function(err, data) {
                if (err) return next(err);
                var r = {};
                r.id = dbname + '.' + termid;
                r.type = dbname;
                r.data = data;
                r.data.id = r.data.id || r.id;
                r.terms = terms.split(',');

                var args = [r.id];
                var method = 'contextByFeature';
                if ('lon' in r.data && 'lat' in r.data) {
                    args = [r.data.lon, r.data.lat];
                    method = 'context';
                }
                carmen[method].apply(carmen, args.concat(function(err, context) {
                    if (err) return next(err);
                    // Add the result in manually for indexes that exclude context retrieval.
                    if (!indexes[r.type].context) context.unshift(indexes[r.type].map(r.data));
                    // Context adjustments.
                    context = _(context).chain().map(function(term) {
                        // Term matches result.
                        if (term.id === r.id) return term;
                        // Term is parent of result.
                        if (types.indexOf(term.id.split('.')[0]) < types.indexOf(r.type))
                            return term;
                        // A context that includes a different term at the
                        // same level as the result likely has a different
                        // overlapping feature that obscures the result
                        // feature. Replace the obscuring feature with the
                        // result.
                        if (types.indexOf(term.id.split('.')[0]) === types.indexOf(r.type))
                            return indexes[r.type].map(r.data);
                        return false;
                    }).compact().value();
                    matches.push(r);
                    contexts.push(context);
                    if (--remaining === 0) return next(null, matches, contexts);
                }));
            });
        });
    }, function(err, matches, contexts) {
        if (err) return callback(err);
        data.results = _(matches).chain()
            .map(function(r) {
                // Confirm that the context contains the terms that contributed
                // to the match's score. All other contexts are false positives
                // and should be discarded. Example:
                //
                //     "Chester, NJ" => "Chester, PA"
                //
                // This context will be returned because Chester, PA is in
                // close enough proximity to overlap with NJ.
                r.context = _(contexts).find(function(c) {
                    return _(r.terms).all(function(id) {
                        return _(c).any(function(t) { return t.id === id });
                    });
                });
                if (r.context) return r;
            })
            .compact()
            .sortBy(function(r) { return indexes[r.type].sortBy(r.data) })
            .reverse()
            .pluck('context')
            .value();
        return callback(null, data);
    });
};

module.exports = Carmen;

