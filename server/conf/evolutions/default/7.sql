# --- !Ups
ALTER TABLE collections ADD COLUMN bookmodel integer;
ALTER TABLE collections ALTER COLUMN bookmodel SET DEFAULT 0;

# --- !Downs
ALTER TABLE collections DROP COLUMN bookmodel;