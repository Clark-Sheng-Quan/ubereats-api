import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "ubereats",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const schemaQueries = [
  `CREATE TABLE IF NOT EXISTS uber_oauth_tokens (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    access_token TEXT,
    expires_at BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
  )`,
  `CREATE TABLE IF NOT EXISTS uber_connections_db (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL UNIQUE,
    uber_store_id TEXT,
    uber_store_name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT,
    connected_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS shop_bindings_db (
    id BIGSERIAL PRIMARY KEY,
    pos_shop_id TEXT NOT NULL UNIQUE,
    pos_shop_name TEXT,
    uber_store_id TEXT,
    uber_store_name TEXT,
    bound_at TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS sync_history_db (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    status TEXT,
    message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS uber_menus_local (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    uber_menu_id TEXT NOT NULL,
    menu_title TEXT,
    category_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    service_availability JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_menu JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, uber_menu_id)
  )`,
  `CREATE TABLE IF NOT EXISTS uber_categories_local (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    uber_category_id TEXT NOT NULL,
    category_name TEXT,
    raw_category JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, uber_category_id)
  )`,
  `CREATE TABLE IF NOT EXISTS uber_items_local (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    uber_item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    category TEXT,
    option_summary TEXT,
    modifier_group_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_minor INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    raw_item JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, uber_item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS uber_modifier_groups_local (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    uber_modifier_group_id TEXT NOT NULL,
    modifier_group_name TEXT,
    raw_modifier_group JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, uber_modifier_group_id)
  )`,
  `ALTER TABLE uber_items_local ADD COLUMN IF NOT EXISTS modifier_group_ids JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `CREATE TABLE IF NOT EXISTS item_mappings (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    pos_item_id TEXT NOT NULL,
    pos_item_name TEXT,
    uber_item_id TEXT NOT NULL,
    uber_item_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, pos_item_id),
    UNIQUE (shop_id, uber_item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS option_mappings (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    pos_option_id TEXT NOT NULL,
    pos_option_name TEXT,
    uber_option_id TEXT NOT NULL,
    uber_option_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, pos_option_id),
    UNIQUE (shop_id, uber_option_id)
  )`,
  `CREATE TABLE IF NOT EXISTS option_item_mappings (
    id BIGSERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL,
    pos_option_id TEXT NOT NULL,
    pos_option_item_id TEXT NOT NULL,
    pos_option_item_name TEXT,
    uber_option_id TEXT NOT NULL,
    uber_option_item_id TEXT NOT NULL,
    uber_option_item_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, pos_option_item_id),
    UNIQUE (shop_id, uber_option_item_id)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_uber_menus_local_shop_id ON uber_menus_local (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_uber_categories_local_shop_id ON uber_categories_local (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_uber_items_local_shop_id ON uber_items_local (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_uber_modifier_groups_local_shop_id ON uber_modifier_groups_local (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_uber_connections_db_shop_id ON uber_connections_db (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_shop_bindings_db_pos_shop_id ON shop_bindings_db (pos_shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_shop_bindings_db_uber_store_id ON shop_bindings_db (uber_store_id)",
  "CREATE INDEX IF NOT EXISTS idx_sync_history_db_shop_id ON sync_history_db (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_item_mappings_shop_id ON item_mappings (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_option_mappings_shop_id ON option_mappings (shop_id)",
  "CREATE INDEX IF NOT EXISTS idx_option_item_mappings_shop_id ON option_item_mappings (shop_id)",
];

export async function initDatabase() {
  try {
    for (const query of schemaQueries) {
      await pool.query(query);
    }
    console.log("[db] PostgreSQL connected and schema is ready");
  } catch (error) {
    console.error("[db] Failed to initialize PostgreSQL schema:", error.message);
  }
}

export async function dbQuery(queryText, values = []) {
  return pool.query(queryText, values);
}

export async function withDbTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}
