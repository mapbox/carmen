var distance = require('turf-distance');
var point = require('turf-point');

module.exports = dedupe;

function dedupe(features) {
    // dedupe one: strictly by place name
    var a = [];
    var by_place_name = {};
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var previous = by_place_name[feature.place_name];
        if (previous) {
            if (a[previous.index].geometry.omitted && !feature.geometry.omitted) {
                a[previous.index] = feature;
            } else if (a[previous.index].geometry.interpolated && !feature.geometry.interpolated) {
                a[previous.index] = feature;
            } else {
                continue;
            }
        } else {
            by_place_name[feature.place_name] = {
                feature: feature,
                index: a.length
            };
            a.push(feature);
        }
    }

    // dedupe two: by address + distance threshold
    var b = [];
    var by_address = {};
    for (var i = 0; i < a.length; i++) {
        var feature = a[i];

        // No address. Keep.
        if (!feature.address) {
            b.push(feature);
            continue;
        }

        // Has address, check for a previous dupe within distance threshold.
        var address = feature.address + ' ' + feature.text.toLowerCase();
        var previous = by_address[address];
        if (previous && distance(previous.point, point(feature.center), 'kilometers') < 5) {
            if (b[previous.index].geometry.omitted && !feature.geometry.omitted) {
                b[previous.index] = feature;
            } else if (b[previous.index].geometry.interpolated && !feature.geometry.interpolated) {
                b[previous.index] = feature;
            } else {
                continue;
            }
        } else {
            by_address[address] = {
                point: point(feature.center),
                index: b.length
            };
            b.push(feature);
        }
    }

    return b;
}
