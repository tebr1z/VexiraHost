CREATE TABLE domains (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  master VARCHAR(128) DEFAULT NULL,
  last_check INT DEFAULT NULL,
  type VARCHAR(8) NOT NULL,
  notified_serial BIGINT DEFAULT NULL,
  account VARCHAR(40) DEFAULT NULL,
  options TEXT DEFAULT NULL,
  catalog VARCHAR(255) DEFAULT NULL,
  CONSTRAINT domains_name_lowercase CHECK (name = lower(name))
);
CREATE UNIQUE INDEX domains_name_index ON domains(name);
CREATE INDEX catalog_idx ON domains(catalog);

CREATE TABLE records (
  id BIGSERIAL PRIMARY KEY,
  domain_id INT DEFAULT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT NULL,
  type VARCHAR(10) DEFAULT NULL,
  content VARCHAR(65535) DEFAULT NULL,
  ttl INT DEFAULT NULL,
  prio INT DEFAULT NULL,
  disabled BOOL DEFAULT false,
  ordername VARCHAR(255),
  auth BOOL DEFAULT true,
  CONSTRAINT records_name_lowercase CHECK (name = lower(name))
);
CREATE INDEX rec_name_index ON records(name);
CREATE INDEX nametype_index ON records(name,type);
CREATE INDEX domain_id ON records(domain_id);
CREATE INDEX orderindex ON records(ordername);

CREATE TABLE supermasters (
  ip INET NOT NULL,
  nameserver VARCHAR(255) NOT NULL,
  account VARCHAR(40) NOT NULL,
  PRIMARY KEY(ip, nameserver)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  domain_id INT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL,
  modified_at INT NOT NULL,
  account VARCHAR(40) DEFAULT NULL,
  comment TEXT NOT NULL
);
CREATE INDEX comments_name_type_idx ON comments(name, type);
CREATE INDEX comments_order_idx ON comments(domain_id, modified_at);

CREATE TABLE domainmetadata (
  id SERIAL PRIMARY KEY,
  domain_id INT REFERENCES domains(id) ON DELETE CASCADE,
  kind VARCHAR(32),
  content TEXT
);
CREATE INDEX domainmetadata_idx ON domainmetadata(domain_id, kind);

CREATE TABLE cryptokeys (
  id SERIAL PRIMARY KEY,
  domain_id INT REFERENCES domains(id) ON DELETE CASCADE,
  flags INT NOT NULL,
  active BOOL,
  published BOOL DEFAULT true,
  content TEXT
);
CREATE INDEX domainidindex ON cryptokeys(domain_id);

CREATE TABLE tsigkeys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  algorithm VARCHAR(50),
  secret VARCHAR(255),
  CONSTRAINT tsigkeys_name_algorithm_unique UNIQUE (name, algorithm)
);
