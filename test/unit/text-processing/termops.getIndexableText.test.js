/* eslint-disable require-jsdoc */
'use strict';
const termops = require('../../../lib/text-processing/termops');
const token = require('../../../lib/text-processing/token');
const test = require('tape');

// test utility function to categorize the tokens, then create two replacers,
// as we actually do in practice
const createMultipleReplacers = function(tokens, opts) {
    const categorized = token.categorizeTokenReplacements(tokens);
    return {
        simple: token.createSimpleReplacer(categorized.simple),
        complex: token.createComplexReplacer(categorized.complex, opts)
    };
};

test('termops.getIndexableText', (t) => {
    let replacers;
    let doc;
    let texts;

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'], hash: 248,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText');

    replacers = createMultipleReplacers({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'], hash: 248,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates contracted phrases using geocoder_tokens');

    replacers = createMultipleReplacers({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street, main st' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'], hash: 248,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'include variants');

    replacers = createMultipleReplacers({ 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'ln'], hash: 255,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'include variants 2');

    doc = { properties: { 'carmen:text': 'Main Street St Lane Ln' } };
    t.assert(termops.getIndexableText(replacers.simple, replacers.complex, [], doc).length <= 8, 'only include 8 permutations');

    replacers = createMultipleReplacers({ 'Saint': 'St', 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street St Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'st', 'ln'], hash: 13,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'don\'t expand st if it\'s ambiguous');

    replacers = createMultipleReplacers({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
    }, { includeUnambiguous: true });
    doc = { properties: { 'carmen:text': 'Äpfelstrüdeln Strasse' } };
    texts = [
        { languages: ['default'], tokens: ['aepfelstruedeln', 'strasse'], hash: 73,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['aepfelstrudeln', 'strasse'], hash: 73,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['apfelstruedeln', 'strasse'], hash: 73,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['apfelstrudeln', 'strasse'], hash: 73,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'support custom reverse functions that can skip word boundaries');


    replacers = createMultipleReplacers({
        'dix-huitième': { text:'18e', spanBoundaries: 1 }
    });
    doc = { properties: { 'carmen:text': 'Avenue du dix-huitième régiment' } };
    texts = [
        { languages: ['default'], tokens: ['avenue', 'du', '18e', 'regiment'], hash: 139,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['avenue', 'du', 'dix', 'huitieme', 'regiment'], hash: 139,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'hypenated replacement');

    replacers = createMultipleReplacers({});
    doc = {
        properties: {
            'carmen:text':'Main Street',
            'carmen:addressnumber': [[1, 10, 100, 200]]
        }
    };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'], hash: 248,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['2##', 'main', 'street'], hash: 248,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['1##', 'main', 'street'], hash: 248,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['##', 'main', 'street'], hash: 248,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['#', 'main', 'street'], hash: 248,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, 'with range');

    replacers = createMultipleReplacers({ 'street': 'st' });
    doc = {
        properties: {
            'carmen:text':'Main Street',
            'carmen:addressnumber': [[1, 10, 100, 200]]
        }
    };
    texts = [
        { tokens: ['main', 'st'],            languages: ['default'], hash: 248,  reduceRelevance: undefined  },
        { tokens: ['2##', 'main', 'st'],     languages: ['default'], hash: 248,  reduceRelevance: undefined  },
        { tokens: ['1##', 'main', 'st'],     languages: ['default'], hash: 248,  reduceRelevance: undefined  },
        { tokens: ['##', 'main', 'st'],      languages: ['default'], hash: 248,  reduceRelevance: undefined  },
        { tokens: ['#', 'main', 'st'],       languages: ['default'], hash: 248,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, 'with range');

    // test for when token replacement creates 8 variants
    replacers = createMultipleReplacers({ 'street': 'st', 'road': 'rd', 'north': 'n' });
    doc = {
        properties: {
            'carmen:text':'North Newtown Street Road',
        }
    };
    texts = [
        { tokens: ['n', 'newtown', 'st', 'rd'], languages: ['default'], hash: 28,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, '8 variants');

    // test for when token replacement creates more than 8 variants (and gets truncated to 8)
    replacers = createMultipleReplacers({ 'street': 'st', 'road': 'rd', 'north': 'n', 'square': 'sq' });
    doc = {
        properties: {
            'carmen:text':'North Newtown Square Street Road',
        }
    };
    // it happens that none of the variants with "street" will be found, since
    // those happen to be the final 8 combinations
    texts = [
        { tokens: ['n', 'newtown', 'sq', 'st', 'rd'], languages: ['default'], hash: 190,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, 'more than 8 variants');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'Main Street', 'carmen:text_es': 'El Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'], hash: 248,  reduceRelevance: undefined  },
        { languages: ['es'], tokens: ['el', 'main', 'street'], hash: 19,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'in the presence of translations, plain carmen:text has language "default" and translations are language-specific');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'], hash: 59,  reduceRelevance: undefined  },
        { languages: ['all'], tokens: ['sfo'], hash: 90,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'in the presence of universal text, plain carmen:text and text_universal both have language "all"');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO', 'carmen:text_es': 'Aeropuerto de San Francisco' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'], hash: 59,  reduceRelevance: undefined  },
        { languages: ['all'], tokens: ['sfo'], hash: 90,  reduceRelevance: undefined  },
        { languages: ['es'], tokens: ['aeropuerto', 'de', 'san', 'francisco'], hash: 201,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'universal text is always indexed across langauges');
    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'Latveria,Republic of Latveria' } };
    texts = [
        { languages: ['default'], tokens: ['latveria'], hash: 184,  reduceRelevance: undefined  },
        { languages: ['default'], tokens: ['republic', 'of', 'latveria'], hash: 36,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText w/ synonyms');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York', 'carmen:text_en': 'New York' } };
    texts = [
        { languages: ['default', 'en'], tokens: ['new', 'york'], hash: 142,  reduceRelevance: undefined  },
        { languages: ['es'], tokens: ['nueva', 'york'], hash: 45,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'translations with phrase overlaps are properly grouped');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'United States', 'carmen:text_sv': 'USA', 'carmen:text_universal': 'USA' } };
    texts = [
        { languages: ['default'], tokens: ['united', 'states'], hash: 91,  reduceRelevance: undefined  },
        { languages: ['sv', 'all'], tokens: ['usa'], hash: 214,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'universal text');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York' } };
    texts = [
        { languages: ['default', 'en'], tokens: ['new', 'york'], hash: 142,  reduceRelevance: undefined  },
        { languages: ['es'], tokens: ['nueva', 'york'], hash: 45,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en']), texts, 'auto-populate from default works');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York,NYC,bakery', 'carmen:text_es': 'Nueva York' } };
    texts = [
        { tokens: ['new', 'york'], languages: ['default', 'en'], hash: 142,  reduceRelevance: undefined  },
        { tokens: ['nyc'], languages: ['default', 'en'], hash: 146,  reduceRelevance: undefined  },
        { tokens: ['bakery'], languages: ['all'], hash: 250,  reduceRelevance: undefined  },
        { tokens: ['nueva', 'york'], languages: ['es'], hash: 45,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en'], new Set(['bakery'])), texts, 'auto-universalize categories works');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'bakery,New York' } };
    texts = [
        { tokens: ['bakery'], languages: ['default', 'en'], hash: 250,  reduceRelevance: undefined  },
        { tokens: ['new', 'york'], languages: ['default', 'en'], hash: 142,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en'], new Set(['bakery'])), texts, 'display words are not universalized');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York', 'carmen:text_en': 'The Big Apple' } };
    texts = [
        { languages: ['default'], tokens: ['new', 'york'], hash: 142,  reduceRelevance: undefined  },
        { languages: ['es'], tokens: ['nueva', 'york'], hash: 45,  reduceRelevance: undefined  },
        { languages: ['en'], tokens: ['the', 'big', 'apple'], hash: 230,  reduceRelevance: undefined  },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en']), texts, 'auto-populate doesn\'t overwrite supplied translation');

    replacers = createMultipleReplacers({ 'street': 'st', 'northwest': 'nw' });
    doc = {
        properties: {
            'carmen:text':'Main Street Northwest',
            'carmen:intersections': [null, null, ['O Street Northwest']]
        }
    };
    // indexes docs with intersections in the following way:
    texts = [
        { tokens: ['main', 'st', 'nw'], languages: ['default'], hash: 117,  reduceRelevance: undefined  },
        { tokens: ['+intersection', 'o', 'st', 'nw', ',', 'main', 'st', 'nw'], languages: ['default'], hash: 117,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, 'intersection indexing');
    t.end();
});

test('replacer/previously-globalReplacer interaction', (t) => {
    const replacers = createMultipleReplacers({
        '([^ ]+)(strasse|str|straße)': {
            text: '$1 str',
            regex: true,
            skipDiacriticStripping: true,
            spanBoundaries: 0
        },
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });

    const withUmlaut = termops.getIndexableText(replacers.simple, replacers.complex, [], { properties: { 'carmen:text': 'Phönixstraße' } }).map((a) => { return { tokens: a.tokens, languages: a.languages };});
    const withOe = termops.getIndexableText(replacers.simple, replacers.complex, [], { properties: { 'carmen:text': 'Phoenixstraße' } }).map((a) => { return { tokens: a.tokens, languages: a.languages };});

    t.deepEqual(withUmlaut, withOe, 'umlaut and oe versions get treated the same way, other than hashes');
    t.deepEqual(withOe, [
        { tokens: ['phoenix', 'str'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phonix', 'str'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phoenixstrasse'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phonixstrasse'], languages: ['default'], reduceRelevance: undefined }
    ], 'all variants are generated');
    t.deepEqual(withUmlaut, [
        { tokens: ['phoenix', 'str'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phonix', 'str'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phoenixstrasse'], languages: ['default'], reduceRelevance: undefined },
        { tokens: ['phonixstrasse'], languages: ['default'], reduceRelevance: undefined }
    ], 'all variants are generated');

    t.end();
});

test('replacer/globalReplacer interaction', (t) => {
    const replacers = createMultipleReplacers({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });
    const globalReplacer = token.createGlobalReplacer({
        '\\b(.+)(strasse|str|straße)\\b': '$1 str'
    });

    const withUmlaut = termops.getIndexableText(replacers.simple, replacers.complex, globalReplacer, { properties: { 'carmen:text': 'Phönixstraße' } });
    const withOe = termops.getIndexableText(replacers.simple, replacers.complex, globalReplacer, { properties: { 'carmen:text': 'Phoenixstraße' } });

    // Global replacers are not enumerated
    t.deepEqual(withOe, [
        { tokens: ['phoenix', 'str'], languages: ['default'], hash: 155,  reduceRelevance: undefined  },
        { tokens: ['phonix', 'str'], languages: ['default'], hash: 155,  reduceRelevance: undefined  },
    ], 'all variants are generated');
    t.deepEqual(withUmlaut, [
        { tokens: ['phoenix', 'str'], languages: ['default'], hash: 55,  reduceRelevance: undefined  },
        { tokens: ['phonix', 'str'], languages: ['default'], hash: 55,  reduceRelevance: undefined  },
    ], 'all variants are generated');

    t.end();
});

test('Reserved words for inherited functions', (t) => {
    const replacers = createMultipleReplacers({});
    const doc = { properties: { 'carmen:text': 'constructor' } };
    const texts = [
        { languages: ['default'], tokens: ['constructor'], hash: 209,  reduceRelevance: undefined  }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText');
    t.end();
});
