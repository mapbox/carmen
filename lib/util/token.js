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
        let values = {}
        for (let token in tokens) {
            if (values[tokens[token]]) {
                values[tokens[token]].push(token);
            } else {
                values[tokens[token]] = [token];
            }
        }
        for (let value in values) {
            if (values[value].length == 1 && !tokens[value] && ! value.match(/[\(\)\$]/)) {
                let clone = "" + values[value][0];
                tokens[value] = clone;
                isInverse[value] = true;
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
        let inverse = !!isInverse[from];

        for (var u = 0; u < 2; u++) {
            // first add the non-unidecoded version to the token replacer, then,
            // if unidecode changes the string, add it again
            if (u) {
                var stripped = removeDiacritics(from);
                if (from === stripped) {
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
                entry.from = new RegExp('(' + WORD_BOUNDARY + '|^)' + from.replace(".", "\\.") + '(' + WORD_BOUNDARY + '|$)', 'gi');

                // count groups in original regex, using the trick from https://stackoverflow.com/a/16046903
                let count = new RegExp(from + "|").exec('').length - 1;

                // increment replacements indexes in `to`
                if (typeof to == "string") {
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
    let out = [query];
    for (var i=0; i<tokens.length; i++) {
        for (let j = 0; j < out.length; j++) {
            if (typeof out[j] != "string") continue;

            let match = tokens[i].named ?
                XRegExp.match(out[j], tokens[i].from) :
                out[j].match(tokens[i].from);

            if (match) {
                let subOut = [out[j]];
                for (let m of match) {
                    let subStr = subOut.pop();

                    let parts = subStr.split(m);
                    // match may have duplicates in it, so we only want to
                    // examine one split at a time; unfortunately the string
                    // split API in JS is awful, so we have to emulate
                    // proper split limiting
                    if (parts.length > 2) parts = [parts[0], parts.slice(1).join(m)];

                    subOut.push(parts[0]);

                    let to = tokens[i].to;

                    if (typeof to == 'function') {
                        to = function() {
                            // here, ordinarily we're doing search and replace on each little substring
                            // but if we've been handed a replace function instead of just a simple string,
                            // that replace function may want to do all sorts of stuff to decide what to swap in,
                            // including looking at the whole string rather than just the little piece we're doing
                            // the replace on, so here we'll reconstruct an entire string just like replaceToken
                            // would deliver
                            let collapse = function(arr) {
                                return arr.map(function(s) {
                                    return Array.isArray(s) ? s[0] : s;
                                }).join("");
                            }

                            // reconstruct the parts of the string before and after the match
                            let prePartial = collapse(out.slice(0, j)) + collapse(subOut);
                            let postPartial = parts[1] + collapse(out.slice(j + 1));

                            var adjustedArguments = Array.from(arguments).slice(0, arguments.length - 2);
                            adjustedArguments.push(prePartial.length + arguments[3]);
                            adjustedArguments.push(prePartial + arguments[0] + postPartial);

                            return tokens[i].to.apply(this, adjustedArguments);
                        }
                    }

                    let choices = Array.from(new Set([
                        tokens[i].named ?
                            XRegExp.replace(m, tokens[i].from, to) :
                            m.replace(tokens[i].from, to),
                        m
                    ]));

                    // return short forms first so if we truncate, we always get
                    // the short ones -- this is important because forward geocoding
                    // will only ever use the short ones
                    if (tokens[i].inverse) choices.reverse();

                    subOut.push(choices);

                    subOut.push(parts[1]);
                }
                // we've now turned a string that was an element in our main
                // output array into another array, so splice it into place
                // to replace the original string
                out = out.slice(0, j).concat(subOut).concat(out.slice(j + 1));
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
