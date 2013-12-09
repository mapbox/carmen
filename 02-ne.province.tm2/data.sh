#!/bin/bash
set -e -u

TMP=`mktemp -d tmpXXXX`
createdb -U postgres -T template_postgis carmen_ne_province
curl -sfo $TMP/10m-admin-1-states-provinces-shp.zip http://mapbox-geodata.s3.amazonaws.com/natural-earth-1.4.0/cultural/10m-admin-1-states-provinces-shp.zip
unzip -q $TMP/10m-admin-1-states-provinces-shp.zip -d $TMP
ogr2ogr --config SHAPE_ENCODING UTF-8 -s_srs EPSG:900913 -t_srs EPSG:4326 -nlt MULTIPOLYGON -nln import -f "PostgreSQL" PG:"host=localhost user=postgres dbname=carmen_ne_province" $TMP/10m-admin-1-states-provinces-shp.shp

echo "
CREATE TABLE data(_id SERIAL PRIMARY KEY, name VARCHAR, _text VARCHAR, lon FLOAT, lat FLOAT, bounds VARCHAR, area FLOAT);
SELECT AddGeometryColumn('public', 'data', 'geometry', 4326, 'MULTIPOLYGON', 2);
INSERT INTO data (_id, geometry, name, _text) SELECT ogc_fid, st_setsrid(wkb_geometry,4326), name_1 AS name, name_1||','||postal AS _text FROM import;
UPDATE data SET lon = st_x(st_pointonsurface(geometry)), lat = st_y(st_pointonsurface(geometry)), bounds = st_xmin(geometry)||','||st_ymin(geometry)||','||st_xmax(geometry)||','||st_ymax(geometry);
UPDATE data SET area = 0;
UPDATE data SET area = st_area(st_geogfromwkb(geometry)) where st_within(geometry,st_geomfromtext('POLYGON((-180 -90, -180 90, 180 90, 180 -90, -180 -90))',4326));
-- Manual adjustments.
UPDATE data SET lon = -77.0170942, lat = 38.9041485 WHERE name = 'District of Columbia';
UPDATE data SET _text = 'New York,New York State,NY' WHERE name = 'New York';
UPDATE data SET _text = 'Washington,Washington State,WA' WHERE name = 'Washington';
" | psql -U postgres carmen_ne_province

# cleanup
rm -rf $TMP
