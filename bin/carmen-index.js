#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
let argv = process.argv;
const Carmen = require('..');
argv = require('minimist')(process.argv, {
    string: ['version', 'config', 'index', 'tokens'],
    boolean: ['help']
});
const settings = require('../package.json');

/**
 * Display CLI help message
 */
function help() {
    console.log('carmen-index.js --config=<path> --index=<path> [options]');
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log('  --config="<path>"       path to JSON document with index settings');
    console.log('  --tokens=<tokens.json>  Load global token file');
    console.log('  --index="<path>"        Tilelive path to output index to');
    console.log('      Paths to JS files with functions for guessing token reversal');
    process.exit(0);
}

if (argv.help) help();

if (argv.version) {
    console.log('carmen@' + settings.version);
    process.exit(0);
}

if (!argv.config) help();
if (!argv.index) throw new Error('--index argument required');

let tokens = {};
if (argv.tokens) {
    tokens = require(path.resolve(argv.tokens));
    if (typeof tokens === 'function') {
        tokens = tokens();
    }
}

let conf;
const config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));

argv.index = Carmen.auto(argv.index, () => {
    conf = {
        to: argv.index
    };
    conf.to.startWriting(writeMeta);
});

/**
 * @param {Error} err - error
 */
function writeMeta(err) {
    if (err) throw err;
    conf.to.putInfo(config, stopWriting);
}

/**
 * @param {Error} err - error
 */
function stopWriting(err) {
    if (err) throw err;
    conf.to.stopWriting(index);
}

/**
 * @param {Error} err - error
 */
function index(err) {
    if (err) throw err;

    const carmen = new Carmen(conf, {
        tokens: config.tokens,
    });
    config.output = process.stdout;

    let last = +new Date;
    carmen.on('index', (num) => {
        console.error('Indexed %s docs @ %s/s', num, Math.floor(num * 1000 / (+new Date - last)));
        last = +new Date;
    });

    carmen.on('open', () => {
        carmen.index(process.stdin, conf.to, config, (err) => {
            if (err) throw err;
        });
    });
}
