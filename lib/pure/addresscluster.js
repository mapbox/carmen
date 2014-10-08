module.exports = function(feature, address) {

    var cluster;
    if (typeof feature._cluster === "string" )
        cluster = JSON.parse(feature._cluster);
    else
        cluster = feature._cluster;

    //Check if point exists
    if (!cluster[address]) return;

    //Check is cluster is pt geom
    var geom;

    if (typeof cluster[address] === "string")
        geom = JSON.parse(cluster[address]);
    else
        geom = cluster[address];

    if (
        geom.type !== "Point" ||
        geom.coordinates.length !== 2
    ) return;

    return {
        type:'Point',
        coordinates: [
            geom.coordinates[0],
            geom.coordinates[1]
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        })
    };
};

module.exports.reverse = function(feat,query) {
    //Convert address clusters  into points

        var lon = query[0],
            lat = query[1];

        var cluster;
        if (typeof feat._cluster === "string" )
            cluster = JSON.parse(feat._cluster);
        else
            cluster = feat._cluster;
        var addresses = Object.keys(cluster);
        var distResult = [];

        var l = addresses.length;
        while(l--) {
            var lon2 = (typeof cluster[addresses[l]] === "string") ? JSON.parse(cluster[addresses[l]]).coordinates[0] : cluster[addresses[l]].coordinates[0],
                lat2 = (typeof cluster[addresses[l]] === "string") ? JSON.parse(cluster[addresses[l]]).coordinates[1] : cluster[addresses[l]].coordinates[1];
            var phi1 = lat * (Math.PI / 180),
                phi2 = lat2 * (Math.PI / 180);
            var deltaPhi = (lat2-lat) * (Math.PI / 180),
                deltaLambda = (lon2-lon) * (Math.PI / 180);
            var dist = 6371 * 2 * Math.atan2(Math.sqrt(Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)), Math.sqrt(1-Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)));
            distResult.push({distance: dist, address: addresses[l]});
        }

        distResult.sort(function(a,b){
            if (a.distance < b.distance) return -1;
            else if (a.distance > b.distance) return 1;
            else return 0;
        });

        //TODO This, like all address features in carmen is hardcoded for
        //US Style addresses. Once alternate address formats are added, this will
        //need to be changed ~ingalls
        feat._text = distResult[0].address + " " + feat._text;
        feat._geometry = (typeof cluster[distResult[0].address] === "string") ? JSON.parse(cluster[distResult[0].address]) : cluster[distResult[0].address];

        return feat;

};
