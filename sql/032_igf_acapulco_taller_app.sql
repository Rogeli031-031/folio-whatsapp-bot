-- Pilot tables only. Apply separately; never run at server startup.
BEGIN;
CREATE TABLE arr.igf_taller_acapulco_app_roster (
  device text NOT NULL,
  unit_id integer NOT NULL CHECK (unit_id > 0),
  starts_on date NOT NULL,
  ends_before date CHECK (ends_before > starts_on),
  eco text NOT NULL CHECK (eco ~ '^AT-[0-9]{3}$' AND eco <> 'AT-000'),
  unit_type text NOT NULL CHECK (unit_type IN ('Pipa','Cilindrera')),
  PRIMARY KEY (device, unit_id, starts_on)
);
CREATE TABLE arr.igf_taller_acapulco_app_event (
  device text NOT NULL,
  event_id text NOT NULL CHECK (event_id ~ '^[0-9a-f]{32}$'),
  seq integer NOT NULL CHECK (seq > 0),
  unit_id integer NOT NULL CHECK (unit_id > 0),
  occurred timestamp NOT NULL,
  movement text NOT NULL,
  section text,
  claimed_company text CHECK (claimed_company IN ('E9','E10')),
  company text,
  eco text,
  held_reason text,
  fingerprint text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (device, event_id),
  UNIQUE (device, seq),
  CHECK ((movement='entry' AND section IS NOT NULL AND section IN ('Mayor','Menor')) OR (movement='exit' AND section IS NULL)),
  CHECK ((held_reason IS NULL AND company IS NOT NULL AND company IN ('E9','E10') AND eco IS NOT NULL) OR
         (held_reason IS NOT NULL AND company IS NULL AND eco IS NULL))
);
REVOKE ALL ON arr.igf_taller_acapulco_app_roster, arr.igf_taller_acapulco_app_event FROM PUBLIC;
COMMIT;
