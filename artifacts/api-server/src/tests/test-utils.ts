import { db } from '@workspace/db';
import { usersTable, repositoriesTable } from '@workspace/db/schema';
import bcrypt from 'bcrypt';

// Create a test user
export async function createTestUser(email = 'test@example.com') {
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const [user] = await db.insert(usersTable).values({
        email,
        username: email.split('@')[0],
        passwordHash: hashedPassword,
        role: 'analyst',
        isActive: true,
    }).returning();
    return user;
}

// Create a test repository for a user
export async function createTestRepository(userId: string) {
    const [repo] = await db.insert(repositoriesTable).values({
        userId,
        name: 'test-repo',
        url: 'https://github.com/test/test-repo',
        branch: 'main',
        status: 'connected',
        monitoringEnabled: true,
        language: 'typescript',
    }).returning();
    return repo;
}

// Clean up test data
export async function cleanupTestData() {
    // Delete all test repositories
    await db.delete(repositoriesTable).where({
        name: 'test-repo',
    });

    // Delete all test users
    await db.delete(usersTable).where({
        email: 'test@example.com',
    });
}
