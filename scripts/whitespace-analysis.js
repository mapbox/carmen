#!/usr/bin/env node

const fs = require('fs');
const split = require('split');
const stream = require('stream');
const termops = require('../lib/util/termops.js');

// see ticket: https://github.com/mapbox/carmen/issues/632

let total = 0;
let hash = {};
let result = 0;
let sameAmt = 0;
let array = [];

const transmuteData = (line) => {
    // normalize line
    let resultLine = line.toLowerCase();
    resultLine = termops.removeWhiteSpace(resultLine);
    // track total lines
    total++;
    // track # of times the line is the same as other queries
    if (hash[resultLine] !== undefined) {
        sameAmt++;
    } else {
        hash[resultLine] = [];
    }
    hash[resultLine].push(line);
};


// In order to retrieve results run
// `cat filename | ./scripts/whitespace-analysis.js  > results2.json`
// in terminal
process.stdin
  .pipe(split())
  .on('data', (line) => {
      transmuteData(line);
  })
  .on('end', () => {
      Object.keys(hash).forEach((el) => {
          if (hash[el].length > 1) {
              array.push(hash[el]);
          }
      });
      result = sameAmt/total;
      // console.log(result);
      // console.log(JSON.stringify(array, null, 2));
  });
