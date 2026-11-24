import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

type User = {
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'analyst' | 'viewer';
};

// Global user store – shared across tabs via storage events
let globalUser: User | null = null;
let globalInitializing = true;
const listeners = new Set<(u: User | null, init: boolean) => void>();

function setGlobalAuthState(u: User | null, init: boolean) {
    globalUser = u;
    globalInitializing = init;
    listeners.forEach((listener) => listener(u, init));
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(() => globalUser);
    const [isInitializing, setIsInitializing] = useState<boolean>(() => {
        // If we already have a global user, we're not initializing
        if (globalUser) return false;
        // If tokens exist in localStorage, we are initializing until checkAuth completes
        return !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
    });

    const queryClient = useQueryClient();
    const [, navigate] = useLocation();

    // Register component‑level listener
    useEffect(() => {
        const handler = (u: User | null, init: boolean) => {
            setUser(u);
            setIsInitializing(init);
        };
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    // Provide token getter for API client
    useEffect(() => {
        setAuthTokenGetter(() => localStorage.getItem('accessToken') || '');
    }, []);

    const logout = useCallback((redirectToLanding = true) => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setGlobalAuthState(null, false);
        queryClient.clear();
        if (redirectToLanding) {
            navigate('/');
        }
    }, [navigate, queryClient]);

    const refreshAccessToken = useCallback(async () => {
        const refreshTokenVal = localStorage.getItem('refreshToken');
        if (!refreshTokenVal) {
            logout(false);
            return null;
        }
        try {
            const baseUrl = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: refreshTokenVal })
            });
            if (!response.ok) throw new Error('Token refresh failed');
            const { accessToken, refreshToken: newRefreshToken } = await response.json();
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            return accessToken;
        } catch (error) {
            logout(false);
            return null;
        }
    }, [logout]);

    // Verify existing token on mount or when storage changes
    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token && !refreshToken) {
            setGlobalAuthState(null, false);
            return;
        }

        const baseUrl = import.meta.env.VITE_API_URL || '/api';

        try {
            if (token) {
                const response = await fetch(`${baseUrl}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const userData: User = await response.json();
                    setGlobalAuthState(userData, false);
                    return;
                }
            }
            // Token missing or expired – attempt refresh
            const newToken = await refreshAccessToken();
            if (newToken) {
                const retry = await fetch(`${baseUrl}/auth/me`, {
                    headers: { Authorization: `Bearer ${newToken}` }
                });
                if (retry.ok) {
                    const userData: User = await retry.json();
                    setGlobalAuthState(userData, false);
                    return;
                }
            }
            setGlobalAuthState(null, false);
        } catch (e) {
            setGlobalAuthState(null, false);
        }
    }, [refreshAccessToken]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Sync across tabs using the storage event
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'accessToken' || e.key === 'refreshToken') {
                checkAuth();
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [checkAuth]);

    const login = useCallback(async (email: string, password: string) => {
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = data.error || data.message || 'Invalid email or password';
            throw new Error(msg);
        }
        const { accessToken, refreshToken, user: loggedUser } = data;
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setGlobalAuthState(loggedUser, false);
        return loggedUser;
    }, []);

    const register = useCallback(async (
        email: string,
        username: string,
        password: string,
        role: 'admin' | 'analyst' | 'viewer' = 'viewer'
    ) => {
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password, role })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = data.error || data.message || 'Registration failed';
            throw new Error(msg);
        }
        const { accessToken, refreshToken, user: regUser } = data;
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setGlobalAuthState(regUser, false);
        return regUser;
    }, []);

    return {
        user,
        isInitializing,
        login,
        register,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user
    };
}
