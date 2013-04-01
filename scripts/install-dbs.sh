#!/usr/bin/env bash

DIR=`dirname $0`
TILE_DIR=$DIR/../tiles

if [ ! -d "$TILE_DIR" ]; then
    mkdir "$TILE_DIR"
fi

TILES="osm-places ne-countries ne-provinces tiger-zipcodes"

for NAME in $TILES; do
  if [ ! -f "$TILE_DIR/$NAME.mbtiles" ]; then
    echo "Downloading $NAME..."
    curl -s -o "$TILE_DIR/$NAME.mbtiles" "http://mapbox-carmen.s3.amazonaws.com/carmen/$NAME.mbtiles"
  fi
done

for NAME in $TILES; do
  if [ -z "$(sqlite3 "$TILE_DIR/$NAME.mbtiles" "select 1 from sqlite_master where name = 'carmen' and type = 'table'")" ]; then
    echo "Indexing $NAME..."
    $DIR/carmen-index.js "$TILE_DIR/$NAME.mbtiles"
  fi
done
