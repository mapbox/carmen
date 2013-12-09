#!/bin/bash
set -e -u

TMP=`mktemp -d tmpXXXX`
createdb -U postgres -T template_postgis $TMP
curl -sfo $TMP/qs_adm0.zip http://static.quattroshapes.com/qs_adm0.zip
unzip -q $TMP/qs_adm0.zip -d $TMP
ogr2ogr -nlt MULTIPOLYGON -nln import -f "PostgreSQL" PG:"host=localhost user=postgres dbname=$TMP" $TMP/qs_adm0.shp


echo "
CREATE TABLE data(id SERIAL PRIMARY KEY, name VARCHAR, search VARCHAR, population INTEGER, iso2 VARCHAR, lon FLOAT, lat FLOAT, bounds VARCHAR);
SELECT AddGeometryColumn('public', 'data', 'geometry', 4326, 'MULTIPOLYGON', 2);
INSERT INTO data (id, geometry, name, search, population, iso2) SELECT ogc_fid, st_setsrid(wkb_geometry,4326), qs_adm0 AS name, qs_adm0 AS search, qs_pop, qs_iso_cc FROM import;
UPDATE data SET lon = st_x(st_pointonsurface(geometry)), lat = st_y(st_pointonsurface(geometry)), bounds = st_xmin(geometry)||','||st_ymin(geometry)||','||st_xmax(geometry)||','||st_ymax(geometry);
" | psql -U postgres $TMP

ogr2ogr -s_srs EPSG:4326 -t_srs EPSG:900913 -f "SQLite" -nln data qs-countries.sqlite PG:"host=localhost user=postgres dbname=$TMP" data
dropdb -U postgres $TMP
rm -rf $TMP
 
echo "
UPDATE data SET search='United States of America, United States, America, USA, US' WHERE iso2 = 'US';
UPDATE data SET search='United Kingdom, UK' WHERE iso2 = 'GB';
UPDATE data SET search='Canada, CA' WHERE iso2 = 'CA';
UPDATE data SET search='Colombia, Columbia' WHERE iso2 = 'CO';
UPDATE data SET search='Australia, AU' WHERE iso2 = 'AU';
UPDATE data SET search='Germany, DE' WHERE iso2 = 'DE';
UPDATE data SET search='France, FR' WHERE iso2 = 'FR';
UPDATE data SET search='South Korea, Korea' WHERE iso2 = 'KR';
UPDATE data SET search='Democratic Republic of the Congo, DRC' WHERE iso2 = 'CD';
UPDATE data SET search='United Arab Emirates, UAE' WHERE iso2 = 'AE';
" | sqlite3 qs-countries.sqlite

echo "Written to qs-adm0.sqlite."
