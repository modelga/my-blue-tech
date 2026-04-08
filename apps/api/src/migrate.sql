-- Timelines: named event channels owned by a user
CREATE TABLE IF NOT EXISTS timelines (
  id          TEXT        PRIMARY KEY,
  owner       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline entries: ordered events appended to a timeline
CREATE TABLE IF NOT EXISTS timeline_entries (
  id          TEXT        PRIMARY KEY,
  timeline_id TEXT        NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  seq         INTEGER     NOT NULL,
  payload     JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (timeline_id, seq)
);

-- Documents: Blue Documents with current state
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT        PRIMARY KEY,
  owner       TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  definition  JSONB       NOT NULL,
  state       JSONB,
  initialized BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document history: full audit log of events and resulting state
CREATE TABLE IF NOT EXISTS document_history (
  id          BIGSERIAL   PRIMARY KEY,
  document_id TEXT        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  seq         INTEGER     NOT NULL,
  event       JSONB       NOT NULL,
  diff        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, seq)
);

-- Notify on document state changes (used by SSE fan-out)
CREATE OR REPLACE FUNCTION notify_document_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify(
    'document_updated',
    json_build_object(
      'documentId', NEW.id,
      'seq',        (SELECT COALESCE(MAX(seq), 0) FROM document_history WHERE document_id = NEW.id),
      'event',      'state_changed'
    )::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_updated ON documents;
CREATE TRIGGER trg_document_updated
  AFTER UPDATE OF state ON documents
  FOR EACH ROW EXECUTE FUNCTION notify_document_updated();
