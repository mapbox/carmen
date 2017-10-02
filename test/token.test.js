const tokenize = require('../lib/util/token.js');
const tape = require('tape');

(() => {
    tape('test tokens', t => {
        let tokens = {
            Street: 'st'
        };
        let tokenReplacer = tokenize.createReplacer(tokens);
        let expected = [
            {
                named: false,
                from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi,
                to: '$1st$2',
                inverse: false
            }
        ];
        t.deepEquals(tokenReplacer, expected, 'okay, created a regex');
        t.end();
    });
})();

(() => {
    tape('test tokens', t => {
        let tokens = {
            Street: 'st'
        };
        let query = 'fake street';
        let tokensRegex = tokenize.createReplacer(tokens);
        let replace = tokenize.replaceToken(tokensRegex, query);
        t.deepEquals('fake st', replace, 'okay, replaced the token');
        t.end();
    });
})();

(() => {
    tape('test global tokens - talstrasse', t => {
        let tokens = {
            '\\b(.+)(strasse|str|straße)\\b': '$1 str'
        };
        tape.test('talstrasse', q => {
            let query = 'talstrasse';
            let tokensRegex = tokenize.createGlobalReplacer(tokens);
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstrasse');
            q.end();
        });
        tape.test('talstraße', q => {
            let query = 'talstraße';
            let tokensRegex = tokenize.createGlobalReplacer(tokens);
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstraße');
            q.end();
        });
        tape.test('talstr', q => {
            let query = 'talstr';
            let tokensRegex = tokenize.createGlobalReplacer(tokens);
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstr');
            q.end();
        });
        t.end();
    });
})();
