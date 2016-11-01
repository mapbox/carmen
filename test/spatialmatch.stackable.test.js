var stackable = require('../lib/spatialmatch.js').stackable;
var test = require('tape');

test('stackable simple', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:0, mask:parseInt('10',2), weight:0.5 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.5 };
    var b2 = { text:"b2", idx:1, zoom:1, mask:parseInt('1',2), weight:0.5 };
    var debug = stackable([
        [ a1 ],
        [ b1, b2 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'a1', 'b1' ],
        [ 'a1', 'b2' ]
    ]);
    assert.end();
});

test('stackable nmask', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:1, mask:parseInt('100',2), nmask:parseInt('1',2), weight:0.33 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('10',2), nmask:parseInt('10',2), weight:0.33 };
    var c1 = { text:"c1", idx:2, zoom:1, mask:parseInt('1',2), nmask:parseInt('10',2), weight:0.33 };
    var debug = stackable([
        [ a1 ],
        [ b1 ],
        [ c1 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'b1', 'a1' ],
        [ 'c1', 'a1' ],
    ],
        'b1 and c1 do not stack (nmask: same geocoder_name)');
    assert.end();
});

test('stackable bmask', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:1, mask:parseInt('100',2), bmask:[0,1],
        weight:0.66 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('10',2), bmask:[1,0],
        weight:0.66 };
    var debug = stackable([
        [ a1 ],
        [ b1 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'a1' ],
        [ 'b1' ],
    ],
        'a1 and b1 do not stack (bmask: exclusive bounds)');
    assert.end();
});

test('stackable complex', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:0, mask:parseInt('10',2), weight:0.33 };
    var a2 = { text:"a2", idx:0, zoom:0, mask:parseInt('110',2), weight:0.66 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.33 };
    var b2 = { text:"b2", idx:1, zoom:1, mask:parseInt('100',2), weight:0.33 };
    var c1 = { text:"c1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.33 };
    var c2 = { text:"c2", idx:1, zoom:1, mask:parseInt('100',2), weight:0.33 };
    var debug = stackable([
        [ a1, a2 ],
        [ b1, b2 ],
        [ c1, c2 ],
    ]).map(function(stack) {
        return stack.relev.toFixed(2) + ' - ' + stack.map(function(s) { return s.text }).join(', ');
    });
    assert.deepEqual(debug, [
        '0.99 - a2, c1',
        '0.99 - a2, b1',
        '0.99 - a1, b2, c1',
        '0.66 - a2',
        '0.66 - a1, c1',
        '0.66 - a1, c2',
        '0.66 - a1, b1',
        '0.66 - a1, b2',
        '0.66 - b2, c1',
    ]);
    assert.end();
});

test('stackable direction change', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:0, mask:parseInt('0001',2), weight:0.25 };
    var a2 = { text:"a2", idx:0, zoom:0, mask:parseInt('1000',2), weight:0.25 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('0010',2), weight:0.25 };
    var b2 = { text:"b2", idx:1, zoom:1, mask:parseInt('0100',2), weight:0.25 };
    var c1 = { text:"c1", idx:2, zoom:2, mask:parseInt('0100',2), weight:0.25 };
    var c2 = { text:"c2", idx:2, zoom:2, mask:parseInt('0010',2), weight:0.25 };
    var d1 = { text:"d1", idx:3, zoom:3, mask:parseInt('1000',2), weight:0.25 };
    var d2 = { text:"d2", idx:3, zoom:3, mask:parseInt('0001',2), weight:0.25 };
    var debug = stackable([
        [ a1, a2 ],
        [ b1, b2 ],
        [ c1, c2 ],
        [ d1, d2 ]
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'a2', 'b2', 'c2', 'd2' ],
        [ 'a2', 'b1', 'c1', 'd2' ],
        [ 'a1', 'b2', 'c2', 'd1' ],
        [ 'a1', 'b1', 'c1', 'd1' ],
        [ 'a2', 'b1', 'c1' ],
        [ 'a2', 'b2', 'c2' ],
        [ 'a1', 'b2', 'c2' ],
        [ 'a1', 'b1', 'c1' ],
        [ 'a1', 'b1', 'd1' ],
        [ 'a2', 'b1', 'd2' ],
        [ 'a2', 'b2', 'd2' ],
        [ 'a1', 'b2', 'd1' ],
        [ 'a2', 'c1', 'd2' ],
        [ 'a2', 'c2', 'd2' ],
        [ 'a1', 'c2', 'd1' ],
        [ 'a1', 'c1', 'd1' ],
        [ 'b2', 'c2', 'd2' ],
        [ 'b1', 'c1', 'd2' ],
        [ 'b2', 'c2', 'd1' ],
        [ 'b1', 'c1', 'd1' ]
    ]);
    assert.end();
});

