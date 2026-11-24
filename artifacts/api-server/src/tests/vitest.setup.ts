import { config } from 'dotenv';
import testConfig from './test-config.js';
import { vi } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Set up test environment
if (testConfig.database.isTestDatabase) {
    console.log('Running tests against test database:', testConfig.database.url);
} else {
    console.warn('Running tests against production database - ensure this is intentional');
}

// Mock ML service
vi.mock('node-fetch', async () => {
    const actual = await vi.importActual('node-fetch');
    return {
        default: vi.fn().mockImplementation((url: string, options: any) => {
            if (url.includes(testConfig.mlService.url)) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        prediction: 1,
                        confidence: 0.95,
                        status: 'anomaly'
                    })
                });
            }
            return actual.default(url, options);
        })
    };
});
