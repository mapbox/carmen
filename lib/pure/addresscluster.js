module.exports = function(feature, address) {
    // Check both forms of the address (raw, number-parsed)
    var a1 = typeof address === 'string' ? address.toLowerCase() : address;
    var a2 = typeof address === 'string' ? address.replace(/\D/, '') : address;

    var cluster = feature.properties['carmen:addressnumber'];

    // Check is cluster is pt geom
    var a_index = cluster.indexOf(a1) === -1 ? cluster.indexOf(a2) : cluster.indexOf(a1);
    if (a_index > -1 && feature.geometry.type === 'MultiPoint') {
        return {
            type:'Point',
            coordinates: [
                Math.round(feature.geometry.coordinates[a_index][0]*1e6)/1e6,
                Math.round(feature.geometry.coordinates[a_index][1]*1e6)/1e6
            ]
        };
    }
};

module.exports.reverse = function(feat,query) {
    //Convert address clusters into points
    var lon = query[0],
        lat = query[1];

    var cluster = feat.properties['carmen:addressnumber'];
    var closest;

    var l = cluster.length;
    while (l--) {
        var lon2 = feat.geometry.coordinates[l][0],
            lat2 = feat.geometry.coordinates[l][1];
        var phi1 = lat * (Math.PI / 180),
            phi2 = lat2 * (Math.PI / 180);
        var deltaPhi = (lat2-lat) * (Math.PI / 180),
            deltaLambda = (lon2-lon) * (Math.PI / 180);
        var dist = 6371 * 2 * Math.atan2(Math.sqrt(Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)), Math.sqrt(1-Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)));

        if (closest === undefined || closest.distance > dist) {
            closest = {cluster_pos: l, distance: dist, address: cluster[l]};
        }
    }

    //TODO This, like all address features in carmen is hardcoded for
    //US Style addresses. Once alternate address formats are added, this will
    //need to be changed ~ingalls
    feat.geometry = {
        type: 'Point',
        coordinates: feat.geometry.coordinates[closest.cluster_pos]
    }
    feat.properties['carmen:address'] = closest.address;
    return feat;
};
