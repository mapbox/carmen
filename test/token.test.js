var tokenize = require('../lib/util/token.js');
var tape = require('tape');

(function() {
    tape('test tokens', function(t) {
        var tokens = {
            'Street': 'st'
        }
        var tokenReplacer = tokenize.createReplacer(tokens)
        var expected = [ { named: false, from: /(\W|^)Street(\W|$)/gi, to: '$1st$2' } ];
        t.deepEquals(tokenReplacer, expected, 'okay, created a regex')
        t.end();
    });
})();

(function() {
    tape('test tokens', function(t) {
        var tokens = {
            'Street': 'st'
        }
        var query = 'fake street';
        var tokensRegex = tokenize.createReplacer(tokens)
        var replace = tokenize.replaceToken(tokensRegex, query);
        t.deepEquals('fake st', replace, 'okay, replaced the token')
        t.end();
    });
})();

(function() {
    tape('test global tokens - talstrasse', function(t) {
        var tokens = {
            '\\b(.+)(strasse|str|straße)\\b': "$1 str"
        };
        tape.test('talstrasse', function(q) {
            var query = 'talstrasse';
            var tokensRegex = tokenize.createGlobalReplacer(tokens)
            var replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstrasse')
            q.end();
        });
        tape.test('talstraße', function(q) {
            var query = 'talstraße';
            var tokensRegex = tokenize.createGlobalReplacer(tokens)
            var replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstraße')
            q.end();
        });
        tape.test('talstr', function(q) {
            var query = 'talstr';
            var tokensRegex = tokenize.createGlobalReplacer(tokens)
            var replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstr')
            q.end();
        });
        t.end();
    });
})();
