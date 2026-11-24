const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();

    // Alter telemetry.repository_id from integer to uuid
    try {
        await client.query(
            'ALTER TABLE "telemetry" ALTER COLUMN "repository_id" TYPE uuid USING "repository_id"::uuid'
        );
        console.log('Altered telemetry.repository_id to uuid');
    } catch (e) {
        console.error('Error altering column:', e.message);
    }

    await client.end();
}

main().catch(console.error);
