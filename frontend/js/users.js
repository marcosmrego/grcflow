/* ===========================
   Company Users Management
   =========================== */

const Users = {
    editingId: null,
    allUsers: [],

    async init() {
        this.setupEventListeners();
        await this.loadUsers();
    },

    setupEventListeners() {
        const form = document.getElementById('user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const newBtn = document.getElementById('btn-new-user');
        if (newBtn) newBtn.addEventListener('click', () => this.openCreateModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('keyup', () => this.filter());

        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) roleFilter.addEventListener('change', () => this.filter());

        const modalClose = document.getElementById('user-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('user-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('user-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const list = document.getElementById('users-list');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'edit': this.editUser(id); break;
                    case 'toggle-active': this.toggleActive(id, btn.dataset.active === 'true'); break;
                    case 'delete': this.confirmDelete(id); break;
                }
            });
        }
    },

    async loadUsers() {
        try {
            const container = document.getElementById('users-list');
            if (!container) return;

            const result = await API.getUsers();
            this.allUsers = result.items || [];
            this.render(this.allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            const container = document.getElementById('users-list');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar usuários</div>';
            }
        }
    },

    render(users) {
        const container = document.getElementById('users-list');
        const countEl = document.getElementById('user-count');
        if (!container) return;

        if (countEl) {
            countEl.textContent = `${users.length} usuário${users.length !== 1 ? 's' : ''}`;
        }

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-title">Nenhum usuário encontrado</div>
                    <p class="empty-state-text">Convide colegas para colaborar na sua empresa</p>
                    <button class="btn btn-primary" data-action="create">
                        + Criar Primeiro Usuário
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map(user => this.renderUserRow(user)).join('');
    },

    roleLabel(role) {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'editor': return 'Editor';
            case 'viewer': return 'Visualizador';
            default: return role;
        }
    },

    approvalGroupLabel(group) {
        switch (group) {
            case 'technical': return '1ª Alçada — Técnica';
            case 'compliance': return '2ª Alçada — Compliance';
            case 'final': return '3ª Alçada — Gestor Final';
            default: return null;
        }
    },

    renderUserRow(user) {
        const statusBadge = user.is_active
            ? '<span class="badge badge-primary">✅ Ativo</span>'
            : '<span class="badge" style="background: var(--danger);">⛔ Inativo</span>';
        const approvalGroupLabel = this.approvalGroupLabel(user.approvalGroup);

        return `
            <div class="item-row">
                <div class="item-info">
                    <div class="item-title">👤 ${this.escapeHtml(user.name)}</div>
                    <div class="item-description">${this.escapeHtml(user.email)} · ${this.roleLabel(user.role)}${approvalGroupLabel ? ` · ${approvalGroupLabel}` : ''}</div>
                    <div class="item-meta">
                        <span>📅 ${API.formatDate(user.created_at)}</span>
                        <span>${statusBadge}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-action" title="Editar" data-action="edit" data-id="${user.id}">✏️</button>
                    <button class="item-action" title="${user.is_active ? 'Desativar' : 'Ativar'}" data-action="toggle-active" data-id="${user.id}" data-active="${user.is_active}">${user.is_active ? '⛔' : '✅'}</button>
                    <button class="item-action" title="Deletar" data-action="delete" data-id="${user.id}">🗑️</button>
                </div>
            </div>
        `;
    },

    filter() {
        const query = document.getElementById('search-input').value.trim().toLowerCase();
        const role = document.getElementById('role-filter').value;

        const filtered = this.allUsers.filter(u => {
            const matchesQuery = !query ||
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query);
            const matchesRole = !role || u.role === role;
            return matchesQuery && matchesRole;
        });

        const container = document.getElementById('users-list');
        const countEl = document.getElementById('user-count');

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

        container.innerHTML = filtered.map(user => this.renderUserRow(user)).join('');
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('user-modal-title').textContent = 'Novo Usuário';
        document.getElementById('user-form').reset();
        document.getElementById('user-email-group').style.display = 'block';
        document.getElementById('user-email').required = true;
        document.getElementById('user-password-group').style.display = 'block';
        document.getElementById('user-active-group').style.display = 'none';
        document.getElementById('user-approval-group').value = '';
        this.toggleModal('user-modal', true);
    },

    async editUser(id) {
        const user = this.allUsers.find(u => u.id === id);
        if (!user) return;

        this.editingId = id;
        document.getElementById('user-modal-title').textContent = 'Editar Usuário';
        document.getElementById('user-form').reset();
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-active').value = String(user.is_active);
        document.getElementById('user-approval-group').value = user.approvalGroup || '';

        // Email and password cannot be changed via this form (backend only supports name/role/is_active)
        document.getElementById('user-email-group').style.display = 'none';
        document.getElementById('user-email').required = false;
        document.getElementById('user-password-group').style.display = 'none';
        document.getElementById('user-active-group').style.display = 'block';

        this.toggleModal('user-modal', true);
    },

    async save() {
        try {
            const name = document.getElementById('user-name').value.trim();
            const role = document.getElementById('user-role').value;
            const approvalGroup = document.getElementById('user-approval-group').value || null;

            if (!name) {
                alert('Digite o nome do usuário');
                return;
            }

            if (this.editingId) {
                const data = {
                    name,
                    role,
                    is_active: document.getElementById('user-active').value === 'true',
                    approvalGroup
                };
                await API.updateUser(this.editingId, data);
                alert('Usuário atualizado com sucesso!');
            } else {
                const email = document.getElementById('user-email').value.trim();
                const password = document.getElementById('user-password').value;

                if (!email) {
                    alert('Digite o e-mail do usuário');
                    return;
                }

                const data = { email, name, role, approvalGroup };
                if (password) data.password = password;

                await API.createUser(data);
                alert('Usuário criado com sucesso!');
            }

            this.closeModal();
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            alert(error.message || 'Erro ao salvar usuário');
        }
    },

    async toggleActive(id, currentlyActive) {
        const action = currentlyActive ? 'desativar' : 'ativar';
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) {
            return;
        }

        try {
            await API.updateUser(id, { is_active: !currentlyActive });
            await this.loadUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert('Erro ao alterar status do usuário');
        }
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja deletar este usuário? Essa ação não pode ser desfeita.')) {
            this.deleteUser(id);
        }
    },

    async deleteUser(id) {
        try {
            await API.deleteUser(id);
            alert('Usuário deletado com sucesso!');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.message || 'Erro ao deletar usuário');
        }
    },

    closeModal() {
        this.toggleModal('user-modal', false);
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
    Users.init();
});
