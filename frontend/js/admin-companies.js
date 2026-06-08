/* ===========================
   Platform Admin — Companies Management
   =========================== */

const Companies = {
    editingId: null,

    async init() {
        this.setupEventListeners();
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
        if (searchInput) searchInput.addEventListener('keyup', () => this.search());

        const modalClose = document.getElementById('company-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('company-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('company-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const list = document.getElementById('companies-list');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'edit': this.editCompany(id); break;
                    case 'toggle-active': this.toggleActive(id, btn.dataset.active === 'true'); break;
                    case 'delete': this.confirmDelete(id); break;
                }
            });
        }
    },

    async loadCompanies() {
        try {
            const container = document.getElementById('companies-list');
            if (!container) return;

            const result = await AdminAPI.getCompanies();
            const companies = result.items || [];
            const countEl = document.getElementById('company-count');

            if (countEl) {
                countEl.textContent = `${companies.length} empresa${companies.length !== 1 ? 's' : ''}`;
            }

            if (companies.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏢</div>
                        <div class="empty-state-title">Nenhuma empresa cadastrada</div>
                        <p class="empty-state-text">Comece cadastrando a primeira empresa da plataforma</p>
                        <button class="btn btn-primary" data-action="create">
                            + Criar Primeira Empresa
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = companies.map(company => this.renderCompanyRow(company)).join('');
        } catch (error) {
            console.error('Error loading companies:', error);
            const container = document.getElementById('companies-list');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar empresas</div>';
            }
        }
    },

    renderCompanyRow(company) {
        const statusBadge = company.is_active
            ? '<span class="badge badge-primary">✅ Ativa</span>'
            : '<span class="badge" style="background: var(--danger);">⛔ Inativa</span>';

        return `
            <div class="item-row">
                <div class="item-info">
                    <div class="item-title">🏢 ${this.escapeHtml(company.name)}</div>
                    <div class="item-description">${this.escapeHtml(company.document || 'Sem documento cadastrado')}</div>
                    <div class="item-meta">
                        <span>📅 ${AdminAPI.formatDate(company.created_at)}</span>
                        <span>${statusBadge}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-action" title="Editar" data-action="edit" data-id="${company.id}">✏️</button>
                    <button class="item-action" title="${company.is_active ? 'Desativar' : 'Ativar'}" data-action="toggle-active" data-id="${company.id}" data-active="${company.is_active}">${company.is_active ? '⛔' : '✅'}</button>
                    <button class="item-action" title="Deletar" data-action="delete" data-id="${company.id}">🗑️</button>
                </div>
            </div>
        `;
    },

    async search() {
        try {
            const query = document.getElementById('search-input').value.trim().toLowerCase();
            if (!query) {
                await this.loadCompanies();
                return;
            }

            const result = await AdminAPI.getCompanies(1, 100);
            const filtered = (result.items || []).filter(c =>
                c.name.toLowerCase().includes(query) ||
                (c.document || '').toLowerCase().includes(query)
            );

            const container = document.getElementById('companies-list');
            const countEl = document.getElementById('company-count');

            if (countEl) {
                countEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
            }

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-title">Nenhum resultado</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = filtered.map(company => this.renderCompanyRow(company)).join('');
        } catch (error) {
            console.error('Search error:', error);
        }
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

            if (!name) {
                alert('Digite o nome da empresa');
                return;
            }

            const data = { name, document: documentValue || undefined };

            if (this.editingId) {
                data.is_active = document.getElementById('company-active').value === 'true';
                await AdminAPI.updateCompany(this.editingId, data);
                alert('Empresa atualizada com sucesso!');
            } else {
                await AdminAPI.createCompany(data);
                alert('Empresa criada com sucesso!');
            }

            this.closeModal();
            await this.loadCompanies();
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
            await this.loadCompanies();
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
            await this.loadCompanies();
        } catch (error) {
            console.error('Error deleting company:', error);
            alert(error.message || 'Erro ao deletar empresa');
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
