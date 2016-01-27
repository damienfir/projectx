# --- !Ups
ALTER TABLE compositions DROP COLUMN tiles;
ALTER TABLE compositions ADD COLUMN tiles text;


# --- !Downs
ALTER TABLE compositions DROP COLUMN tiles;
ALTER TABLE compositions ADD COLUMN tiles jsonb;
