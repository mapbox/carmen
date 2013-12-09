CREATE OR REPLACE FUNCTION ST_WrapX(geom_in geometry, cutx float8, amount float8)
RETURNS geometry AS $$
DECLARE
    geom_out geometry;
    blade geometry;
    srid int;
    ymin float8;
    ymax float8;
BEGIN
    SELECT ST_SRID(geom_in) INTO srid;

    ymin := ST_YMin(geom_in);
    ymax := ST_YMax(geom_in);
    blade := ST_SetSrid(ST_MakeLine(
            ST_MakePoint(cutx, ymin-1),
            ST_MakePoint(cutx, ymax+1)), srid);

    -- RAISE NOTICE 'Blade is %', ST_AsText(blade);

    IF amount = 0 THEN
            RETURN geom_in;
    ELSIF amount < 0 THEN
            -- move left what overlaps or is NOT
            -- on the right of cutx
            SELECT ST_Union(component) INTO geom_out FROM (
                    SELECT
                    CASE WHEN geom &> ST_SetSrid(ST_MakePoint(cutx, 0), srid) THEN
                            ST_Translate(geom, amount, 0)
                    ELSE
                            geom
                    END as component
                    FROM (
                            SELECT (ST_Dump(ST_Split(geom_in, blade))).geom
                    ) as dump
            ) as processed;
    ELSE -- amount > 0
            -- move right what overlaps or is NOT
            -- on the left of cutx
            SELECT ST_Union(component) INTO geom_out FROM (
                    SELECT
                    CASE WHEN geom &< ST_SetSrid(ST_MakePoint(cutx, 0), srid) THEN
                            ST_Translate(geom, amount, 0)
                    ELSE
                            geom
                    END as component
                    FROM (
                            SELECT (ST_Dump(ST_Split(geom_in, blade))).geom
                    ) as dump
            ) as processed;
    END IF;

    RETURN geom_out;
END
$$ LANGUAGE 'plpgsql';