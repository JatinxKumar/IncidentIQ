const path = require('node:path');
const pg = require(path.resolve(__dirname, '../node_modules/.pnpm/pg@8.22.0/node_modules/pg'));

async function main() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
  });
  await client.connect();
  console.log('Connected to PostgreSQL');

  // Add columns to user_integrations if not exist
  await client.query(`
    ALTER TABLE user_integrations 
    ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB;
  `);
  console.log('OK: user_integrations columns added');

  // Add columns to repositories if not exist
  await client.query(`
    ALTER TABLE repositories 
    ADD COLUMN IF NOT EXISTS vercel_project_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vercel_project_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT,
    ADD COLUMN IF NOT EXISTS vercel_linked_at TIMESTAMPTZ;
  `);
  console.log('OK: repositories columns added');

  await client.end();
  console.log('Migration complete');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
