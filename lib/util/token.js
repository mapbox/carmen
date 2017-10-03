var removeDiacritics = require('./remove-diacritics');
var XRegExp = require('xregexp');

// this is all punctuation including unicode punctuation, plus all whitespace
const WORD_BOUNDARY = "[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]";

module.exports.createReplacer = function(tokens, inverseOpts) {
    // opts
    tokens = JSON.parse(JSON.stringify(tokens));
    inverseOpts = inverseOpts || {};
    inverseOpts.includeUnambiguous = inverseOpts.includeUnambiguous || false;

    var replacers = [];
    let isInverse = {};

    if (inverseOpts.includeUnambiguous) {
        // go through the keys and if check if their values are unique; if so,
        // include them backwards as well
        let tos = {}
        for (let _from in tokens) {
            let to, from;
            if (typeof tokens[_from] == 'object') {
                to = tokens[_from].text;
                from = JSON.parse(JSON.stringify(tokens[_from]));
                from.text = _from;
            } else {
                from = _from;
                to = tokens[from];
            }
            if (tos[to]) {
                tos[to].push(from);
            } else {
                tos[to] = [from];
            }
        }
        for (let to in tos) {
            if (tos[to].length == 1 && !tokens[to] && ! to.match(/[\(\)\$]/)) {
                let clone = JSON.parse(JSON.stringify(tos[to][0]));
                tokens[to] = clone;
                isInverse[to] = true;
            }
        }
    }
    if (inverseOpts.custom) {
        for (let token in inverseOpts.custom) {
            tokens[token] = inverseOpts.custom[token];
            isInverse[token] = true;
        }
    }
    for (var token in tokens) {
        var from = token; // normalize expanded
        var to = tokens[token];

        var replacementOpts = {};
        if (typeof to == 'object' && to.text) {
            replacementOpts = to;
            to = to.text;
        }

        let inverse = !!isInverse[from];

        for (var u = 0; u < 2; u++) {
            // first add the non-unidecoded version to the token replacer, then,
            // if unidecode changes the string, add it again
            if (u) {
                var stripped = removeDiacritics(from);
                if (from === stripped || replacementOpts.skipDiacriticStripping) {
                    continue;
                } else {
                    from = stripped;
                }
            }

            var entry = {};
            var parsedFrom = new XRegExp(from);
            entry.named = (parsedFrom.xregexp.captureNames !== null);

            // ensure that named groups are all or nothing; otherwise we have order problems
            if (entry.named && parsedFrom.xregexp.captureNames.some(function(captureName) { return captureName === null; }))
                throw new Error('Cannot process \'%s\'; must use either named or numbered capture groups, not both', from);

            if (entry.named) {
                entry.from = new XRegExp('(?<tokenBeginning>' + WORD_BOUNDARY + '|^)' + from.replace(".", "\\.") + '(?<tokenEnding>' + WORD_BOUNDARY + '|$)', 'gi');
                entry.to = typeof to == "string" ? '${tokenBeginning}' + to + '${tokenEnding}' : to;
            }
            else {
                entry.from = new RegExp(
                    (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|^)') +
                    from.replace(".", "\\.") +
                    (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|$)'),
                'gi');

                // count groups in original regex, using the trick from https://stackoverflow.com/a/16046903
                let count = new RegExp(from + "|").exec('').length - 1;

                // increment replacements indexes in `to`
                if (typeof to == "string" && !replacementOpts.skipBoundaries) {
                    to = to.replace(/\$(\d+)/g, function(str, index) { return '$' + (parseInt(index)+1).toString();});
                    entry.to = '$1' + to + '$' + (count + 2).toString(); // normalize abbrev
                } else {
                    entry.to = to; // normalize abbrev
                }
            }

            entry.inverse = inverse;
            replacers.push(entry);
        }
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (let token of tokens) {
        abbr = abbr.trim();
        if (token.named)
            abbr = XRegExp.replace(abbr, token.from, token.to);
        else
            abbr = abbr.replace(token.from, token.to);
    }

    return abbr;
}

module.exports.enumerateTokenReplacements = function(tokens, query) {
    // maintain two lists of the output, one ordered (because the order matters)
    // and one set, so we can easily test to see if the new string is one we've
    // seen before

    let out = [query.trim()]
    let outSet = new Set([query.trim().toLowerCase()]);

    for (let token of tokens) {
        for (var i = 0; i < out.length; i++) {
            // escape hatch on the check to make sure we don't run away with infinite recursion
            if (i > 64) break;

            // we want to enumerate each possible replacement of each token, unless it's an XRegExp, where this whole trick doesn't work
            var occurrenceCount = token.named ? 1 : (out[i].match(token.from) || []).length;

            // we add replacements before the string we replaced into for most replacements
            // because it's "more canonical" I guess? unless the token is inverse
            // in which case we add it after since the text we have is the canonical text
            var insertPos = token.inverse ? i + 1 : i;
            var replaced;

            // Optimized code path if there's only one occurrence of `from`
            // Does not need to support positional replacement
            if (occurrenceCount === 1) {
                if (token.named) {
                    replaced = XRegExp.replace(out[i], token.from, token.to);
                } else {
                    replaced = out[i].replace(token.from, token.to);
                }
                if (replaced != out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                }
                continue;
            }

            // More expensive code path for supporting positional replacement
            for (var j = 0; j < occurrenceCount; j++) {
                var occurrence = 0;

                replaced = out[i].replace(token.from, function(match) {
                    let out;
                    if (occurrence == j) {
                        var args = Array.from(arguments);
                        out = typeof token.to == 'function' ?
                            token.to.apply(this, args) :
                            // this replaces the '$n' params with the parenthesized matches
                            token.to.replace(/\$(\d)/g, function(match, p1) {
                                var group = parseInt(p1);
                                return group < (args.length - 2) ? args[parseInt(p1)] : '';
                            });
                    } else {
                        out = match;
                    }
                    occurrence++;
                    return out;
                });

                if (replaced != out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                    insertPos++;
                }
            }
        }
    }

    return out;
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
