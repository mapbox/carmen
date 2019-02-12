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
        { languages: ['default'], tokens: ['main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText');

    replacers = createMultipleReplacers({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'] },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates contracted phrases using geocoder_tokens');

    replacers = createMultipleReplacers({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street, main st' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'] },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'include variants');

    replacers = createMultipleReplacers({ 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'ln'] },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'include variants 2');

    doc = { properties: { 'carmen:text': 'Main Street St Lane Ln' } };
    t.assert(termops.getIndexableText(replacers.simple, replacers.complex, [], doc).length <= 8, 'only include 8 permutations');

    replacers = createMultipleReplacers({ 'Saint': 'St', 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street St Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'st', 'ln'] },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'don\'t expand st if it\'s ambiguous');

    replacers = createMultipleReplacers({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
    }, { includeUnambiguous: true });
    doc = { properties: { 'carmen:text': 'Äpfelstrüdeln Strasse' } };
    texts = [
        { languages: ['default'], tokens: ['apfelstruedeln', 'strasse'] },
        { languages: ['default'], tokens: ['aepfelstruedeln', 'strasse'] },
        { languages: ['default'], tokens: ['aepfelstrudeln', 'strasse'] },
        { languages: ['default'], tokens: ['apfelstrudeln', 'strasse'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'support custom reverse functions that can skip word boundaries');


    replacers = createMultipleReplacers({
        'dix-huitième': { text:'18e', spanBoundaries: 1 }
    });
    doc = { properties: { 'carmen:text': 'Avenue du dix-huitième régiment' } };
    texts = [
        { languages: ['default'], tokens: ['avenue', 'du', '18e', 'regiment'] },
        { languages: ['default'], tokens: ['avenue', 'du', 'dix', 'huitieme', 'regiment'] }
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
        { languages: ['default'], tokens: ['main', 'street'] },
        { languages: ['default'], tokens: ['2##', 'main', 'street'] },
        { languages: ['default'], tokens: ['1##', 'main', 'street'] },
        { languages: ['default'], tokens: ['##', 'main', 'street'] },
        { languages: ['default'], tokens: ['#', 'main', 'street'] }
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
        { tokens: ['main', 'st'],            languages: ['default'] },
        { tokens: ['2##', 'main', 'st'],     languages: ['default'] },
        { tokens: ['1##', 'main', 'st'],     languages: ['default'] },
        { tokens: ['##', 'main', 'st'],      languages: ['default'] },
        { tokens: ['#', 'main', 'st'],       languages: ['default'] }
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
        { tokens: ['n', 'newtown', 'st', 'rd'], languages: ['default'] },
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
        { tokens: ['n', 'newtown', 'sq', 'st', 'rd'], languages: ['default'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [],  doc), texts, 'more than 8 variants');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'Main Street', 'carmen:text_es': 'El Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'] },
        { languages: ['es'], tokens: ['el', 'main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'in the presence of translations, plain carmen:text has language "default" and translations are language-specific');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'] },
        { languages: ['all'], tokens: ['sfo'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'in the presence of universal text, plain carmen:text and text_universal both have language "all"');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO', 'carmen:text_es': 'Aeropuerto de San Francisco' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'] },
        { languages: ['all'], tokens: ['sfo'] },
        { languages: ['es'], tokens: ['aeropuerto', 'de', 'san', 'francisco'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'universal text is always indexed across langauges');
    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'Latveria,Republic of Latveria' } };
    texts = [
        { languages: ['default'], tokens: ['latveria'] },
        { languages: ['default'], tokens: ['republic', 'of', 'latveria'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText w/ synonyms');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York', 'carmen:text_en': 'New York' } };
    texts = [
        { languages: ['default', 'en'], tokens: ['new', 'york'] },
        { languages: ['es'], tokens: ['nueva', 'york'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'translations with phrase overlaps are properly grouped');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'United States', 'carmen:text_sv': 'USA', 'carmen:text_universal': 'USA' } };
    texts = [
        { languages: ['default'], tokens: ['united', 'states'] },
        { languages: ['sv', 'all'], tokens: ['usa'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, true), texts, 'universal text');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York' } };
    texts = [
        { languages: ['default', 'en'], tokens: ['new', 'york'] },
        { languages: ['es'], tokens: ['nueva', 'york'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en']), texts, 'auto-populate from default works');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York,NYC,bakery', 'carmen:text_es': 'Nueva York' } };
    texts = [
        { tokens: ['new', 'york'], languages: ['default', 'en'] },
        { tokens: ['nyc'], languages: ['default', 'en'] },
        { tokens: ['bakery'], languages: ['all'] },
        { tokens: ['nueva', 'york'], languages: ['es'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en'], new Set(['bakery'])), texts, 'auto-universalize categories works');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'bakery,New York' } };
    texts = [
        { tokens: ['bakery'], languages: ['default', 'en'] },
        { tokens: ['new', 'york'], languages: ['default', 'en'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en'], new Set(['bakery'])), texts, 'display words are not universalized');

    replacers = createMultipleReplacers({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York', 'text_en': 'The Big Apple' } };
    texts = [
        { languages: ['default'], tokens: ['new', 'york'] },
        { languages: ['es'], tokens: ['nueva', 'york'] },
        { languages: ['en'], tokens: ['the', 'big', 'apple'] },
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc, ['en']), texts, 'auto-populate doesn\'t overwrite supplied translation');

    t.end();
});

test('replacer/previously-globalReplacer interaction', (t) => {
    const replacers = createMultipleReplacers({
        '(.+)(strasse|str|straße)': '$1 str',
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });

    const withUmlaut = termops.getIndexableText(replacers.simple, replacers.complex, [], { properties: { 'carmen:text': 'Phönixstraße' } });
    const withOe = termops.getIndexableText(replacers.simple, replacers.complex, [], { properties: { 'carmen:text': 'Phoenixstraße' } });

    // TODO order was the same. is not now... and both are kinda off the long forms should be last
    // t.deepEqual(withUmlaut, withOe, 'umlaut and oe versions get treated the same way');
    t.deepEqual(withOe, [
        { tokens: ['phoenix', 'str'], languages: ['default'] },
        { tokens: ['phoenixstrasse'], languages: ['default'] },
        { tokens: ['phonix', 'str'], languages: ['default'] },
        { tokens: ['phonixstrasse'], languages: ['default'] }
    ], 'all variants are generated');
    t.deepEqual(withUmlaut, [
        { tokens: ['phoenixstrasse'], languages: ['default'] },
        { tokens: ['phoenix', 'str'], languages: ['default'] },
        { tokens: ['phonix', 'str'], languages: ['default'] },
        { tokens: ['phonixstrasse'], languages: ['default'] }
    ], 'all variants are generated');

    t.end();
});

// BREAKING CHANGE! global replacers are no longer enumerated
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

    // TODO order was the same. is not now... and both are kinda off the long forms should be last
    // t.deepEqual(withUmlaut, withOe, 'umlaut and oe versions get treated the same way');
    t.deepEqual(withOe, [
        { tokens: ['phoenix', 'str'], languages: ['default'] },
        { tokens: ['phonix', 'str'], languages: ['default'] },
    ], 'all variants are generated');
    t.deepEqual(withUmlaut, [
        { tokens: ['phoenix', 'str'], languages: ['default'] },
        { tokens: ['phonix', 'str'], languages: ['default'] },
    ], 'all variants are generated');

    t.end();
});

test('Reserved words for inherited functions', (t) => {
    const replacers = createMultipleReplacers({});
    const doc = { properties: { 'carmen:text': 'constructor' } };
    const texts = [
        { languages: ['default'], tokens: ['constructor'] }
    ];
    t.deepEqual(termops.getIndexableText(replacers.simple, replacers.complex, [], doc), texts, 'creates indexableText');
    t.end();
});
