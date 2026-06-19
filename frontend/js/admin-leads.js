/* ===========================
   Platform Admin — Leads (captura da landing page)
   =========================== */

const Leads = {
    currentPage: 1,
    pageSize: 20,
    searchQuery: '',
    searchDebounceTimer: null,

    async init() {
        this.setupEventListeners();
        await this.loadLeads();
    },

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', () => this.search());

        const tableBody = document.getElementById('leads-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.action === 'delete') this.confirmDelete(id);
            });
        }

        const pagination = document.getElementById('leads-pagination');
        if (pagination) {
            pagination.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn) return;
                this.goToPage(parseInt(btn.dataset.page, 10));
            });
        }
    },

    async loadLeads() {
        const tableBody = document.getElementById('leads-table-body');
        if (!tableBody) return;

        try {
            const result = await AdminAPI.getLeads(this.currentPage, this.pageSize, this.searchQuery);
            const leads = result.items || [];
            const pagination = result.pagination || { total: leads.length, page: 1, pages: 1 };
            const countEl = document.getElementById('lead-count');

            if (countEl) {
                countEl.textContent = this.searchQuery
                    ? `${pagination.total} resultado${pagination.total !== 1 ? 's' : ''}`
                    : `${pagination.total} lead${pagination.total !== 1 ? 's' : ''}`;
            }

            if (leads.length === 0) {
                tableBody.innerHTML = `
                    <tr><td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">${this.searchQuery ? '🔍' : '📨'}</div>
                            <div class="empty-state-title">${this.searchQuery ? 'Nenhum resultado' : 'Nenhum lead recebido ainda'}</div>
                        </div>
                    </td></tr>
                `;
                document.getElementById('leads-pagination').innerHTML = '';
                return;
            }

            tableBody.innerHTML = leads.map(lead => this.renderLeadRow(lead)).join('');
            this.renderPagination(pagination);
        } catch (error) {
            console.error('Error loading leads:', error);
            tableBody.innerHTML = '<tr><td colspan="7"><div class="alert alert-danger">Erro ao carregar leads</div></td></tr>';
            document.getElementById('leads-pagination').innerHTML = '';
        }
    },

    renderLeadRow(lead) {
        return `
            <tr>
                <td>${this.escapeHtml(lead.name)}</td>
                <td>${this.escapeHtml(lead.email)}</td>
                <td>${this.escapeHtml(lead.companyName || '—')}</td>
                <td>${this.escapeHtml(lead.phone || '—')}</td>
                <td>${this.escapeHtml(lead.source || '—')}</td>
                <td>${AdminAPI.formatDate(lead.createdAt)}</td>
                <td>
                    <div class="item-actions" style="display:flex; flex-wrap:nowrap;">
                        <button class="item-action" title="Excluir" data-action="delete" data-id="${lead.id}">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderPagination(pagination) {
        const el = document.getElementById('leads-pagination');
        if (!el) return;

        if (pagination.pages <= 1) {
            el.innerHTML = '';
            return;
        }

        el.innerHTML = `
            <button class="btn btn-outline btn-sm" data-page="${pagination.page - 1}" ${!pagination.hasPrev ? 'disabled' : ''}>‹ Anterior</button>
            <span style="color: var(--text-secondary);">Página ${pagination.page} de ${pagination.pages}</span>
            <button class="btn btn-outline btn-sm" data-page="${pagination.page + 1}" ${!pagination.hasNext ? 'disabled' : ''}>Próxima ›</button>
        `;
    },

    goToPage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadLeads();
    },

    search() {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this.searchQuery = document.getElementById('search-input').value.trim();
            this.currentPage = 1;
            this.loadLeads();
        }, 300);
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja excluir este lead?')) {
            this.deleteLead(id);
        }
    },

    async deleteLead(id) {
        try {
            await AdminAPI.deleteLead(id);
            await this.loadLeads();
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert(error.message || 'Erro ao excluir lead');
        }
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Leads.init();
});
