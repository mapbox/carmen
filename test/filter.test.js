var filter = require('../lib/util/filter');
var tape = require('tape');

tape('filter.sourceMatchesStacks', function(assert) {
    assert.ok(filter.sourceMatchesStacks({
        stack: undefined
    }, {
        stacks: ['us','ca']
    }), 'allowed: source without stack');
    assert.ok(filter.sourceMatchesStacks({
        stack: ['ca']
    }, {
        stacks: ['us','ca']
    }), 'allowed: stack intersect');
    assert.notOk(filter.sourceMatchesStacks({
        stack: ['de']
    }, {
        stacks: ['us','ca']
    }), 'disallowed: stack disjoint');
    assert.end();
});

tape('filter.sourceMatchesTypes', function(assert) {
    assert.ok(filter.sourceMatchesTypes({
        types: ['region']
    }, {
        types: ['region','place']
    }), 'allowed: source with matching type');
    assert.ok(filter.sourceMatchesTypes({
        types: ['region'],
        scoreranges: {a:[],b:[]}
    }, {
        types: ['region.a','region.d']
    }), 'allowed: source with matching subtype');
    assert.ok(filter.sourceMatchesTypes({
        types: ['region'],
        scoreranges: {a:[],b:[]}
    }, {
        types:['region.b','region.d']
    }), 'allowed: source with matching subtype');
    assert.notOk(filter.sourceMatchesTypes({
        types: ['region'],
        scoreranges: {a:[],b:[]}
    }, {
        types: ['region.c','region.d']
    }), 'disallowed: source with non-matched subtype');
    assert.end();
});

tape('filter.featureMatchesStacks', function(assert) {
    assert.ok(filter.featureMatchesStacks({
        properties: { 'carmen:geocoder_stack': undefined }
    }, {
        stacks: ['us','ca']
    }), 'allowed: source without stack');
    assert.ok(filter.featureMatchesStacks({
        properties: { 'carmen:geocoder_stack': 'ca' }
    }, {
        stacks: ['us','ca']
    }), 'allowed: stack intersect');
    assert.notOk(filter.featureMatchesStacks({
        properties: { 'carmen:geocoder_stack': 'de' }
    }, {
        stacks: ['us','ca']
    }), 'disallowed: stack disjoint');
    assert.end();
});

tape('filter.featureMatchesTypes', function(assert) {
    var source = {
        scoreranges: { popular:[0.5,1.0] },
        maxscore: 10
    };

    assert.ok(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'] }
    }, {
        types: ['region']
    }), 'allowed: feature with matching type');

    assert.ok(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region', 'place'] }
    }, {
        types: ['place']
    }), 'allowed: feature with matching type');

    assert.ok(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'] }
    }, {
        types: ['place', 'region']
    }), 'allowed: feature with matching type');

    assert.ok(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'], 'carmen:score': 8 }
    }, {
        types: ['place','region.popular']
    }), 'allowed: feature with matching subtype');

    assert.notOk(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'] }
    }, {
        types: ['place']
    }), 'disallowed: feature without matching type');

    assert.notOk(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'], 'carmen:score': 2 }
    }, {
        types: ['region.popular']
    }), 'disallowed: feature without matching subtype');

    assert.notOk(filter.featureMatchesTypes(source, {
        properties: { 'carmen:types': ['region'] }
    }, {
        types: ['region.popular']
    }), 'disallowed: feature without matching subtype');

    assert.end();
});

