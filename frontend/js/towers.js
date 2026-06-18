/* ===========================
   Towers/Departments Management
   =========================== */

const Towers = {
    editingId: null,
    allTowers: [],

    async init() {
        this.setupEventListeners();
        await this.loadTowers();
    },

    setupEventListeners() {
        const form = document.getElementById('tower-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const newBtn = document.getElementById('btn-new-tower');
        if (newBtn) newBtn.addEventListener('click', () => this.openCreateModal());

        const modalClose = document.getElementById('tower-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('tower-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('tower-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const list = document.getElementById('towers-list');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'edit': this.editTower(id); break;
                    case 'delete': this.confirmDelete(id); break;
                }
            });
        }
    },

    async loadTowers() {
        try {
            this.allTowers = await API.getTowers();
            this.render(this.allTowers);
        } catch (error) {
            console.error('Error loading towers:', error);
            const container = document.getElementById('towers-list');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar torres</div>';
            }
        }
    },

    render(towers) {
        const container = document.getElementById('towers-list');
        const countEl = document.getElementById('tower-count');
        if (!container) return;

        if (countEl) {
            countEl.textContent = `${towers.length} torre${towers.length !== 1 ? 's' : ''}`;
        }

        if (towers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div class="empty-state-title">Nenhuma torre cadastrada</div>
                    <p class="empty-state-text">Cadastre as torres/departamentos para gerar o código dos documentos automaticamente</p>
                    <button class="btn btn-primary" data-action="create">
                        + Criar Primeira Torre
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = towers.map(tower => this.renderTowerRow(tower)).join('');
    },

    renderTowerRow(tower) {
        const statusBadge = tower.isActive
            ? '<span class="badge badge-primary">✅ Ativa</span>'
            : '<span class="badge" style="background: var(--danger);">⛔ Inativa</span>';

        return `
            <div class="item-row">
                <div class="item-info">
                    <div class="item-title">🏢 ${this.escapeHtml(tower.name)}</div>
                    <div class="item-description">Sigla: <strong>${this.escapeHtml(tower.abbreviation)}</strong></div>
                    <div class="item-meta">
                        <span>${statusBadge}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-action" title="Editar" data-action="edit" data-id="${tower.id}">✏️</button>
                    <button class="item-action" title="Deletar" data-action="delete" data-id="${tower.id}">🗑️</button>
                </div>
            </div>
        `;
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('tower-modal-title').textContent = 'Nova Torre';
        document.getElementById('tower-form').reset();
        document.getElementById('tower-active-group').style.display = 'none';
        this.toggleModal('tower-modal', true);
    },

    editTower(id) {
        const tower = this.allTowers.find(t => t.id === id);
        if (!tower) return;

        this.editingId = id;
        document.getElementById('tower-modal-title').textContent = 'Editar Torre';
        document.getElementById('tower-name').value = tower.name;
        document.getElementById('tower-abbreviation').value = tower.abbreviation;
        document.getElementById('tower-active').value = String(tower.isActive);
        document.getElementById('tower-active-group').style.display = 'block';

        this.toggleModal('tower-modal', true);
    },

    async save() {
        try {
            const name = document.getElementById('tower-name').value.trim();
            const abbreviation = document.getElementById('tower-abbreviation').value.trim();

            if (!name || !abbreviation) {
                alert('Preencha o nome e a sigla da torre');
                return;
            }

            if (this.editingId) {
                const data = {
                    name,
                    abbreviation,
                    isActive: document.getElementById('tower-active').value === 'true'
                };
                await API.updateTower(this.editingId, data);
                alert('Torre atualizada com sucesso!');
            } else {
                await API.createTower({ name, abbreviation });
                alert('Torre criada com sucesso!');
            }

            this.closeModal();
            await this.loadTowers();
        } catch (error) {
            console.error('Error saving tower:', error);
            alert(error.message || 'Erro ao salvar torre');
        }
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja deletar esta torre?')) {
            this.deleteTower(id);
        }
    },

    async deleteTower(id) {
        try {
            await API.deleteTower(id);
            alert('Torre deletada com sucesso!');
            await this.loadTowers();
        } catch (error) {
            console.error('Error deleting tower:', error);
            alert(error.message || 'Erro ao deletar torre');
        }
    },

    closeModal() {
        this.toggleModal('tower-modal', false);
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
    Towers.init();
});
