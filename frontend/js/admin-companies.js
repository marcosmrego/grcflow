/* ===========================
   Platform Admin — Companies Management
   =========================== */

const Companies = {
    editingId: null,
    adminModalCompany: null,
    usersModalCompany: null,
    modulesModalCompany: null,
    invoicesModalCompany: null,
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
        if (newBtn) newBtn.addEventListener('click', () => this.openCreateModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', () => this.search());

        const modalClose = document.getElementById('company-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('company-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('company-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const adminForm = document.getElementById('company-admin-form');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCompanyAdmin();
            });
        }

        const usersModalClose = document.getElementById('company-users-modal-close');
        if (usersModalClose) usersModalClose.addEventListener('click', () => this.closeUsersModal());

        const adminModalClose = document.getElementById('company-admin-modal-close');
        if (adminModalClose) adminModalClose.addEventListener('click', () => this.closeAdminModal());

        const adminModalCancel = document.getElementById('company-admin-modal-cancel');
        if (adminModalCancel) adminModalCancel.addEventListener('click', () => this.closeAdminModal());

        const adminModalSave = document.getElementById('company-admin-modal-save');
        if (adminModalSave) adminModalSave.addEventListener('click', () => this.saveCompanyAdmin());

        const modulesModalClose = document.getElementById('company-modules-modal-close');
        if (modulesModalClose) modulesModalClose.addEventListener('click', () => this.closeModulesModal());

        const modulesList = document.getElementById('modules-modal-list');
        if (modulesList) {
            modulesList.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="save-module"]');
                if (btn) this.saveModule(btn.dataset.key);
            });
        }

        const invoicesModalClose = document.getElementById('company-invoices-modal-close');
        if (invoicesModalClose) invoicesModalClose.addEventListener('click', () => this.closeInvoicesModal());

        const invoiceForm = document.getElementById('invoice-form');
        if (invoiceForm) {
            invoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createInvoice();
            });
        }

        const invoicesList = document.getElementById('invoices-modal-list');
        if (invoicesList) {
            invoicesList.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const invoiceId = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'mark-paid': this.updateInvoiceStatus(invoiceId, 'paid'); break;
                    case 'cancel-invoice': this.updateInvoiceStatus(invoiceId, 'cancelled'); break;
                    case 'delete-invoice': this.confirmDeleteInvoice(invoiceId); break;
                }
            });
        }

        const tableBody = document.getElementById('companies-table-body');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'edit': this.editCompany(id); break;
                    case 'view-users': this.openUsersModal(id, btn.dataset.name); break;
                    case 'create-admin': this.openCreateAdminModal(id, btn.dataset.name); break;
                    case 'view-modules': this.openModulesModal(id, btn.dataset.name); break;
                    case 'view-invoices': this.openInvoicesModal(id, btn.dataset.name); break;
                    case 'toggle-active': this.toggleActive(id, btn.dataset.active === 'true'); break;
                    case 'delete': this.confirmDelete(id); break;
                }
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
                    <tr><td colspan="7">
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
            tableBody.innerHTML = '<tr><td colspan="7"><div class="alert alert-danger">Erro ao carregar empresas</div></td></tr>';
            document.getElementById('companies-pagination').innerHTML = '';
        }
    },

    renderCompanyRow(company) {
        const statusBadge = company.is_active
            ? '<span class="badge badge-primary">✅ Ativa</span>'
            : '<span class="badge" style="background: var(--danger);">⛔ Inativa</span>';
        const monthlyFee = company.monthly_fee != null ? this.formatCurrency(company.monthly_fee) : '—';
        const cityState = [company.city, company.state].filter(Boolean).join('/') || '—';

        return `
            <tr>
                <td>🏢 ${this.escapeHtml(company.name)}</td>
                <td>${this.escapeHtml(company.legal_name || '—')}</td>
                <td>${this.escapeHtml(company.document || '—')}</td>
                <td>${this.escapeHtml(cityState)}</td>
                <td>${monthlyFee}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="item-actions" style="display:flex; flex-wrap:nowrap;">
                        <button class="item-action" title="Ver usuários" data-action="view-users" data-id="${company.id}" data-name="${this.escapeHtml(company.name)}">👥</button>
                        <button class="item-action" title="Criar usuário admin" data-action="create-admin" data-id="${company.id}" data-name="${this.escapeHtml(company.name)}">👤</button>
                        <button class="item-action" title="Módulos" data-action="view-modules" data-id="${company.id}" data-name="${this.escapeHtml(company.name)}">🧩</button>
                        <button class="item-action" title="Faturamento" data-action="view-invoices" data-id="${company.id}" data-name="${this.escapeHtml(company.name)}">💰</button>
                        <button class="item-action" title="Editar" data-action="edit" data-id="${company.id}">✏️</button>
                        <button class="item-action" title="${company.is_active ? 'Desativar' : 'Ativar'}" data-action="toggle-active" data-id="${company.id}" data-active="${company.is_active}">${company.is_active ? '⛔' : '✅'}</button>
                        <button class="item-action" title="Deletar" data-action="delete" data-id="${company.id}">🗑️</button>
                    </div>
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
        this.editingId = null;
        document.getElementById('company-modal-title').textContent = 'Nova Empresa';
        document.getElementById('company-form').reset();
        document.getElementById('company-active-group').style.display = 'none';
        this.toggleModal('company-modal', true);
    },

    async editCompany(id) {
        try {
            const company = await AdminAPI.getCompany(id);
            this.editingId = id;

            document.getElementById('company-modal-title').textContent = 'Editar Empresa';
            document.getElementById('company-name').value = company.name;
            document.getElementById('company-document').value = company.document || '';
            document.getElementById('company-legal-name').value = company.legal_name || '';
            document.getElementById('company-segment').value = company.segment || '';
            document.getElementById('company-website').value = company.website || '';
            document.getElementById('company-contact-name').value = company.contact_name || '';
            document.getElementById('company-contact-email').value = company.contact_email || '';
            document.getElementById('company-contact-phone').value = company.contact_phone || '';
            document.getElementById('company-address').value = company.address || '';
            document.getElementById('company-city').value = company.city || '';
            document.getElementById('company-state').value = company.state || '';
            document.getElementById('company-zip').value = company.zip_code || '';
            document.getElementById('company-monthly-fee').value = company.monthly_fee != null ? company.monthly_fee : '';
            document.getElementById('company-notes').value = company.notes || '';
            document.getElementById('company-active').value = String(company.is_active);
            document.getElementById('company-active-group').style.display = 'block';

            this.toggleModal('company-modal', true);
        } catch (error) {
            console.error('Error loading company:', error);
            alert('Erro ao carregar empresa');
        }
    },

    async save() {
        try {
            const name = document.getElementById('company-name').value.trim();
            const documentValue = document.getElementById('company-document').value.trim();
            const monthlyFeeValue = document.getElementById('company-monthly-fee').value.trim();

            if (!name) {
                alert('Digite o nome da empresa');
                return;
            }

            const data = {
                name,
                document: documentValue || undefined,
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

            if (this.editingId) {
                data.is_active = document.getElementById('company-active').value === 'true';
                await AdminAPI.updateCompany(this.editingId, data);
                alert('Empresa atualizada com sucesso!');
            } else {
                await AdminAPI.createCompany(data);
                alert('Empresa criada com sucesso!');
            }

            this.closeModal();
            await Promise.all([this.loadCompanies(), this.loadStats()]);
        } catch (error) {
            console.error('Error saving company:', error);
            alert(error.message || 'Erro ao salvar empresa');
        }
    },

    async toggleActive(id, currentlyActive) {
        const action = currentlyActive ? 'desativar' : 'ativar';
        if (!confirm(`Tem certeza que deseja ${action} esta empresa?`)) {
            return;
        }

        try {
            await AdminAPI.updateCompany(id, { is_active: !currentlyActive });
            await Promise.all([this.loadCompanies(), this.loadStats()]);
        } catch (error) {
            console.error('Error toggling company status:', error);
            alert('Erro ao alterar status da empresa');
        }
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja deletar esta empresa? Essa ação não pode ser desfeita.')) {
            this.deleteCompany(id);
        }
    },

    async deleteCompany(id) {
        try {
            await AdminAPI.deleteCompany(id);
            alert('Empresa deletada com sucesso!');
            await Promise.all([this.loadCompanies(), this.loadStats()]);
        } catch (error) {
            console.error('Error deleting company:', error);
            alert(error.message || 'Erro ao deletar empresa');
        }
    },

    openCreateAdminModal(id, name) {
        this.adminModalCompany = id;
        document.getElementById('company-admin-modal-company').textContent = `Empresa: ${name}`;
        document.getElementById('company-admin-form').reset();
        this.toggleModal('company-admin-modal', true);
    },

    async saveCompanyAdmin() {
        try {
            const name = document.getElementById('company-admin-name').value.trim();
            const email = document.getElementById('company-admin-email').value.trim();
            const password = document.getElementById('company-admin-password').value;

            if (!name || !email || !password) {
                alert('Preencha nome, e-mail e senha');
                return;
            }

            if (password.length < 8) {
                alert('A senha deve ter no mínimo 8 caracteres');
                return;
            }

            await AdminAPI.createCompanyAdmin(this.adminModalCompany, { name, email, password });
            alert('Usuário admin criado com sucesso!');
            this.closeAdminModal();
        } catch (error) {
            console.error('Error creating company admin:', error);
            alert(error.message || 'Erro ao criar usuário admin');
        }
    },

    closeAdminModal() {
        this.adminModalCompany = null;
        this.toggleModal('company-admin-modal', false);
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

    async openUsersModal(companyId, companyName) {
        this.usersModalCompany = companyId;
        document.getElementById('users-modal-title').textContent = `Usuários — ${companyName}`;
        document.getElementById('users-modal-list').innerHTML = '<div class="loading">Carregando...</div>';
        this.toggleModal('company-users-modal', true);

        try {
            const result = await AdminAPI.getCompanyUsers(companyId);
            const users = result.items || [];
            const listEl = document.getElementById('users-modal-list');
            const countEl = document.getElementById('users-modal-count');

            if (countEl) {
                countEl.textContent = `${result.pagination.total} usuário${result.pagination.total !== 1 ? 's' : ''}`;
            }

            if (users.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <div class="empty-state-title">Nenhum usuário cadastrado</div>
                    </div>
                `;
                return;
            }

            const roleLabel = { admin: '🔑 Admin', editor: '✏️ Editor', viewer: '👁️ Viewer' };

            listEl.innerHTML = users.map(u => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(u.name)}</div>
                        <div class="item-description">${this.escapeHtml(u.email)}</div>
                        <div class="item-meta">
                            <span>${roleLabel[u.role] || u.role}</span>
                            <span>${u.is_active ? '<span class="badge badge-primary">Ativo</span>' : '<span class="badge" style="background:var(--danger)">Inativo</span>'}</span>
                            <span>📅 ${AdminAPI.formatDate(u.created_at)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            document.getElementById('users-modal-list').innerHTML =
                '<div class="alert alert-danger">Erro ao carregar usuários</div>';
        }
    },

    closeUsersModal() {
        this.usersModalCompany = null;
        this.toggleModal('company-users-modal', false);
    },

    async openModulesModal(companyId, companyName) {
        this.modulesModalCompany = companyId;
        document.getElementById('modules-modal-title').textContent = `Módulos — ${companyName}`;
        document.getElementById('modules-modal-list').innerHTML = '<div class="loading">Carregando...</div>';
        this.toggleModal('company-modules-modal', true);
        await this.loadModules();
    },

    async loadModules() {
        const listEl = document.getElementById('modules-modal-list');
        try {
            const modules = await AdminAPI.getCompanyModules(this.modulesModalCompany);
            listEl.innerHTML = modules.map(m => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">🧩 ${this.escapeHtml(m.name)}
                            ${m.isActive
                                ? '<span class="badge badge-primary">✅ Ativo</span>'
                                : '<span class="badge" style="background: var(--danger);">⛔ Inativo</span>'}
                        </div>
                        ${m.description ? `<div class="item-description">${this.escapeHtml(m.description)}</div>` : ''}
                        <div class="item-meta" style="gap: 1rem; align-items: center;">
                            <label style="display:flex; align-items:center; gap:0.35rem; cursor:pointer;">
                                <input type="checkbox" class="module-active-checkbox" ${m.isActive ? 'checked' : ''}>
                                Ativo
                            </label>
                            <span style="display:flex; align-items:center; gap:0.35rem;">
                                R$ <input type="number" class="form-control module-price-input" style="width:110px;"
                                    min="0" step="0.01" value="${m.price != null ? m.price : ''}" placeholder="0,00">
                            </span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-sm" data-action="save-module" data-key="${m.moduleKey}">Salvar</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading modules:', error);
            listEl.innerHTML = '<div class="alert alert-danger">Erro ao carregar módulos</div>';
        }
    },

    async saveModule(moduleKey) {
        try {
            const row = document.querySelector(`[data-action="save-module"][data-key="${moduleKey}"]`).closest('.item-row');
            const isActive = row.querySelector('.module-active-checkbox').checked;
            const priceValue = row.querySelector('.module-price-input').value;

            await AdminAPI.setCompanyModule(this.modulesModalCompany, moduleKey, {
                isActive,
                price: priceValue !== '' ? parseFloat(priceValue) : null,
            });
            await this.loadModules();
        } catch (error) {
            console.error('Error saving module:', error);
            alert(error.message || 'Erro ao salvar módulo');
        }
    },

    closeModulesModal() {
        this.modulesModalCompany = null;
        this.toggleModal('company-modules-modal', false);
    },

    async openInvoicesModal(companyId, companyName) {
        this.invoicesModalCompany = companyId;
        document.getElementById('invoices-modal-title').textContent = `Faturamento — ${companyName}`;
        document.getElementById('invoice-form').reset();
        document.getElementById('invoices-modal-list').innerHTML = '<div class="loading">Carregando...</div>';
        this.toggleModal('company-invoices-modal', true);
        await this.loadInvoices();
    },

    invoiceStatusBadge(displayStatus) {
        const map = {
            paid: '<span class="badge badge-success">✅ Pago</span>',
            pending: '<span class="badge badge-warning">⏳ Pendente</span>',
            overdue: '<span class="badge badge-danger">⚠️ Atrasado</span>',
            cancelled: '<span class="badge badge-secondary">🚫 Cancelado</span>',
        };
        return map[displayStatus] || displayStatus;
    },

    formatMonth(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    },

    formatCurrency(value) {
        return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    async loadInvoices() {
        const listEl = document.getElementById('invoices-modal-list');
        try {
            const invoices = await AdminAPI.getCompanyInvoices(this.invoicesModalCompany);

            if (invoices.length === 0) {
                listEl.innerHTML = '<p style="color:var(--text-secondary)">Nenhuma cobrança registrada ainda.</p>';
                return;
            }

            listEl.innerHTML = invoices.map(inv => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.formatMonth(inv.referenceMonth)} ${this.invoiceStatusBadge(inv.displayStatus)}</div>
                        <div class="item-description">${this.formatCurrency(inv.amount)}</div>
                        <div class="item-meta">
                            <span>📅 Vencimento: ${AdminAPI.formatDate(inv.dueDate)}</span>
                            ${inv.paidAt ? `<span>Pago em ${AdminAPI.formatDate(inv.paidAt)}</span>` : ''}
                        </div>
                    </div>
                    <div class="item-actions">
                        ${inv.status === 'pending' ? `
                            <button class="item-action" title="Marcar como pago" data-action="mark-paid" data-id="${inv.id}">✅</button>
                            <button class="item-action" title="Cancelar" data-action="cancel-invoice" data-id="${inv.id}">🚫</button>
                        ` : ''}
                        <button class="item-action" title="Deletar" data-action="delete-invoice" data-id="${inv.id}">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading invoices:', error);
            listEl.innerHTML = '<div class="alert alert-danger">Erro ao carregar faturamento</div>';
        }
    },

    async createInvoice() {
        try {
            const referenceMonth = document.getElementById('invoice-reference-month').value;
            const amount = document.getElementById('invoice-amount').value;
            const dueDate = document.getElementById('invoice-due-date').value;

            if (!referenceMonth || !amount || !dueDate) {
                alert('Preencha mês de referência, valor e vencimento');
                return;
            }

            await AdminAPI.createCompanyInvoice(this.invoicesModalCompany, {
                referenceMonth: `${referenceMonth}-01`,
                amount: parseFloat(amount),
                dueDate,
            });

            document.getElementById('invoice-form').reset();
            await this.loadInvoices();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert(error.message || 'Erro ao criar cobrança');
        }
    },

    async updateInvoiceStatus(invoiceId, status) {
        try {
            await AdminAPI.updateCompanyInvoice(this.invoicesModalCompany, invoiceId, { status });
            await this.loadInvoices();
        } catch (error) {
            console.error('Error updating invoice:', error);
            alert(error.message || 'Erro ao atualizar cobrança');
        }
    },

    confirmDeleteInvoice(invoiceId) {
        if (confirm('Tem certeza que deseja deletar esta cobrança?')) {
            this.deleteInvoice(invoiceId);
        }
    },

    async deleteInvoice(invoiceId) {
        try {
            await AdminAPI.deleteCompanyInvoice(this.invoicesModalCompany, invoiceId);
            await this.loadInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert(error.message || 'Erro ao deletar cobrança');
        }
    },

    closeInvoicesModal() {
        this.invoicesModalCompany = null;
        this.toggleModal('company-invoices-modal', false);
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
