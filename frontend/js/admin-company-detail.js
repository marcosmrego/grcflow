/* ===========================
   Platform Admin — Company Detail
   =========================== */

const CompanyDetail = {
    companyId: null,
    company: null,

    init() {
        this.companyId = new URLSearchParams(window.location.search).get('id');
        if (!this.companyId) {
            window.location.href = 'companies.html';
            return;
        }

        this.setupEventListeners();
        this.loadCompany();
    },

    setupEventListeners() {
        document.getElementById('company-detail-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });

        document.getElementById('btn-view-users').addEventListener('click', () => this.openUsersModal());
        document.getElementById('btn-create-admin').addEventListener('click', () => this.openCreateAdminModal());
        document.getElementById('btn-view-modules').addEventListener('click', () => this.openModulesModal());
        document.getElementById('btn-view-invoices').addEventListener('click', () => this.openInvoicesModal());
        document.getElementById('btn-toggle-active').addEventListener('click', () => this.toggleActive());
        document.getElementById('btn-delete-company').addEventListener('click', () => this.confirmDelete());

        document.getElementById('company-users-modal-close').addEventListener('click', () => this.closeUsersModal());

        document.getElementById('company-modules-modal-close').addEventListener('click', () => this.closeModulesModal());
        document.getElementById('modules-modal-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="save-module"]');
            if (btn) this.saveModule(btn.dataset.key);
        });

        document.getElementById('company-invoices-modal-close').addEventListener('click', () => this.closeInvoicesModal());
        document.getElementById('invoice-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createInvoice();
        });
        document.getElementById('invoices-modal-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const invoiceId = btn.dataset.id;
            switch (btn.dataset.action) {
                case 'mark-paid': this.updateInvoiceStatus(invoiceId, 'paid'); break;
                case 'cancel-invoice': this.updateInvoiceStatus(invoiceId, 'cancelled'); break;
                case 'delete-invoice': this.confirmDeleteInvoice(invoiceId); break;
            }
        });

        document.getElementById('company-admin-modal-close').addEventListener('click', () => this.closeAdminModal());
        document.getElementById('company-admin-modal-cancel').addEventListener('click', () => this.closeAdminModal());
        document.getElementById('company-admin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCompanyAdmin();
        });
    },

    async loadCompany() {
        try {
            this.company = await AdminAPI.getCompany(this.companyId);
            this.renderCompany();
        } catch (error) {
            console.error('Error loading company:', error);
            alert('Erro ao carregar empresa');
            window.location.href = 'companies.html';
        }
    },

    renderCompany() {
        const c = this.company;

        document.getElementById('company-detail-title').textContent = `🏢 ${c.name}`;
        document.getElementById('company-detail-subtitle').textContent = c.document || 'CNPJ não informado';
        document.getElementById('company-detail-status-badge').innerHTML = c.is_active
            ? '<span class="badge badge-primary">✅ Ativa</span>'
            : '<span class="badge" style="background: var(--danger);">⛔ Inativa</span>';

        document.getElementById('company-name').value = c.name || '';
        document.getElementById('company-document').value = c.document || '';
        document.getElementById('company-legal-name').value = c.legal_name || '';
        document.getElementById('company-segment').value = c.segment || '';
        document.getElementById('company-website').value = c.website || '';
        document.getElementById('company-contact-name').value = c.contact_name || '';
        document.getElementById('company-contact-email').value = c.contact_email || '';
        document.getElementById('company-contact-phone').value = c.contact_phone || '';
        document.getElementById('company-address').value = c.address || '';
        document.getElementById('company-city').value = c.city || '';
        document.getElementById('company-state').value = c.state || '';
        document.getElementById('company-zip').value = c.zip_code || '';
        document.getElementById('company-monthly-fee').value = c.monthly_fee != null ? c.monthly_fee : '';
        document.getElementById('company-notes').value = c.notes || '';
        document.getElementById('company-active').value = String(c.is_active);

        document.getElementById('btn-toggle-active').textContent = c.is_active ? '⛔ Desativar Empresa' : '✅ Ativar Empresa';
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
                is_active: document.getElementById('company-active').value === 'true',
            };

            this.company = await AdminAPI.updateCompany(this.companyId, data);
            this.renderCompany();
            alert('Empresa atualizada com sucesso!');
        } catch (error) {
            console.error('Error saving company:', error);
            alert(error.message || 'Erro ao salvar empresa');
        }
    },

    async toggleActive() {
        const currentlyActive = this.company.is_active;
        const action = currentlyActive ? 'desativar' : 'ativar';
        if (!confirm(`Tem certeza que deseja ${action} esta empresa?`)) {
            return;
        }

        try {
            this.company = await AdminAPI.updateCompany(this.companyId, { is_active: !currentlyActive });
            this.renderCompany();
        } catch (error) {
            console.error('Error toggling company status:', error);
            alert('Erro ao alterar status da empresa');
        }
    },

    confirmDelete() {
        if (confirm('Tem certeza que deseja deletar esta empresa? Essa ação não pode ser desfeita.')) {
            this.deleteCompany();
        }
    },

    async deleteCompany() {
        try {
            await AdminAPI.deleteCompany(this.companyId);
            alert('Empresa deletada com sucesso!');
            window.location.href = 'companies.html';
        } catch (error) {
            console.error('Error deleting company:', error);
            alert(error.message || 'Erro ao deletar empresa');
        }
    },

    openCreateAdminModal() {
        document.getElementById('company-admin-modal-company').textContent = `Empresa: ${this.company.name}`;
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

            await AdminAPI.createCompanyAdmin(this.companyId, { name, email, password });
            alert('Usuário admin criado com sucesso!');
            this.closeAdminModal();
        } catch (error) {
            console.error('Error creating company admin:', error);
            alert(error.message || 'Erro ao criar usuário admin');
        }
    },

    closeAdminModal() {
        this.toggleModal('company-admin-modal', false);
    },

    toggleModal(id, show) {
        const modal = document.getElementById(id);
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    },

    async openUsersModal() {
        document.getElementById('users-modal-title').textContent = `Usuários — ${this.company.name}`;
        document.getElementById('users-modal-list').innerHTML = '<div class="loading">Carregando...</div>';
        this.toggleModal('company-users-modal', true);

        try {
            const result = await AdminAPI.getCompanyUsers(this.companyId);
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
        this.toggleModal('company-users-modal', false);
    },

    async openModulesModal() {
        document.getElementById('modules-modal-title').textContent = `Módulos — ${this.company.name}`;
        document.getElementById('modules-modal-list').innerHTML = '<div class="loading">Carregando...</div>';
        this.toggleModal('company-modules-modal', true);
        await this.loadModules();
    },

    async loadModules() {
        const listEl = document.getElementById('modules-modal-list');
        try {
            const modules = await AdminAPI.getCompanyModules(this.companyId);
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

            await AdminAPI.setCompanyModule(this.companyId, moduleKey, {
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
        this.toggleModal('company-modules-modal', false);
    },

    async openInvoicesModal() {
        document.getElementById('invoices-modal-title').textContent = `Faturamento — ${this.company.name}`;
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
            const invoices = await AdminAPI.getCompanyInvoices(this.companyId);

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

            await AdminAPI.createCompanyInvoice(this.companyId, {
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
            await AdminAPI.updateCompanyInvoice(this.companyId, invoiceId, { status });
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
            await AdminAPI.deleteCompanyInvoice(this.companyId, invoiceId);
            await this.loadInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert(error.message || 'Erro ao deletar cobrança');
        }
    },

    closeInvoicesModal() {
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

document.addEventListener('DOMContentLoaded', () => {
    CompanyDetail.init();
});
