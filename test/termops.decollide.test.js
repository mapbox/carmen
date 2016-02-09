var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.decollide', function(assert) {
    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, '## ma'), true, 'decollides "## ma"');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, '2# ma'), true, 'decollides "2# ma"');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'main street 2#'), true, 'decollides "main street 2#"');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'main 2# street'), false, 'collides "main 2# street"');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'first street' }
    }, '1st'), false, 'finds collision: "1"');

    assert.deepEqual(termops.decollide([
        { from: /(\W|^)First(\W|$)/gi, to: '$11st$2' },
    ], {
        properties: { 'carmen:text': 'first street' }
    }, '1st'), true, 'decollides (token replacement)');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': '京都市' }
    }, '京'), true, 'decollides - unicode');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': '京都市' }
    }, 'jing'), true, 'decollides - unidecodes');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'market'), false, 'finds collision: letter "k"');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'Грамада' }
    }, 'грамада'), true, 'decollides - unicode');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'United States', 'carmen:text_es': 'Estados Unidos' }
    }, 'United States'), true, 'decollides - localization');

    assert.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'United States', 'carmen:text_es': 'Estados Unidos' }
    }, 'Estados Unidos'), true, 'decollides - localization');

    // Works
    assert.deepEqual(termops.decollide([
        { from: /(\W|^)Street(\W|$)/gi, to: '$1St$2' },
    ], {
        properties: { 'carmen:text': 'Main Street' }
    }, 'Main St'), true, 'decollides (token replacement + expanded)');

    // Currently fails because decollide is only considering the letters in
    // ['Main St'] instead of both ['Main St', 'Main Street']
    assert.deepEqual(termops.decollide([
        { from: /(\W|^)Street(\W|$)/gi, to: '$1St$2' },
    ], {
        properties: { 'carmen:text': 'Main Street' }
    }, 'Main Stree'), true, 'decollides (token replacement + expanded)');

    assert.end();
});

