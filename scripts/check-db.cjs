const { Client } = require('pg');
async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();
    try {
        const r = await client.query('SELECT datname FROM pg_database WHERE datname LIKE "%sentinel%"');
        console.log('Databases:', r.rows);
    } catch (e) {
        console.error('Query error:', e.message);
    }
    await client.end();
}
main().catch(e => console.error('Connect error:', e.message));
