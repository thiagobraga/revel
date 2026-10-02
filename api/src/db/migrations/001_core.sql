CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('admin','editor')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE password_reset_tokens (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE preferences (user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE, theme text NOT NULL DEFAULT 'dark' CHECK(theme IN ('light','dark')), locale text NOT NULL DEFAULT 'pt-BR' CHECK(locale IN ('pt-BR','en')));
CREATE TABLE shows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, city text NOT NULL, venue text NOT NULL,
 starts_at timestamptz NOT NULL, ticket_url text, published boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shows_agenda ON shows(starts_at,id) WHERE published;
CREATE TABLE mutation_receipts (user_id uuid NOT NULL, key text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,key));
CREATE TABLE subscribers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,token_hash text UNIQUE NOT NULL,confirmed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
