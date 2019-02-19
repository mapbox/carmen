'use strict';
const cacheAll = {};
const cacheContinuous = {};

module.exports = {};
module.exports.all = all;
module.exports.continuous = continuous;


/**
 * For a given number return an array of bitmasks representing all possible
 * combinatoric permutations from cache if available.
 *
 * @param {number} length
 * @return {Array<number>}
 */
function all(length) {
    cacheAll[length] = cacheAll[length] || _all(length);
    return cacheAll[length];
}

/**
 * For a given number return an array of bitmasks representing all possible
 * continuous combinatoric permutations from cache if available.
 *
 * @param {number} length
 * @return {Array<number>}
 */
function continuous(length) {
    cacheContinuous[length] = cacheContinuous[length] || _continuous(length);
    return cacheContinuous[length];
}

/**
 * For a given number return an array of bitmasks representing all possible
 * combinatoric permutations.
 *
 * @param {number} length
 * @return {Array<number>}
 */
function _all(length) {
    const masks = [];
    for (let i = Math.pow(2, length) - 1; i > 0; i--) {
        masks.push(i);
    }
    return masks.sort(maskSort);
}

/**
 * For a given number return an array of bitmasks representing all possible
 * continuous combinatoric permutations.
 *
 * @param {number} length
 * @return {Array<number>}
 */
function _continuous(length) {
    const masks = [];
    let cover = Math.pow(2, length) - 1;
    masks.push(cover);
    for (let i = 1; i < length; i++) {
        cover = cover >> 1;
        for (let j = 0; j <= i; j++) {
            masks.push(cover << j);
        }
    }
    return masks;
}

/**
 * Sort bitmasks based on number of bits set, then distance to least significant
 * bit
 */
function maskSort(a, b) {
    const bsize = b.toString(2).replace(/0/g,'');
    const asize = a.toString(2).replace(/0/g,'');
    return (bsize - asize) || (a - b);
}

