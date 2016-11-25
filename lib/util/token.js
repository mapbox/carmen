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
                entry.rFrom = new XRegExp('(?<tokenBeginning>\\W|^)' + to + '(?<tokenEnding>\\W|$)', 'gi');
                entry.rTo = '${tokenBeginning}' + from + '${tokenEnding}';
                entry.from = new XRegExp('(?<tokenBeginning>\\W|^)' + from + '(?<tokenEnding>\\W|$)', 'gi');
                entry.to = '${tokenBeginning}' + to + '${tokenEnding}';
            } else if (!to) {
                entry.from = new RegExp('(\\W|^)' + from + '(\\W|$)', 'gi');
                entry.to = '$1 $2';
            } else {
                entry.from = new RegExp('(\\W|^)' + from + '(\\W|$)', 'gi');
                entry.rFrom = new RegExp('(\\W|^)' + to + '(\\W|$)', 'gi');

                // increment replacements indexes in `to`
                var groupReplacements = 0;
                var to_ = to.replace(/\$(\d+)/g, function(str, index) {
                    groupReplacements++;
                    return '$' + (parseInt(index)+1).toString();
                });
                entry.to = '$1' + to_ + '$' + (groupReplacements + 2).toString();

                // increment replacement indexes in `from` to generate rTo
                groupReplacements = 0;
                var rTo_ = from.replace(/\$(\d+)/g, function(str, index) {
                    groupReplacements++;
                    return '$' + (parseInt(index)+1).toString();
                });
                entry.rTo = '$1' + rTo_ + '$' + (groupReplacements + 2).toString();
            }

            replacers.push(entry);
        }
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        if (tokens[i].named)
            abbr = XRegExp.replace(abbr, tokens[i].from, tokens[i].to);
        else
            abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}

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

module.exports.tokenReplacerFilter = function(tokens, query) {
    var matches = [];
    tokens.forEach(function(token) {
        if (!token.named) {
            if (token.from.test(query)) {
                matches.push({named: token.named, from: token.from, to:token.to});
            } else if (token.rFrom && token.rFrom.test(query)) {
                matches.push({named: token.named, from: token.rFrom, to:token.rTo});
            }
        } else if (token.named) {
            if (XRegExp(token.from).test(query)) {
                matches.push({named: token.named, from: token.from, to:token.to});
            } else if (token.rFrom && XRegExp(token.rFrom).test(query)) {
                matches.push({named: token.named, from: token.rFrom, to:token.rTo});
            }
        }
    });
    return matches;
};
