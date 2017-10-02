#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var termops = require('../lib/util/termops.js');
var f = argv[2];

if (!f) {
    console.warn('Usage: carmen-analyze.js <file>');
    process.exit(1);
}
if (!fs.existsSync(f)) {
    console.warn('File %s does not exist.', f);
    process.exit(1);
}

console.log('Analyzing %s ...', f);

var s = Carmen.auto(f);
var carmen = new Carmen({ s: s });

carmen.analyze(s, function(err, stats) {
    if (err) throw err;
    console.log(stats);
});
