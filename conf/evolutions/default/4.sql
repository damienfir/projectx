# --- !Ups
ALTER TABLE photos ADD COLUMN data bytea;

# --- !Downs
ALTER TABLE photos DROP COLUMN data;
