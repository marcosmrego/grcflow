/* ===========================
   Knowledge Management Page
   =========================== */

const Knowledge = {
    currentItem: null,
    editingId: null,

    async init() {
        await this.loadItems();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const form = document.getElementById('knowledge-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }
    },

    async loadItems(limit = 100) {
        try {
            const container = document.getElementById('knowledge-list');
            if (!container) return;

            const items = await API.getKnowledge(limit);
            const countEl = document.getElementById('item-count');

            if (countEl) {
                countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
            }

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-title">Nenhum item de conhecimento</div>
                        <p class="empty-state-text">Comece adicionando itens à sua base de conhecimento</p>
                        <button class="btn btn-primary" onclick="Knowledge.openCreateModal()">
                            + Criar Primeiro Item
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map(item => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(item.title)}</div>
                        <div class="item-description">${this.escapeHtml(item.description)}</div>
                        <div class="item-meta">
                            <span>📂 ${this.escapeHtml(item.category)}</span>
                            <span>📅 ${API.formatDateShort(item.createdAt)}</span>
                            <span>🏷️ ${item.tags.length} tag${item.tags.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div style="margin-top: 0.5rem;">
                            ${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action" title="Ver detalhes" onclick="Knowledge.viewItem('${item.id}')">👁️</button>
                        <button class="item-action" title="Editar" onclick="Knowledge.editFromId('${item.id}')">✏️</button>
                        <button class="item-action" title="Deletar" onclick="Knowledge.confirmDelete('${item.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading items:', error);
            const container = document.getElementById('knowledge-list');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar itens</div>';
            }
        }
    },

    async search() {
        try {
            const query = document.getElementById('search-input').value;
            if (!query) {
                await this.loadItems();
                return;
            }

            const container = document.getElementById('knowledge-list');
            container.innerHTML = '<div class="loading">Buscando...</div>';

            const items = await API.searchKnowledge(query);
            const countEl = document.getElementById('item-count');

            if (countEl) {
                countEl.textContent = `${items.length} resultado${items.length !== 1 ? 's' : ''}`;
            }

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-title">Nenhum resultado</div>
                        <p class="empty-state-text">Nenhum item corresponde à sua busca</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map(item => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(item.title)}</div>
                        <div class="item-description">${this.escapeHtml(item.description)}</div>
                        <div class="item-meta">
                            <span>📂 ${this.escapeHtml(item.category)}</span>
                            <span>📅 ${API.formatDateShort(item.createdAt)}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action" onclick="Knowledge.viewItem('${item.id}')">👁️</button>
                        <button class="item-action" onclick="Knowledge.editFromId('${item.id}')">✏️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Search error:', error);
        }
    },

    async filterByCategory() {
        try {
            const category = document.getElementById('category-filter').value;
            
            if (!category) {
                await this.loadItems();
                return;
            }

            const container = document.getElementById('knowledge-list');
            container.innerHTML = '<div class="loading">Filtrando...</div>';

            const items = await API.getKnowledgeByCategory(category);
            const countEl = document.getElementById('item-count');

            if (countEl) {
                countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
            }

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Nenhum item nesta categoria</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map(item => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(item.title)}</div>
                        <div class="item-description">${this.escapeHtml(item.description)}</div>
                        <div class="item-meta">
                            <span>📂 ${this.escapeHtml(item.category)}</span>
                            <span>📅 ${API.formatDateShort(item.createdAt)}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action" onclick="Knowledge.viewItem('${item.id}')">👁️</button>
                        <button class="item-action" onclick="Knowledge.editFromId('${item.id}')">✏️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Filter error:', error);
        }
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('modal-title').textContent = 'Novo Item de Conhecimento';
        document.getElementById('knowledge-form').reset();
        this.toggleModal('knowledge-modal', true);
    },

    async editFromId(id) {
        try {
            const item = await API.getKnowledgeItem(id);
            this.editingId = id;
            
            document.getElementById('modal-title').textContent = 'Editar Item de Conhecimento';
            document.getElementById('kb-category').value = item.category;
            document.getElementById('kb-title').value = item.title;
            document.getElementById('kb-description').value = item.description;
            document.getElementById('kb-content').value = item.content;
            document.getElementById('kb-tags').value = item.tags.join(', ');
            
            this.toggleModal('knowledge-modal', true);
        } catch (error) {
            console.error('Error loading item:', error);
            alert('Erro ao carregar item');
        }
    },

    async save() {
        try {
            const category = document.getElementById('kb-category').value;
            const title = document.getElementById('kb-title').value;
            const description = document.getElementById('kb-description').value;
            const content = document.getElementById('kb-content').value;
            const tagsInput = document.getElementById('kb-tags').value;
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

            if (!category || !title || !description || !content) {
                alert('Preencha todos os campos obrigatórios');
                return;
            }

            const data = { category, title, description, content, tags };

            if (this.editingId) {
                await API.updateKnowledge(this.editingId, data);
                alert('Item atualizado com sucesso!');
            } else {
                await API.createKnowledge(data);
                alert('Item criado com sucesso!');
            }

            this.closeModal();
            await this.loadItems();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Erro ao salvar item');
        }
    },

    async viewItem(id) {
        try {
            const item = await API.getKnowledgeItem(id);
            this.currentItem = item;

            document.getElementById('view-title').textContent = this.escapeHtml(item.title);
            document.getElementById('view-content').innerHTML = `
                <div class="item-details">
                    <div class="form-group">
                        <label>Categoria</label>
                        <p>${this.escapeHtml(item.category)}</p>
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <p>${this.escapeHtml(item.description)}</p>
                    </div>
                    <div class="form-group">
                        <label>Tags</label>
                        <div>${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>
                    </div>
                    <div class="form-group">
                        <label>Conteúdo</label>
                        <div style="background-color: var(--bg-secondary); padding: 1rem; border-radius: var(--border-radius); white-space: pre-wrap;">
                            ${this.escapeHtml(item.content)}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Data de Criação</label>
                        <p>${API.formatDate(item.createdAt)}</p>
                    </div>
                    <div class="form-group">
                        <label>Última Atualização</label>
                        <p>${API.formatDate(item.updatedAt)}</p>
                    </div>
                </div>
            `;

            document.getElementById('delete-btn').onclick = () => this.deleteItem(id);
            this.toggleModal('view-modal', true);
        } catch (error) {
            console.error('Error viewing item:', error);
            alert('Erro ao carregar item');
        }
    },

    editItem() {
        if (this.currentItem) {
            this.editFromId(this.currentItem.id);
            this.closeViewModal();
        }
    },

    async deleteItem(id = null) {
        const itemId = id || this.currentItem.id;
        if (!confirm('Tem certeza que deseja deletar este item?')) {
            return;
        }

        try {
            await API.deleteKnowledge(itemId);
            alert('Item deletado com sucesso!');
            this.closeViewModal();
            await this.loadItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Erro ao deletar item');
        }
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja deletar este item?')) {
            this.deleteItem(id);
        }
    },

    closeModal() {
        this.toggleModal('knowledge-modal', false);
    },

    closeViewModal() {
        this.toggleModal('view-modal', false);
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
    Knowledge.init();
});
