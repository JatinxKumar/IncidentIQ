const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();

    // Create tables matching the schema definitions
    const sql = [
        // users table
        `CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" varchar NOT NULL UNIQUE,
      "username" varchar NOT NULL,
      "password_hash" varchar NOT NULL,
      "role" varchar NOT NULL DEFAULT 'analyst',
      "is_active" boolean NOT NULL DEFAULT true,
      "last_login_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
        // repositories table
        `CREATE TABLE IF NOT EXISTS "repositories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
        // telemetry table
        `CREATE TABLE IF NOT EXISTS "telemetry" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "repository_id" uuid NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
      "event_type" varchar NOT NULL,
      "metadata" jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`,
        // incidents table
        `CREATE TABLE IF NOT EXISTS "incidents" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" varchar NOT NULL,
      "severity" varchar NOT NULL,
      "status" varchar NOT NULL,
      "created_by" uuid NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`,
        // incidents status enum check
        `ALTER TABLE "incidents" ADD CONSTRAINT chk_incident_severity CHECK (
      severity IN ('low', 'medium', 'high', 'critical')
    )`,
        `ALTER TABLE "incidents" ADD CONSTRAINT chk_incident_status CHECK (
      status IN ('open', 'investigating', 'resolved', 'closed')
    )`,
        // indexes
        `CREATE INDEX IF NOT EXISTS idx_telemetry_user_repo ON "telemetry"("user_id", "repository_id")`,
        `CREATE INDEX IF NOT EXISTS idx_telemetry_created ON "telemetry"("created_at")`,
        `CREATE INDEX IF NOT EXISTS idx_incidents_status ON "incidents"("status")`,
        `CREATE INDEX IF NOT EXISTS idx_incidents_severity ON "incidents"("severity")`,
        `CREATE INDEX IF NOT EXISTS idx_repositories_owner ON "repositories"("owner_id")`,
    ];

    for (const query of sql) {
        try {
            await client.query(query);
            console.log('Executed:', query.substring(0, 60) + '...');
        } catch (e) {
            console.error('Error executing query:', e.message);
        }
    }

    console.log('Schema initialized successfully');
    await client.end();
}

main().catch(console.error);