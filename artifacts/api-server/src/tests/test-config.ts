import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Export test configuration
const testConfig = {
    database: {
        url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        isTestDatabase: !!process.env.DATABASE_URL_TEST
    },
    mlService: {
        url: process.env.ML_SERVICE_URL_TEST || 'http://localhost:8002'
    }
};

export default testConfig;
