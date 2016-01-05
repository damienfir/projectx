# --- !Ups

CREATE TABLE users
(
  email character varying(256),
  id serial NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE collections
(
  id serial NOT NULL,
  name character varying(256),
  CONSTRAINT collections_pkey PRIMARY KEY (id)
);

CREATE TABLE photos
(
  id serial NOT NULL,
  hash character varying(64),
  collection_id integer,
  CONSTRAINT photos_pkey PRIMARY KEY (id),
  CONSTRAINT photos_collection_id_fkey FOREIGN KEY (collection_id)
      REFERENCES collections (id)
);

CREATE TABLE compositions
(
  id serial NOT NULL,
  collection_id integer,
  tiles jsonb,
  photos jsonb,
  CONSTRAINT compositions_pkey PRIMARY KEY (id),
  CONSTRAINT compositions_collection_id_fkey FOREIGN KEY (collection_id)
    REFERENCES collections (id)
);


CREATE TABLE usercollectionrelations
(
  user_id integer,
  collection_id integer,
  CONSTRAINT usercollectionrelations_collection_id_fkey FOREIGN KEY (collection_id)
    REFERENCES collections (id),
  CONSTRAINT usercollectionrelations_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id)
);


# --- !Downs
DROP TABLE users;
DROP TABLE collections;
DROP TABLE photos;
DROP TABLE compositions;
DROP TABLE usercollectionrelations;
