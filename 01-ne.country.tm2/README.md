### Sources

- Natural Earth 1.4.0 10m-admin-0-countries

### Notes

    # Importing to PostGIS
    createdb -U postgres -T template_postgis countries
    ogr2ogr -f "PostgreSQL" PG:"host=localhost user=postgres dbname=countries" -nlt multipolygon countries.sqlite

    # Adding centroid lon/lat
    ALTER TABLE data ADD COLUMN lon DOUBLE PRECISION;
    ALTER TABLE data ADD COLUMN lat DOUBLE PRECISION;
    UPDATE data SET lon = X(ST_Transform(ST_Centroid(ST_GeomFromEWKB(wkb_geometry)),4326));
    UPDATE data SET lat = Y(ST_Transform(ST_Centroid(ST_GeomFromEWKB(wkb_geometry)),4326));

    # Back out
    ogr2ogr -f "SQLite" countries.sqlite PG:"host=localhost user=postgres dbname=countries"
