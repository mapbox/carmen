#!/usr/bin/env bash

DIR=`dirname $0`
DIR=$DIR/../fixtures
FIXTURES="test-places test-countries test-provinces test-zipcodes test-context"

if [ ! -d "$DIR" ]; then
    mkdir "$DIR"
fi

for NAME in $FIXTURES; do
  if [ ! -f "$DIR/$NAME.csv" ]; then
    echo "Downloading fixture $NAME..."
    curl -s -o "$DIR/$NAME.csv" "http://mapbox-carmen.s3.amazonaws.com/carmen/$NAME.csv"
  fi
done
