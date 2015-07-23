var index = require('../lib/index.js');
var tape = require('tape');

tape('index.prepDocs', function(assert) {
    assert.throws(function() { index.prepDocs([{
    }]); }, 'doc has no _id');
    assert.throws(function() { index.prepDocs([{
        _id:1
    }]); }, 'doc has no _text on _id:1');
    assert.throws(function() { index.prepDocs([{
        _id:1,
        _text:'Main Street'
    }]); }, 'doc has no _center or _geometry on _id:1');
    assert.throws(function() { index.prepDocs([{
        _id:1,
        _text:'Main Street',
        _center:[0,0]
    }]); }, 'index has no zoom on _id:1');
    assert.throws(function() { index.prepDocs([{
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
    }], 12); }, 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts.');
    assert.throws(function() { index.prepDocs([{
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
    }], 12); }, 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts.');
    assert.doesNotThrow(function() { index.prepDocs([{
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'Point', coordinates: [0,0] }
    }], 12); }, '');
    assert.end();
});

