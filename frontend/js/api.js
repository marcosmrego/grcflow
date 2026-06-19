/* ===========================
   API Service Module
   =========================== */

const API = {
    baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api',

    getToken() { return localStorage.getItem('grc_token'); },
    getUser()  { try { return JSON.parse(localStorage.getItem('grc_user') || 'null'); } catch { return null; } },

    logout() {
        const isDemo = !!this.getUser()?.isDemo;
        localStorage.removeItem('grc_token');
        localStorage.removeItem('grc_user');
        window.location.href = isDemo ? '/landing.html' : '/login.html';
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
        this.bindSystemInfo();
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

    bindSystemInfo() {
        const btn = document.getElementById('system-info-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSystemInfoModal();
            });
        }
    },

    async openSystemInfoModal() {
        this.injectSystemInfoModal();
        const modal = document.getElementById('system-info-modal');
        modal.classList.add('active');

        const setField = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setField('si-base-url', this.baseURL);

        const healthURL = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/health'
            : '/health';

        setField('si-status', 'Verificando...');
        setField('si-version', '-');
        setField('si-environment', '-');
        setField('si-started-at', '-');
        setField('si-checked-at', this.formatDate(new Date().toISOString()));

        try {
            const response = await fetch(healthURL);
            const body = await response.json();
            if (response.ok && body?.data) {
                setField('si-status', '🟢 Online');
                setField('si-version', body.data.version || '-');
                setField('si-environment', body.data.environment || '-');
                setField('si-started-at', body.data.startedAt ? this.formatDate(body.data.startedAt) : '-');
            } else {
                setField('si-status', '🔴 Offline');
            }
        } catch (error) {
            setField('si-status', '🔴 Offline');
        }
    },

    injectSystemInfoModal() {
        if (document.getElementById('system-info-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'system-info-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 480px;">
                <div class="modal-header">
                    <h2>ℹ️ Informações do Sistema</h2>
                    <button class="modal-close" id="si-modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">API Status:</span>
                            <span class="info-value" id="si-status">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">URL Base:</span>
                            <span class="info-value" id="si-base-url">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Versão:</span>
                            <span class="info-value" id="si-version">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Ambiente:</span>
                            <span class="info-value" id="si-environment">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Servidor iniciado em:</span>
                            <span class="info-value" id="si-started-at">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Verificado em:</span>
                            <span class="info-value" id="si-checked-at">-</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="si-modal-close-footer">Fechar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const close = () => modal.classList.remove('active');
        document.getElementById('si-modal-close').addEventListener('click', close);
        document.getElementById('si-modal-close-footer').addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
    },

    renderUserInfo() {
        const user = this.getUser();
        const el = document.getElementById('user-info');
        if (el && user) el.textContent = user.name || user.email;

        const isAdmin = !!(user && user.role === 'admin');

        const usersNavItem = document.getElementById('nav-users-item');
        if (usersNavItem) usersNavItem.style.display = isAdmin ? '' : 'none';

        const towersNavItem = document.getElementById('nav-towers-item');
        if (towersNavItem) towersNavItem.style.display = isAdmin ? '' : 'none';

        if (user && user.isDemo) this.injectDemoBanner();
    },

    injectDemoBanner() {
        if (document.getElementById('demo-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'demo-banner';
        banner.style.cssText = 'position:sticky;top:0;z-index:101;background:#ffc107;color:#212529;text-align:center;padding:0.5rem 1rem;font-size:0.875rem;font-weight:500;';
        banner.textContent = '🔍 Modo demonstração — dados fictícios, fique à vontade para testar.';
        document.body.insertBefore(banner, document.body.firstChild);
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

    async getKnowledgeStats() {
        return this.request('/knowledge/stats');
    },

    async getKnowledgeVersions(id) {
        return this.request(`/knowledge/${id}/versions`);
    },

    async restoreKnowledgeVersion(id, versionNumber) {
        return this.request(`/knowledge/${id}/restore/${versionNumber}`, {
            method: 'POST'
        });
    },

    async getKnowledgeApprovals(id) {
        return this.request(`/knowledge/${id}/approvals`);
    },

    async submitKnowledgeForApproval(id) {
        return this.request(`/knowledge/${id}/submit`, {
            method: 'POST'
        });
    },

    async approveKnowledge(id, level) {
        return this.request(`/knowledge/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ level })
        });
    },

    async rejectKnowledge(id, level, justification) {
        return this.request(`/knowledge/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ level, justification })
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

    async deleteFlowStep(flowId, stepId) {
        return this.request(`/flows/${flowId}/steps/${stepId}`, { method: 'DELETE' });
    },

    // Towers/Departments (read for any role, mutations admin only)
    async getTowers() {
        return this.request('/towers');
    },

    async createTower(data) {
        return this.request('/towers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTower(id, data) {
        return this.request(`/towers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteTower(id) {
        return this.request(`/towers/${id}`, {
            method: 'DELETE'
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
