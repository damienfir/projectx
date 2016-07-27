# --- !Ups
CREATE TABLE photos_data
(
    photo_id integer,
    data bytea
);

INSERT INTO photos_data (photo_id, data)
SELECT id, data
FROM photos;

ALTER TABLE photos DROP COLUMN data;

# --- !Downs
ALTER TABLE photos ADD COLUMN data bytea;
DROP TABLE photos_data;