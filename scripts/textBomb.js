#!/usr/bin/env node

const fs = require('fs');
const split = require('split');
const termops = require('../lib/util/termops.js');
const indexdocs = require('../lib/indexer/indexdocs.js');
const grid = require('../lib/util/grid.js');
const tape = require('tape');
const token = require('../lib/util/token.js');
const rewind = require('geojson-rewind');
const addrTransform = require('../lib/util/feature.js').addrTransform;
const histogram = require('ascii-histogram');

let token_replacer = token.createReplacer({});

let results = {
    '3000': 0,
    '1000': 0,
    '500': 0,
    '100': 0,
    '10': 0
};

let samples = {
    '3000': null,
    '1000': null,
    '500': null,
    '100': null,
    '10': null
};

process.stdin
    .pipe(split())
    .on('data', function(element) {
        if (!element) {
            return;
        }
        // console.log(element);

        let patch;
        let freq;
        let zoom;
        let doc;
        let err;

        patch = { grid:{}, docs:[], text:[] };
        freq = {};
        zoom = 12;

        doc = JSON.parse(element);
        doc.properties['carmen:zxy'] = ['6/32/32', '6/33/33'];
        doc.properties['carmen:score'] = 100;

        freq["__COUNT__"] = [0];
        freq["__MAX__"] = [0];

        doc = addrTransform(doc);

        // Indexes single doc.
        err = indexdocs.loadDoc(freq, patch, doc, { lang: { has_languages: false } }, zoom, token_replacer);

        // generate histogram
        if (patch.text.length > 3000) {
            results['3000']++;
            if (samples['3000'] == null) {
                samples['3000'] = patch.text;
            }
        } else if (patch.text.length > 1000) {
            results['1000']++;
            if (samples['1000'] == null) {
                samples['1000'] = patch.text;
            }
        } else if (patch.text.length > 500) {
            results['500']++;
            if (samples['500'] == null) {
                samples['500'] = patch.text;
            }
        } else if (patch.text.length > 100) {
            results['100']++;
            if (samples['100'] == null) {
                samples['100'] = patch.text;
            }
        } else if (patch.text.length > 10) {
            results['10']++;
            if (samples['10'] == null) {
                samples['10'] = patch.text;
            }
        };
    })
    .on('end', () => {
        console.log("textBomb analysis results");
        console.log(histogram(results, { bar: '=', width: 20, sort: true }));
        console.log();
        console.log(samples);
    })
