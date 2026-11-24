import { describe, it, expect, vi } from 'vitest';
import { GitHubService } from '../services/githubService.js';
import axios from 'axios';

vi.mock('axios');

describe('GitHubService Live API Consumer', () => {
    it('should throw an error if no token is provided when listing repos', async () => {
        const service = new GitHubService('');
        // Ensure no env token
        (service as any).token = null;
        await expect(service.listUserRepositories()).rejects.toThrow('GITHUB_TOKEN_NOT_CONFIGURED');
    });

    it('should parse user repositories from GitHub API response', async () => {
        const mockRepos = [
            {
                id: 1,
                name: 'incidentiq-platform',
                full_name: 'acme/incidentiq-platform',
                description: 'AI Incident Platform',
                html_url: 'https://github.com/acme/incidentiq-platform',
                default_branch: 'main',
                visibility: 'public',
                stargazers_count: 42,
                forks_count: 5,
                updated_at: '2026-11-01T00:00:00Z',
                language: 'TypeScript',
                open_issues_count: 2
            }
        ];

        const mockGet = vi.fn().mockResolvedValue({ data: mockRepos });
        (axios.create as any).mockReturnValue({
            get: mockGet,
            defaults: { headers: {} }
        });

        const service = new GitHubService('ghp_mock_token');
        const result = await service.listUserRepositories(1, 10);

        expect(result.repos.length).toBe(1);
        expect(result.repos[0].name).toBe('incidentiq-platform');
        expect(result.repos[0].defaultBranch).toBe('main');
        expect(result.repos[0].stargazersCount).toBe(42);
    });

    it('should parse commits and pull requests', async () => {
        const mockCommits = [
            {
                sha: 'abc1234',
                commit: {
                    message: 'feat: add metrics',
                    author: { name: 'Dev', email: 'dev@acme.com', date: '2026-11-05T00:00:00Z' }
                },
                html_url: 'https://github.com/acme/repo/commit/abc1234'
            }
        ];

        const mockGet = vi.fn().mockResolvedValue({ data: mockCommits });
        (axios.create as any).mockReturnValue({
            get: mockGet,
            defaults: { headers: {} }
        });

        const service = new GitHubService('ghp_mock_token');
        const commits = await service.getRecentCommits('acme', 'repo');

        expect(commits.length).toBe(1);
        expect(commits[0].sha).toBe('abc1234');
        expect(commits[0].authorName).toBe('Dev');
    });
});

