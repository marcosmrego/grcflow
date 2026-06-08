/* ===========================
   API Service Module
   =========================== */

const API = {
    baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api',

    getToken() { return localStorage.getItem('grc_token'); },
    getUser()  { try { return JSON.parse(localStorage.getItem('grc_user') || 'null'); } catch { return null; } },

    logout() {
        localStorage.removeItem('grc_token');
        localStorage.removeItem('grc_user');
        window.location.href = '/login.html';
    },

    requireAuth() {
        if (!this.getToken()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },

    // Initialize
    init() {
        this.requireAuth();
        this.checkHealth();
        this.renderUserInfo();
        this.bindLogout();
    },

    bindLogout() {
        const link = document.getElementById('logout-link');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },

    renderUserInfo() {
        const user = this.getUser();
        const el = document.getElementById('user-info');
        if (el && user) el.textContent = user.name || user.email;

        const usersNavItem = document.getElementById('nav-users-item');
        if (usersNavItem) {
            usersNavItem.style.display = (user && user.role === 'admin') ? '' : 'none';
        }
    },

    // Health Check
    async checkHealth() {
        const healthURL = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/health'
            : '/health';
        try {
            const response = await fetch(healthURL);
            if (response.ok) {
                this.updateStatus(true);
                return true;
            }
        } catch (error) {
            this.updateStatus(false);
            return false;
        }
    },

    updateStatus(isOnline) {
        const statusEl = document.getElementById('api-status');
        const dotEl = document.querySelector('.dot');
        
        if (statusEl) {
            statusEl.textContent = isOnline ? 'Online' : 'Offline';
            statusEl.style.color = isOnline ? 'var(--success)' : 'var(--danger)';
        }
        
        if (dotEl) {
            dotEl.classList.toggle('online', isOnline);
            dotEl.classList.toggle('offline', !isOnline);
        }
    },

    // Knowledge Items
    async getKnowledge(limit = 50, offset = 0) {
        return this.request(`/knowledge?limit=${limit}&offset=${offset}`);
    },

    async searchKnowledge(query) {
        return this.request(`/knowledge/search?q=${encodeURIComponent(query)}`);
    },

    async getKnowledgeByCategory(category, limit = 20) {
        return this.request(`/knowledge/category/${encodeURIComponent(category)}?limit=${limit}`);
    },

    async getKnowledgeByTag(tag) {
        return this.request(`/knowledge/tag/${encodeURIComponent(tag)}`);
    },

    async getKnowledgeItem(id) {
        return this.request(`/knowledge/${id}`);
    },

    async createKnowledge(data) {
        return this.request('/knowledge', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateKnowledge(id, data) {
        return this.request(`/knowledge/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteKnowledge(id) {
        return this.request(`/knowledge/${id}`, {
            method: 'DELETE'
        });
    },

    // Process Flows
    async getFlows(status = null) {
        let url = '/flows';
        if (status) {
            url += `?status=${status}`;
        }
        return this.request(url);
    },

    async getFlow(id) {
        return this.request(`/flows/${id}`);
    },

    async createFlow(data) {
        return this.request('/flows', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateFlow(id, data) {
        return this.request(`/flows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteFlow(id) {
        return this.request(`/flows/${id}`, {
            method: 'DELETE'
        });
    },

    async addFlowStep(flowId, stepData) {
        return this.request(`/flows/${flowId}/steps`, {
            method: 'POST',
            body: JSON.stringify(stepData)
        });
    },

    // Company Users (admin only — scoped to the authenticated user's company)
    async getUsers(page = 1, limit = 50) {
        const result = await this.request(`/users?page=${page}&limit=${limit}`);
        return result.data;
    },

    async createUser(data) {
        const result = await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return result.data;
    },

    async updateUser(id, data) {
        const result = await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return result.data;
    },

    async deleteUser(id) {
        const result = await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
        return result.data;
    },

    // Helper Methods
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                this.logout();
                return;
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error: ${endpoint}`, error);
            throw error;
        }
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format date short
    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
};

// Initialize API on page load
document.addEventListener('DOMContentLoaded', () => {
    API.init();
});
