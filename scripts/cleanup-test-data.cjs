const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();

    const queries = [
        // Delete telemetry records
        'DELETE FROM "telemetry"',
        // Delete test repositories
        'DELETE FROM "repositories" WHERE "name" = \'test-repo\'',
        // Delete test users
        'DELETE FROM "users" WHERE "email" = \'test@example.com\''
    ];

    for (const query of queries) {
        try {
            await client.query(query);
            console.log('Executed:', query);
        } catch (e) {
            console.error('Error:', e.message);
        }
    }

    console.log('Test data cleaned up');
    await client.end();
}

main().catch(console.error);
