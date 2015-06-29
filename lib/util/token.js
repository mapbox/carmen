var unidecode = require('unidecode');

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var entry = {};

        var f = unidecode(token); // normalize expanded
        entry.from = new RegExp('(\\W|^)' + f + '(\\W|$)', 'gi');

        // increment replacements indexes in `to`
        var groupReplacements = 0;
        tokens[token] = tokens[token].replace(/\$(\d+)/g, function(str, index) { groupReplacements++; return '$' + (parseInt(index)+1).toString();});
        entry.to = unidecode('$1' + tokens[token] + '$' + (groupReplacements + 2).toString()); // normalize abbrev

        replacers.push(entry);
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var query = unidecode(query);

    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        var abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}
