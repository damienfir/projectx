# --- !Ups

CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(255)
);

CREATE TABLE collections (
  id    SERIAL PRIMARY KEY,
  hash  VARCHAR(255)
);

CREATE TABLE photos (
  id    SERIAL PRIMARY KEY,
  hash  VARCHAR(255)
);

CREATE TABLE users_collections (
  user_id       INT REFERENCES users(id),
  collection_id INT REFERENCES collections(id),
  PRIMARY KEY   (user_id, collection_id)
);

CREATE TABLE collections_photos (
  collection_id INT REFERENCES collections(id),
  photo_id      INT REFERENCES photos(id),
  PRIMARY KEY   (collection_id, photo_id)
);


# --- !Downs

DROP TABLE users;
DROP TABLE collections;
DROP TABLE photos;
DROP TABLE users_collections;
DROP TABLE collections_photos;
