#!/usr/bin/env node

// Apply a termops action on stdin stream and print to stdout.

var fs = require('fs');
var split = require('split');
var termops = require('../lib/util/termops.js');
var type = process.argv[2];

if (type !== 'phrase' && type !== 'term') {
    console.log('Usage: tokenize.js <phrase|term>');
    process.exit(1);
}

var separator = type === 'phrase' ? ' ' : '\n';

process.stdin.pipe(split()).on('data', function(line) {
    process.stdout.write(termops.tokenize(line).join(separator) + '\n');
});
