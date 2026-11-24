import axios, { AxiosInstance } from 'axios';

export interface GitHubRepoDetails {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  visibility: string;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  language: string | null;
  openIssuesCount: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  draft: boolean;
}

export interface GitHubDeployment {
  id: number;
  environment: string;
  createdAt: string;
  creator: string;
  status: string;
}

export class GitHubService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || null;
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      timeout: 10000
    });
  }

  public setToken(token: string) {
    this.token = token;
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  public hasToken(): boolean {
    return Boolean(this.token);
  }

  /**
   * Verify token and fetch authenticated user
   */
  async getAuthenticatedUser() {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN_NOT_CONFIGURED');
    }
    const response = await this.client.get('/user');
    return {
      id: response.data.id,
      login: response.data.login,
      name: response.data.name,
      avatarUrl: response.data.avatar_url,
      htmlUrl: response.data.html_url
    };
  }

  /**
   * List repositories accessible to the user/token
   */
  async listUserRepositories(page = 1, perPage = 30): Promise<{ repos: GitHubRepoDetails[]; total?: number }> {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN_NOT_CONFIGURED');
    }
    const response = await this.client.get('/user/repos', {
      params: {
        sort: 'updated',
        direction: 'desc',
        page,
        per_page: perPage
      }
    });

    const repos: GitHubRepoDetails[] = response.data.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      visibility: r.visibility || (r.private ? 'private' : 'public'),
      stargazersCount: r.stargazers_count || 0,
      forksCount: r.forks_count || 0,
      updatedAt: r.updated_at,
      language: r.language,
      openIssuesCount: r.open_issues_count || 0
    }));

    return { repos };
  }

  /**
   * Fetch single repository metadata
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepoDetails> {
    const response = await this.client.get(`/repos/${owner}/${repo}`);
    const r = response.data;
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      visibility: r.visibility || (r.private ? 'private' : 'public'),
      stargazersCount: r.stargazers_count || 0,
      forksCount: r.forks_count || 0,
      updatedAt: r.updated_at,
      language: r.language,
      openIssuesCount: r.open_issues_count || 0
    };
  }

  /**
   * Fetch branches for repository
   */
  async getBranches(owner: string, repo: string): Promise<string[]> {
    const response = await this.client.get(`/repos/${owner}/${repo}/branches`, {
      params: { per_page: 50 }
    });
    return response.data.map((b: any) => b.name);
  }

  /**
   * Fetch recent commits
   */
  async getRecentCommits(owner: string, repo: string, limit = 15): Promise<GitHubCommit[]> {
    const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page: limit }
    });
    return response.data.map((c: any) => ({
      sha: c.sha,
      message: c.commit?.message || '',
      authorName: c.commit?.author?.name || c.author?.login || 'Unknown',
      authorEmail: c.commit?.author?.email || '',
      authorDate: c.commit?.author?.date || c.commit?.committer?.date || '',
      url: c.html_url
    }));
  }

  /**
   * Fetch pull requests
   */
  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open', limit = 15): Promise<GitHubPullRequest[]> {
    const response = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
      params: { state, per_page: limit }
    });
    return response.data.map((pr: any) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: pr.user?.login || 'Unknown',
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      draft: Boolean(pr.draft)
    }));
  }

  /**
   * Fetch recent deployments
   */
  async getDeployments(owner: string, repo: string, limit = 10): Promise<GitHubDeployment[]> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/deployments`, {
        params: { per_page: limit }
      });
      return response.data.map((d: any) => ({
        id: d.id,
        environment: d.environment || 'production',
        createdAt: d.created_at,
        creator: d.creator?.login || 'System',
        status: 'active'
      }));
    } catch {
      return [];
    }
  }
}

export const githubService = new GitHubService();

