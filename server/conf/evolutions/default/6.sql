# --- !Ups
ALTER TABLE compositions ALTER COLUMN tiles TYPE text USING tiles::json#>>'{}'


# --- !Downs
ALTER TABLE compositions ALTER COLUMN tiles TYPE text USING to_json(tiles)