#!/bin/bash
set -e -u

echo "setting up..."
TMP=`mktemp -d tmpXXXX`
createdb -U postgres -T template_postgis $TMP
echo "downloading..."
curl -sfo $TMP/qs_neighborhoods.zip http://static.quattroshapes.com/qs_neighborhoods.zip
unzip -q $TMP/qs_neighborhoods.zip -d $TMP

echo "importing..."
export PGCLIENTENCODING=latin1
ogr2ogr \
	-nlt MULTIPOLYGON \
	-nln import \
	-lco PRECISION=NO \
	-f "PostgreSQL" PG:"host=localhost user=postgres dbname=$TMP" \
	$TMP/qs_neighborhoods.shp

echo "cleaning..."
echo "
CREATE TABLE data(id SERIAL PRIMARY KEY, name VARCHAR, geometry GEOMETRY(Geometry, 4326), search VARCHAR, lon FLOAT, lat FLOAT, bounds VARCHAR, area FLOAT);
INSERT INTO data (id, geometry, name, search)
	SELECT ogc_fid, st_setsrid(wkb_geometry,4326), name AS name, coalesce(name||','||name_en||','||gn_name, name) AS search FROM import;
UPDATE data SET
    lon = st_x(st_pointonsurface(st_makevalid(geometry))),
    lat = st_y(st_pointonsurface(st_makevalid(geometry))),
    bounds = st_xmin(geometry)||','||st_ymin(geometry)||','||st_xmax(geometry)||','||st_ymax(geometry);
UPDATE data SET area = 0;
UPDATE data SET area = st_area(st_geogfromwkb(geometry)) where st_within(geometry,st_geomfromtext('POLYGON((-180 -90, -180 90, 180 90, 180 -90, -180 -90))',4326));
" | psql -U postgres $TMP

echo "exporting..."
ogr2ogr \
	-s_srs EPSG:4326 \
	-t_srs EPSG:900913 \
	-wrapdateline \
	-f "SQLite" \
	-nln data \
	qs-neighborhoods.sqlite \
	PG:"host=localhost user=postgres dbname=$TMP" data
echo "cleaning up..."
dropdb -U postgres $TMP
rm -rf $TMP

echo "Written to qs-neighborhoods.sqlite."# 
