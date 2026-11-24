const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://postgres:Jatin%402007@localhost:5432/sentinel_ai'
    });
    await client.connect();
    try {
        await client.query('CREATE DATABASE sentinel_ai');
        console.log('Database sentinel_ai created successfully');
    } catch (e) {
        if (e.code === '42P07') {
            console.log('Database sentinel_ai already exists');
        } else {
            console.error('Error creating database:', e);
        }
    }
    await client.end();
}

main().catch(console.error);