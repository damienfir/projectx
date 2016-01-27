# --- !Ups
ALTER TABLE compositions DROP COLUMN photos;

# --- !Downs
ALTER TABLE compositions ADD COLUMN photos jsonb;
