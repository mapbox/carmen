var unidecode = require('unidecode-cxx');

module.exports.serialize = function(replacer) {
    var replacer_string = [];
    for (var replacer_it = 0; replacer_it < replacer.length; replacer_it++) {
        replacer_string.push({
            from: replacer[replacer_it].from.toString(),
            to: replacer[replacer_it].to
        });
    }
}

module.exports.parse = function(replacer_string) {
    replacer_string = JSON.parse(replacer_string);
    var replacer = [];
    for (var replacer_it = 0; replacer_it < replacer_string.length; replacer_it++) {
        replacer.push({
            from: new RegExp(replacer_string[replacer_it].from),
            to: replacer_string[replacer_it].to
        });
    }
}

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
            entry.from = new RegExp('(\\W|^)' + from + '(\\W|$)', 'gi');

            // increment replacements indexes in `to`
            var groupReplacements = 0;
            to = to.replace(/\$(\d+)/g, function(str, index) { groupReplacements++; return '$' + (parseInt(index)+1).toString();});
            entry.to = '$1' + to + '$' + (groupReplacements + 2).toString(); // normalize abbrev

            replacers.push(entry);
        }
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        var abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}
