const { execSync } = require('child_process');

// Set the environment variable
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/sentinelai';

console.log('Running drizzle-kit push with DATABASE_URL:', process.env.DATABASE_URL);

try {
    const result = execSync('pnpm run push', {
        cwd: __dirname,
        stdio: 'inherit',
        timeout: 60000
    });
    console.log('Migration completed successfully');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}