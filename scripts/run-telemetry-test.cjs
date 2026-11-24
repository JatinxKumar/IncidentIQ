const { spawnSync } = require('child_process');
const path = require('path');

// Resolve pg from api-server's node_modules
const apiServerDir = path.join(__dirname, '..', 'artifacts', 'api-server');
const pgPath = require.resolve('pg', { paths: [apiServerDir] });
const { Client } = require(pgPath);

// Step 1: Alter telemetry.repository_id from integer to uuid
const alterSql = [
    'ALTER TABLE "telemetry" ALTER COLUMN "repository_id" TYPE uuid USING "repository_id"::uuid',
];

// Step 2: Clean up all test data
const cleanupSql = [
    'DELETE FROM "telemetry"',
    'DELETE FROM "repositories" WHERE "name" = \'test-repo\'',
    'DELETE FROM "users" WHERE "email" = \'test@example.com\''
];

async function runPgQuery(sql) {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();
    try {
        await client.query(sql);
        console.log('OK:', sql);
    } catch (e) {
        console.error('ERR:', e.message);
    }
    await client.end();
}

async function main() {
    // Run schema alteration
    for (const sql of alterSql) {
        try {
            await runPgQuery(sql);
        } catch (e) {
            console.error('Schema alter failed:', e.message);
        }
    }

    // Run data cleanup
    for (const sql of cleanupSql) {
        try {
            await runPgQuery(sql);
        } catch (e) {
            console.error('Cleanup failed:', e.message);
        }
    }

    // Run the telemetry test
    const result = spawnSync('pnpm', ['exec', 'vitest', 'run', 'src/tests/telemetryController.test.ts'], {
        cwd: apiServerDir,
        env: { ...process.env, DATABASE_URL: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai' },
        shell: true,
        encoding: 'utf8'
    });

    console.log(result.stdout);
    console.error(result.stderr);
    process.exit(result.status || 0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
