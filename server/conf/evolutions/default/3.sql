# --- !Ups
ALTER TABLE collections ADD COLUMN hash character varying(255);

# --- !Downs
ALTER TABLE collections DROP COLUMN hash;
