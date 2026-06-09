/* ===========================
   Platform Admin — API Service Module
   =========================== */

const AdminAPI = {
    baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api',

    getToken() { return localStorage.getItem('grc_system_token'); },
    getUser()  { try { return JSON.parse(localStorage.getItem('grc_system_user') || 'null'); } catch { return null; } },

    logout() {
        localStorage.removeItem('grc_system_token');
        localStorage.removeItem('grc_system_user');
        window.location.href = '/admin/login.html';
    },

    requireAuth() {
        if (!this.getToken()) {
            window.location.href = '/admin/login.html';
            return false;
        }
        return true;
    },

    init() {
        this.requireAuth();
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
        if (el && user) {
            const roleLabel = user.role === 'super_admin' ? 'Super Admin' : 'Suporte';
            el.textContent = `${user.name} (${roleLabel})`;
        }
    },

    // Companies
    async getCompanies(page = 1, limit = 50) {
        return this.request(`/companies?page=${page}&limit=${limit}`);
    },

    async getCompany(id) {
        return this.request(`/companies/${id}`);
    },

    async createCompany(data) {
        return this.request('/companies', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateCompany(id, data) {
        return this.request(`/companies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteCompany(id) {
        return this.request(`/companies/${id}`, {
            method: 'DELETE'
        });
    },

    async getCompanyUsers(companyId, page = 1, limit = 50) {
        return this.request(`/companies/${companyId}/users?page=${page}&limit=${limit}`);
    },

    async createCompanyAdmin(companyId, data) {
        return this.request(`/companies/${companyId}/admin-user`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
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

            const json = await response.json().catch(() => ({}));

            if (!response.ok || json.success === false) {
                throw new Error(json.error?.message || `HTTP ${response.status}`);
            }

            return json.data;
        } catch (error) {
            console.error(`Admin API Error: ${endpoint}`, error);
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
    }
};

// Initialize Admin API on page load
document.addEventListener('DOMContentLoaded', () => {
    AdminAPI.init();
});
