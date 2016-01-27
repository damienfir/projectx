# --- !Ups
ALTER TABLE compositions ADD COLUMN index integer;


# --- !Downs
ALTER TABLE compositions DROP COLUMN index;
