var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    TIMER = process.env.TIMER;

module.exports = merge;

function merge(geocoder, from1, from2, to, options, callback) {
    console.log("hey", from1, from2, to);
    callback();
}