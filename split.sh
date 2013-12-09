#!/usr/bin/env bash
set -e -u

# takes a sqlite full of carmen-redy data (assumes unique `name` field)
# and outputs one topojson for every record

if [ $1 != 'explode' -a $1 != 'collapse' ]; then
    echo "Usage: $0 <explode | collapse> <file | dir>"
    exit 1
fi

if [ $1 == 'explode' ]
    then
    for country in $(sqlite3 $2 "select name from data order by name" | sed 's/\ /-/g')
    do
        j=$(echo $country | sed 's/-/ /g')
        ogr2ogr \
            -f "GeoJSON" \
            -s_srs EPSG:3857 \
            -t_srs EPSG:4326 \
            -sql "select * from data where name = '$j'" \
            json/${country}.geojson $2

        topojson \
            --no-quantization \
            -p name,search,lat,lon,bounds,area \
            json/${country}.geojson \
            -o json/${country}.json

        rm -rf json/${country}.geojson
    done
fi 

# finds all the jsons in a specified direcotry, makes them in to one sqlite file

if [ $1 == 'collapse' ]
    then
    # TODO : test if files are topojson?
    mkdir -p geojson
    geojson -o geojson ${2}/*json
    echo "done converting to geojson, creating sqlite file"
    for country in $( ls geojson/*.json )
    do
        if test -e "all.sqlite"; then
            echo "merging $country into all.sqlite"
            ogr2ogr \
                -f "SQLite" \
                -nln data \
                -s_srs EPSG:4326 \
                -t_srs EPSG:3857 \
                -update -append \
                all.sqlite \
                $country
        else
            echo "creating all.sqlite"
            ogr2ogr \
                -f "SQLite" \
                -nln data \
                -s_srs EPSG:4326 \
                -t_srs EPSG:3857 \
                all.sqlite \
                $country
        fi
    done
    rm -rf geojson
fi