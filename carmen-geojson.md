carmen geojson
==============
Carmen returns results as a [GeoJSON](http://geojson.org/) `FeatureCollection`:

    {
        "type": "FeatureCollection",
        "query": ["austin"],
        "features": [
            {
                "type": "Feature",
                "id": "place.4201",
                "text": "Austin",
                "place_name": "Austin, Texas, United States",
                "place_type": [ "place" ],
                "bbox": [-97.9383829999999, 30.098659, -97.5614889999999, 30.516863],
                "center": [-97.7559964, 30.3071816],
                "geometry": {
                    "type": "Point",
                    "coordinates": [-97.7559964, 30.3071816]
                },
                "properties": {
                    "title": "Austin",
                    "type": "city",
                    "score": 600000790107194.8
                },
                "context": [
                    {
                        "id": "province.293",
                        "text": "Texas"
                    },
                    {
                        "id": "country.51",
                        "text": "United States"
                    }
                ]
            },
            ...
        ]
    }

The GeoJSON object contains the following additional keys:

key | description
--- | ---
query | Array of tokens from input query.
attribution | Optional. any source attribution for result set.

Each feature in the FeatureCollection has the following additional keys:

key | description
--- | ---
id | Id of the feature of the form `{index}.{id}` where index is the id/handle of the datasource that contributed the result.
text | Text representing the feature (e.g. "Austin").
place_name | Human-readable text representing the full result hierarchy (e.g. "Austin, Texas, United States").
place_type | An array of index types that this feature may be returned as. Most features have only one type matching its id.
bbox | Optional. Array bounding box of the form [minx,miny,maxx,maxy].
address | Where applicable. Contains the housenumber for the returned feature
center | Array of the form [lon,lat].
context | Array representing a hierarchy of parents. Each parent includes `id`, `text` keys.

### Feature properties

Carmen makes no specifications nor guarantees about the [properties](http://geojson.org/geojson-spec.html#feature-objects) of each feature object. Feature properties are passed directly from indexes and may vary by feature and datasource.

### Additional notes

- **Forward geocodes** return features ordered by most relevant to least relevant to the input query.
- **Reverse geocodes** return features in order of index hierarchy, usually ordered from most specific features to least specific features that overlap with the queried `lon,lat` pair.

