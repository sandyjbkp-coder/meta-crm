-- OAuth states and additional tables for PostgreSQL

-- OAuth state store (persisted, single-use, time-limited)
CREATE TABLE meta_oauth_states (
  id SERIAL PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  redirect_uri TEXT,
  scopes TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_meta_oauth_states_state ON meta_oauth_states(state);
CREATE INDEX idx_meta_oauth_states_expires ON meta_oauth_states(expires_at);
CREATE INDEX idx_meta_oauth_states_used ON meta_oauth_states(used);

-- Ensure unique index on meta_webhook_events for leadgen_id + event_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_webhook_events_leadgen_event ON meta_webhook_events(leadgen_id, event_id);

-- Ensure integration_id column exists on meta_capi_events
ALTER TABLE meta_capi_events ADD COLUMN IF NOT EXISTS integration_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_meta_capi_events_integration_id ON meta_capi_events(integration_id);

-- Dead letter queue for failed CAPI events (already in 002, ensure it exists)
CREATE TABLE IF NOT EXISTS meta_capi_dead_letter (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  integration_id INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  event_time TIMESTAMP NOT NULL,
  payload TEXT NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (integration_id) REFERENCES meta_integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meta_capi_dead_letter_event_id ON meta_capi_dead_letter(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_dead_letter_created_at ON meta_capi_dead_letter(created_at);

-- Webhook processing queue (PostgreSQL-backed, survives restarts)
CREATE TABLE IF NOT EXISTS meta_webhook_queue (
  id SERIAL PRIMARY KEY,
  leadgen_id TEXT NOT NULL,
  form_id TEXT,
  page_id TEXT,
  ad_id TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  event_id TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  next_retry_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_webhook_queue_event_id ON meta_webhook_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_queue_status ON meta_webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_queue_next_retry ON meta_webhook_queue(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_queue_leadgen_id ON meta_webhook_queue(leadgen_id);
