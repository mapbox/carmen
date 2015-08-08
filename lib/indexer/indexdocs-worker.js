var mp32 = Math.pow(2,32);
var cover = require('tile-cover');
var ops = require('../util/ops');
var grid = require('../util/grid');
var token = require('../util/token');
var termops = require('../util/termops');
var tilebelt = require('tilebelt');
var centroid = require('turf-point-on-surface');
var DEBUG = process.env.DEBUG;
var uniq = require('../util/uniq');

var freq;
var zoom;
var token_replacer;

module.exports = {};
module.exports.loadDoc = loadDoc;

process.on('message', function(data) {
    if (data.freq && data.zoom && data.geocoder_tokens) {
        freq = data.freq;
        zoom = data.zoom;
        token_replacer = token.createReplacer(data.geocoder_tokens);
    } else {
        var patch = { grid: {}, docs: 0 };
        for (var i = 0; i < data.length; i++) {
            var err = loadDoc(patch, data[i], freq, zoom, token_replacer);
            if (err) return process.send(err);
        }
        process.send(patch);
    }
});

function loadDoc(patch, doc, freq, zoom, token_replacer) {
    doc._hash = termops.feature(doc._id.toString());

    var xy = [];
    var l = doc._zxy.length;
    while (l--) {
        var zxy = doc._zxy[l].split('/');
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        if (zxy[1] < 0 || zxy[2] < 0) continue;
        xy.push({ x:zxy[1], y:zxy[2] });
    }

    var maxScore = freq[1][0] || 0;
    var texts = termops.getIndexableText(token_replacer, doc);
    var phraseUniq = {};
    for (var x = 0; x < texts.length; x++) {
        var phrases = termops.getIndexablePhrases(texts[x], freq);
        for (var y = 0; y < phrases.length; y++) {
            var phrase = phrases[y].phrase;

            // Make sure the phrase is only counted once per doc.
            // Synonyms and other multiple text situations can
            // create dupe phrases.
            if (phraseUniq[phrase]) continue;
            phraseUniq[phrase] = true;

            if (DEBUG && !phrases[y].degen) {
                console.warn('[%d] phrase: %s @ %d', doc._id, phrases[y].text, phrases[y].relev);
            }

            patch.grid[phrase] = patch.grid[phrase] || [];

            l = xy.length;
            while (l--) {
                var encoded = null;
                try {
                    encoded = grid.encode({
                        id: doc._hash,
                        x: xy[l].x,
                        y: xy[l].y,
                        relev: phrases[y].relev,
                        score: Math.ceil(7*(doc._score || 0)/(maxScore||1))
                    });
                } catch(err) {
                    console.warn(err.toString() + ', doc id: ' + doc._id);
                }
                if (encoded) patch.grid[phrase].push(encoded);
            }
        }
    }

    patch.docs++;
}

