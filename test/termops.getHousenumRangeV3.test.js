var getHousenumRangeV3 = require('../lib/util/termops').getHousenumRangeV3;
var test = require('tape');

test('termops.getHousenumRangeV3', function(assert) {
    assert.deepEqual(getHousenumRangeV3({ properties: {} }), false, 'non-address doc => false');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [] }
    }), false, 'empty carmen:addressnumber => false');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': JSON.stringify([[0, 10]]) }
    }), ['#','##'], 'parses JSON carmen:addressnumber');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[0, 10]] }
    }), ['#','##'], 'carmen:addressnumber => 0,10');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[ 0, 10000000000 ]] }
    }), ['#','10#########'], 'carmen:addressnumber => [0,10000000000]');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[ 5, 10, 1, 13, 3100, 3101, 3503 ]] }
    }), ['#','##','31##','35##'], 'carmen:addressnumber => [1,13,3100,3101,3503]');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[ '5a', '10b', '1c', '13d' ]] }
    }), ['#','##'], 'carmen:addressnumber => [1,13]');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[ 'lot 1', 'lot 10' ]] }
    }), ['#','##'], 'carmen:addressnumber => [1,10]');

    assert.deepEqual(getHousenumRangeV3({
        properties: { 'carmen:addressnumber': [[ 'apt a', 'apt b' ]] }
    }), false, 'carmen:addressnumber (non-numeric) => false');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['0','11']],
            'carmen:ltohn': [['5','100']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['#','##','1##'], 'carmen:rangetype + carmen:lfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['100']],
            'carmen:ltohn': [['10']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['##','1##'], 'carmen:rangetype + carmen:lfromhn, carmen:ltohn => [10,100]');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:rfromhn': [['0','11']],
            'carmen:rtohn': [['5','200']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['#','##','1##','2##'], 'carmen:rangetype + carmen:rfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:rfromhn': [['0','11']],
            'carmen:rtohn': [['5','200']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['#','##','1##','2##'], 'carmen:rangetype + carmen:rfromhn => [0,100]');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['1']],
            'carmen:ltohn': [['10']],
            'carmen:rfromhn': [['1001']],
            'carmen:rtohn': [['1200']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['#', '##','10##','11##','12##'], 'complex case A');

    assert.deepEqual(getHousenumRangeV3({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:rfromhn': [['1']],
            'carmen:rtohn': [['1000']]
        },
        geometry: {
            geometries: [1]
        }
    }), ['#', '##','1##','10##','2##', '3##', '4##', '5##', '6##', '7##', '8##', '9##'], 'complex case B');

    assert.end();
});

