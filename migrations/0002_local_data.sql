CREATE TABLE IF NOT EXISTS local_records (
 entity TEXT NOT NULL,
 id TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data)),
 published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
 PRIMARY KEY(entity,id)
);
CREATE INDEX IF NOT EXISTS local_records_entity ON local_records(entity,published);
CREATE INDEX IF NOT EXISTS local_observation_scope ON local_records(
 entity,json_extract(data,'$.domain'),json_extract(data,'$.crop'),
 json_extract(data,'$.geography'),json_extract(data,'$.season'),json_extract(data,'$.year')
);
