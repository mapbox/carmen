var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.decollide', function(assert) {
    assert.deepEqual(termops.decollide([], {
        _text: 'main street'
    }, '## ma'), true, 'decollides');

    assert.deepEqual(termops.decollide([], {
        _text: 'first street'
    }, '1st'), false, 'finds collision: "1"');

    assert.deepEqual(termops.decollide([
        { from: /(\W|^)First(\W|$)/gi, to: '$11st$2' },
    ], {
        _text: 'first street'
    }, '1st'), true, 'decollides (token replacement)');

    assert.deepEqual(termops.decollide([], {
        _text: '京都市'
    }, '京'), true, 'decollides - unicode');

    assert.deepEqual(termops.decollide([], {
        _text: '京都市'
    }, 'jing'), true, 'decollides - unidecodes');

    assert.deepEqual(termops.decollide([], {
        _text: 'main street'
    }, 'market'), false, 'finds collision: letter "k"');

    assert.deepEqual(termops.decollide([], {
        _text: 'Грамада'
    }, 'грамада'), true, 'decollides - unicode');

    assert.end();
});

