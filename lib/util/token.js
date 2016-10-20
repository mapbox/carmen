var unidecode = require('unidecode-cxx');
var XRegExp = require('xregexp');

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var from = token; // normalize expanded
        var to = tokens[token];

        for (var u = 0; u < 2; u++) {
            if (u) {
                var unidecoded = unidecode(from);
                if (from === unidecoded) {
                    continue;
                } else {
                    from = unidecoded;
                }
            }

            var entry = {};
            var parsedFrom = new XRegExp(from);
            entry.named = (parsedFrom.xregexp.captureNames !== null);

            // ensure that named groups are all or nothing; otherwise we have order problems
            if (entry.named && parsedFrom.xregexp.captureNames.some(function(captureName) { return captureName === null; }))
                throw new Error('Cannot process \'%s\'; must use either named or numbered capture groups, not both', from);

            if (entry.named) {
                entry.rFrom = new XRegExp('^' + to + '$', 'gi');
                entry.rTo = from;
                entry.from = new XRegExp('^' + from + '$', 'gi');
                entry.to = to;
            } else if (!to) {
                entry.from = new RegExp('^' + from + '$', 'gi');
                entry.to = '';
            } else {
                entry.from = new RegExp('^' + from + '$', 'gi');
                entry.rFrom = new RegExp('^' + to + '$', 'gi');
                entry.to = to;
                entry.rTo = from;
            }

            replacers.push(entry);
        }
    }
    return replacers;
};

module.exports.replaceToken = replaceToken;
function replaceToken(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        if (tokens[i].named)
            abbr = XRegExp.replace(abbr, tokens[i].from, tokens[i].to);
        else
            abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}

module.exports.replaceTokenizedQueryTokens = function(tokens, tokenizedQuery) {
    var replacedQuery = [];
    for (var t = 0; t < tokenizedQuery.length; t++) {
        replacedQuery.push(replaceToken(tokens, tokenizedQuery[t]).toLowerCase());
    }
    return replacedQuery;
};

module.exports.createGlobalReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var from = token;
        var to = tokens[token];
        
        var entry = {
            named: false,
            from: new RegExp(from, 'gi'),
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
}

module.exports.tokenReplacerFilter = function(tokens, queryTokens) {
    var matches = [];
    tokens.forEach(function(token) {
        for (var q = 0; q < queryTokens.length; q++) {
            var queryToken = queryTokens[q];
            if (!token.named) {
                if (token.from.test(queryToken)) {
                    matches.push({named: token.named, from: token.from, to:token.to});
                    return;
                } else if (token.rFrom && token.rFrom.test(queryToken)) {
                    matches.push({named: token.named, from: token.rFrom, to:token.rTo});
                    return;
                }
            } else if (token.named) {
                if (XRegExp(token.from).test(queryToken)) {
                    matches.push({named: token.named, from: token.from, to:token.to});
                    return;
                } else if (token.rFrom && XRegExp(token.rFrom).test(queryToken)) {
                    matches.push({named: token.named, from: token.rFrom, to:token.rTo});
                    return;
                }
            }
        }
    });
    return matches;
};
