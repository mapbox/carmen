# Data Sources

Carmen was designed with the goal of being agnostic to how its underlying data is stored. This goal has been acheived to some degree, but there's still work to be done. We make use of the tilelive ecosystem, but

## CarmenSource interfaces

The `CarmenSource` interface specification is our current solution.

### Base: tilelive

We make use of [tilelive.js](https://github.com/mapbox/tilelive), which supports streaming map tiles to and from various custom data formats with one consistent API. Data source interfaces for carmen are implementations of the [Tilesource/Tilesink spec](https://github.com/mapbox/tilelive/blob/master/API.md).

Using already-available [tilelive modules](https://github.com/mapbox/tilelive#awesome-tilelive-modules), vector tiles can be sourced from different backend storage solutions. Currently, carmen supports the following modules:

- [tilelive-s3](https://github.com/mapbox/tilelive-s3)
- [node-mbtiles](https://github.com/mapbox/node-mbtiles)
- [`MemSource`](./api.md#memsource)

### Extension

As noted above, carmen's data source interfaces implement the `tilelive.Tilesource` architecture. They also extend it, however, requiring additional functions not specified by tilelive. This extended specification is called `CarmenSource`, and is documented in detail in the [API doc](./api.md#carmensource).

The reason that many tilelive modules won't work with carmen is that carmen expects them to conform to the `CarmenSource` specification.  In the modules that are supported, these requirements have been added on the modules themselves. See, for example, [this addition to `node-mbtile`](https://github.com/mapbox/node-mbtiles/commit/51c598ddaca615ed3fea08f50d343de6a6d43053).

## Source Metadata

The following metadata keys have special consequences for a CarmenSource when set (using the `putInfo` method specified for all tilelive sources).

| attribute                 | description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| maxzoom                   | The assumed zoom level of the zxy geocoder grid index.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| geocoder_stack            | Stack(s) of the source. At the time of writing, this corresponds roughly to the countries associated with it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| geocoder_version          | Required. Should be set to **9** for carmen@rocksdb. Index versions <= 1 can be used for reverse geocoding but not forward.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| geocoder_layer            | Optional. A string in the form `layer.field`. `layer` is used to determine what layer to query for context operations. Defaults to the first layer found in a vector source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| geocoder_address          | Optional. A flag (0/1) to indicate that an index can geocode address (house numbers) queries. Defaults to 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| geocoder_format           | Optional. A string containing how to format the resulting `place_name` field. Ie: `{address._number} {address._name} {place._name}` where `address`/`place` are the extid of a given index and `_name`/`_number` are internal carmen designators to replace with the first text value from `carmen:text` & the matched address. This string can also map to string properties on the geojson. ie `{extid.title}` would be replace with `feature.properties.title` for the indexed GeoJSON for the given extid. By adding multiple `geocoder_format` keys with a language tag (e.g. `geocoder_format_zh`), multiple formats can be supported and engaged by using a `language` flag. See `test/geocoder-unit.address-format.test.js` for more examples. |
| geocoder_resolution       | Optional. Integer bonus against maxzoom used to increase the grid index resolution when indexing. Defaults to 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| geocoder_openlocationcode | Optional. When `true`, results that do not enclude a `pluscode` property will have one automatically generated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| geocoder_group            | Optional + advanced. For indexes that share the exact same tile source, IO operations can be grouped. No default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| geocoder_tokens           | Optional + advanced. An object with a 1:1 from => to mapping of token strings to replace in input queries. e.g. 'Streets' => 'St'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| geocoder_name             | Optional + advanced. A string to use instead of the provided config index id/key allowing multiple indexes to be treated as a single "logical" index.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| geocoder_type             | Optional + advanced. A string to be used instead the config index id/key. Omission of this falls back to geocoder_name and then to the id.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| geocoder_types            | Optional + advanced. An array of type strings. Only necessary for indexes that include multitype features.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| geocoder_cachesize        | Optional + advanced. Maximum number of shards to allow in the `carmen-cache` message cache. Defaults uptream to 65536 (maximum number of possible shards).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| geocoder_address_order    | Optional + advanced. A string that can be set to `ascending` or `descending` to indicate the expected ordering of address components for an index. Defaults to `ascending`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| geocoder_inherit_score    | Optional + advanced. Set to `true` if features from this index should appear above other identically (ish) named parent features that are part of its context (e.g. promote New York (city) promoted above New York (state)). Defaults to `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| geocoder_universal_text   | Optional + advanced. Set to `true` if features from this index should be considered language agnostic (e.g. postcodes). They will bypass the `languageMode=strict` flag and the `carmen:text` field will be treated as compatible with any language. Defaults to `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| geocoder_reverse_mode     | Optional + advanced. When `true`, results are sorted by score or distance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

*Note: The sum of maxzoom + geocoder_resolution must be no greater than 14.*

## Document Structure

Each document is a valid geojson `Feature`. Each feature should contain a unique `id` field
as well as the following settings in the `properties` object.

| attribute                     | description                                                                                                                                                                                                                                                                                                                    |
|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `carmen:text`                 | Default text to index for this feature. Synonyms, translations, etc. should be separated using commas.                                                                                                                                                                                                                         |
| `carmen:text_{language code}` | Localized to index for this feature. Synonyms, translations, etc. should be separated using commas and will be synonymized with `carmen:text`.                                                                                                                                                                                 |
| `carmen:geocoder_stack`       | Stack of the feature. At the time of writing, this corresponds roughly to the countries associated with it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `carmen:center`               | Optional. An array in the form [lon,lat]. center must be on the geometry surface, or the center will be recalculated.                                                                                                                                                                                                          |
| `carmen:score`                | Optional. A float or integer to sort equally relevant results by. Higher values appear first. Docs with negative scores can contribute to a final result but are only returned if included in matches of a forward search query.                                                                                               |
| `carmen:addressnumber`        | Optional. Used with `geocoder_address`. An array of addresses corresponding to the order of their geometries in the `GeometryCollection`                                                                                                                                                                                       |
| `carmen:types`                | Optional. An array of types associating this feature with one or more feature classes defined by the source-level `geocoder_type` key. By setting multiple types a feature can move between various feature levels depending on the query and results. If omitted, defaults to the `geocoder_type` set by the feature's index. |

### Example Documents

#### Polygon Example

```JSON
{
  "id": 4,
  "type": "Feature",
  "properties": {
    "carmen:text": "India",
    "iso2": "IN",
    "name": "India",
    "population": 1166079217,
    "carmen:center": [
      80.22679613492177,
      21.785546732636085
    ]
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [
          67.50144828884673,
          36.59644084422347
        ],
        [
          101.24855171115327,
          36.59644084422347
        ],
        [
          101.24855171115327,
          5.617434108002064
        ],
        [
          67.50144828884673,
          5.617434108002064
        ],
        [
          67.50144828884673,
          36.59644084422347
        ]
      ]
    ]
  }
}
```

### TIGER address interpolation

Carmen has basic support for interpolating geometries based on TIGER address
range data. To make use of this feature the following additional keys must be
present in the properties object.

attribute           | description
--------------------|------------
`carmen:rangetype`  | The type of range data available. Only possible value atm is 'tiger'.
`carmen:lfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER LFROMHN field.
`carmen:ltohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER LTOHN field.
`carmen:rfromhn`    | Single (LineString) or array of values (GeometryCollection) of TIGER RFROMHN field.
`carmen:rtohn`      | Single (LineString) or array of values (GeometryCollection) of TIGER RTOHN field.
`carmen:parityl`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYL field.
`carmen:parityr`    | Single (LineString) or array of values (GeometryCollection) of TIGER PARITYR field.

Here's an example:

```JSON
{
  "id": "7654",
  "type": "Feature",
  "properties": {
    "carmen:text": "Main Street",
    "carmen:center": [ -97.1, 37 ],
    "carmen:score": 99,
    "carmen:rangetype": "tiger",
    "carmen:lfromhn": [ "100", "200" ],
    "carmen:ltohn": ["198", "298"],
    "carmen:rfromhn": ["101", "201"],
    "carmen:rtohn": ["199", "299"],
    "carmen:parityl": ["E", "E"],
    "carmen:parityr": ["O", "B"],
  },
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [ -97, 37 ],
        [ -97.2, 37 ],
        [ -97.2, 37.2 ]
      ],
      [
        [ -97.2, 37.2 ],
        [ -97.4, 37.2 ],
        [ -97.4, 37.4 ]
      ]
    ]
  }
}
```

