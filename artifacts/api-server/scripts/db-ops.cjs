const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();

    // Step 1: Alter telemetry.repository_id from integer to uuid
    try {
        await client.query(
            'ALTER TABLE "telemetry" ALTER COLUMN "repository_id" TYPE uuid USING "repository_id"::uuid'
        );
        console.log('OK: Schema altered');
    } catch (e) {
        console.error('Schema alter failed:', e.message);
    }

    // Step 2: Clean up all test data
    const cleanupQueries = [
        'DELETE FROM "telemetry"',
        'DELETE FROM "repositories" WHERE "name" = \'test-repo\'',
        'DELETE FROM "users" WHERE "email" = \'test@example.com\''
    ];

    for (const sql of cleanupQueries) {
        try {
            await client.query(sql);
            console.log('OK:', sql);
        } catch (e) {
            console.error('Cleanup failed:', e.message);
        }
    }

    await client.end();
    console.log('DB operations complete');
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
