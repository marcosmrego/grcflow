/* ===========================
   Platform Admin — Companies List
   =========================== */

const Companies = {
    currentPage: 1,
    pageSize: 10,
    searchQuery: '',
    searchDebounceTimer: null,

    async init() {
        this.setupEventListeners();
        await this.loadStats();
        await this.loadCompanies();
    },

    setupEventListeners() {
        const form = document.getElementById('company-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const newBtn = document.getElementById('btn-new-company');
        if (newBtn) newBtn.addEventListener('click', (e) => { e.preventDefault(); this.openCreateModal(); });

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', () => this.search());

        const modalClose = document.getElementById('company-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('company-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('company-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const tableBody = document.getElementById('companies-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="create"]');
                if (btn) this.openCreateModal();
            });
        }

        const pagination = document.getElementById('companies-pagination');
        if (pagination) {
            pagination.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn) return;
                this.goToPage(parseInt(btn.dataset.page, 10));
            });
        }
    },

    async loadStats() {
        try {
            const stats = await AdminAPI.getCompanyStats();
            document.getElementById('stat-total').textContent = stats.total;
            document.getElementById('stat-active').textContent = stats.active;
            document.getElementById('stat-inactive').textContent = stats.inactive;
        } catch (error) {
            console.error('Error loading company stats:', error);
        }
    },

    async loadCompanies() {
        const tableBody = document.getElementById('companies-table-body');
        if (!tableBody) return;

        try {
            const result = await AdminAPI.getCompanies(this.currentPage, this.pageSize, this.searchQuery);
            const companies = result.items || [];
            const pagination = result.pagination || { total: companies.length, page: 1, pages: 1 };
            const countEl = document.getElementById('company-count');

            if (countEl) {
                countEl.textContent = this.searchQuery
                    ? `${pagination.total} resultado${pagination.total !== 1 ? 's' : ''}`
                    : `${pagination.total} empresa${pagination.total !== 1 ? 's' : ''}`;
            }

            if (companies.length === 0) {
                tableBody.innerHTML = `
                    <tr><td colspan="4">
                        <div class="empty-state">
                            <div class="empty-state-icon">${this.searchQuery ? '🔍' : '🏢'}</div>
                            <div class="empty-state-title">${this.searchQuery ? 'Nenhum resultado' : 'Nenhuma empresa cadastrada'}</div>
                            ${this.searchQuery ? '' : `
                                <p class="empty-state-text">Comece cadastrando a primeira empresa da plataforma</p>
                                <button class="btn btn-primary" data-action="create">+ Criar Primeira Empresa</button>
                            `}
                        </div>
                    </td></tr>
                `;
                document.getElementById('companies-pagination').innerHTML = '';
                return;
            }

            tableBody.innerHTML = companies.map(company => this.renderCompanyRow(company)).join('');
            this.renderPagination(pagination);
        } catch (error) {
            console.error('Error loading companies:', error);
            tableBody.innerHTML = '<tr><td colspan="4"><div class="alert alert-danger">Erro ao carregar empresas</div></td></tr>';
            document.getElementById('companies-pagination').innerHTML = '';
        }
    },

    renderCompanyRow(company) {
        return `
            <tr>
                <td>🏢 ${this.escapeHtml(company.name)}</td>
                <td>${this.escapeHtml(company.legal_name || '—')}</td>
                <td>${this.escapeHtml(company.document || '—')}</td>
                <td>
                    <a class="btn btn-outline btn-sm" href="company.html?id=${company.id}">Abrir</a>
                </td>
            </tr>
        `;
    },

    renderPagination(pagination) {
        const el = document.getElementById('companies-pagination');
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
        this.loadCompanies();
    },

    search() {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this.searchQuery = document.getElementById('search-input').value.trim();
            this.currentPage = 1;
            this.loadCompanies();
        }, 300);
    },

    openCreateModal() {
        document.getElementById('company-modal-title').textContent = 'Nova Empresa';
        document.getElementById('company-form').reset();
        this.toggleModal('company-modal', true);
    },

    async save() {
        try {
            const name = document.getElementById('company-name').value.trim();
            const monthlyFeeValue = document.getElementById('company-monthly-fee').value.trim();

            if (!name) {
                alert('Digite o nome da empresa');
                return;
            }

            const data = {
                name,
                document: document.getElementById('company-document').value.trim() || undefined,
                legalName: document.getElementById('company-legal-name').value.trim() || undefined,
                segment: document.getElementById('company-segment').value.trim() || undefined,
                website: document.getElementById('company-website').value.trim() || undefined,
                contactName: document.getElementById('company-contact-name').value.trim() || undefined,
                contactEmail: document.getElementById('company-contact-email').value.trim() || undefined,
                contactPhone: document.getElementById('company-contact-phone').value.trim() || undefined,
                address: document.getElementById('company-address').value.trim() || undefined,
                city: document.getElementById('company-city').value.trim() || undefined,
                state: document.getElementById('company-state').value.trim().toUpperCase() || undefined,
                zipCode: document.getElementById('company-zip').value.trim() || undefined,
                monthlyFee: monthlyFeeValue ? parseFloat(monthlyFeeValue) : null,
                notes: document.getElementById('company-notes').value.trim() || undefined,
            };

            await AdminAPI.createCompany(data);
            alert('Empresa criada com sucesso!');

            this.closeModal();
            await Promise.all([this.loadCompanies(), this.loadStats()]);
        } catch (error) {
            console.error('Error saving company:', error);
            alert(error.message || 'Erro ao salvar empresa');
        }
    },

    closeModal() {
        this.toggleModal('company-modal', false);
    },

    toggleModal(id, show) {
        const modal = document.getElementById(id);
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
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
    Companies.init();
});
