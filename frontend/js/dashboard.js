/* ===========================
   Dashboard JavaScript
   =========================== */

const Dashboard = {
    async init() {
        this.setupEventListeners();
        await this.loadStats();
        await this.loadRecentKnowledge();
        await this.loadRecentFlows();
        await this.loadCategories();
        this.updateLastUpdate();
    },

    setupEventListeners() {
        const newKnowledgeBtn = document.getElementById('btn-new-knowledge');
        if (newKnowledgeBtn) {
            newKnowledgeBtn.addEventListener('click', () => {
                window.location.href = 'pages/knowledge.html';
            });
        }

        const newFlowBtn = document.getElementById('btn-new-flow');
        if (newFlowBtn) {
            newFlowBtn.addEventListener('click', () => {
                window.location.href = 'pages/flows.html';
            });
        }

        const recentKnowledge = document.getElementById('recent-knowledge');
        if (recentKnowledge) {
            recentKnowledge.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.action === 'view-knowledge') {
                    window.location.href = `pages/knowledge.html?id=${id}`;
                } else if (btn.dataset.action === 'edit-knowledge') {
                    console.log(`Edit: ${id}`);
                }
            });
        }

        const recentFlows = document.getElementById('recent-flows');
        if (recentFlows) {
            recentFlows.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.action === 'view-flow') {
                    window.location.href = `pages/flows.html?id=${id}`;
                } else if (btn.dataset.action === 'edit-flow') {
                    console.log(`Edit: ${id}`);
                }
            });
        }

        const categories = document.getElementById('categories');
        if (categories) {
            categories.addEventListener('click', (e) => {
                const card = e.target.closest('[data-category]');
                if (!card) return;
                window.location.href = `pages/knowledge.html?category=${encodeURIComponent(card.dataset.category)}`;
            });
        }
    },

    async loadStats() {
        try {
            // Get knowledge count
            const knowledge = await API.getKnowledge(1);
            const kbCount = document.getElementById('kb-count');
            if (kbCount && knowledge.length) {
                kbCount.textContent = knowledge.length || 0;
            } else {
                kbCount.textContent = '0';
            }

            // Get flows
            const allFlows = await API.getFlows();
            const flowsCount = document.getElementById('flows-count');
            if (flowsCount) {
                flowsCount.textContent = allFlows.length || 0;
            }

            // Get published flows
            const published = await API.getFlows('published');
            const publishedCount = document.getElementById('published-count');
            if (publishedCount) {
                publishedCount.textContent = published.length || 0;
            }

            // Get draft flows
            const draft = await API.getFlows('draft');
            const draftCount = document.getElementById('draft-count');
            if (draftCount) {
                draftCount.textContent = draft.length || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async loadRecentKnowledge() {
        try {
            const container = document.getElementById('recent-knowledge');
            if (!container) return;

            const items = await API.getKnowledge(5);

            if (items.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>Nenhum item de conhecimento ainda</p></div>';
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
                        <div style="margin-top: 0.5rem;">
                            ${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action" title="Ver detalhes" data-action="view-knowledge" data-id="${item.id}">👁️</button>
                        <button class="item-action" title="Editar" data-action="edit-knowledge" data-id="${item.id}">✏️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent knowledge:', error);
        }
    },

    async loadRecentFlows() {
        try {
            const container = document.getElementById('recent-flows');
            if (!container) return;

            const flows = await API.getFlows();
            const recent = flows.slice(0, 5);

            if (recent.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>Nenhum fluxo de processo ainda</p></div>';
                return;
            }

            container.innerHTML = recent.map(flow => `
                <div class="item-row">
                    <div class="item-info">
                        <div class="item-title">${this.escapeHtml(flow.name)}</div>
                        <div class="item-description">${this.escapeHtml(flow.description || 'Sem descrição')}</div>
                        <div class="item-meta">
                            <span>📊 ${flow.steps ? flow.steps.length : 0} passos</span>
                            <span>📅 ${API.formatDateShort(flow.createdAt)}</span>
                            <span class="status-badge status-${flow.status}">${flow.status}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action" title="Ver detalhes" data-action="view-flow" data-id="${flow.id}">👁️</button>
                        <button class="item-action" title="Editar" data-action="edit-flow" data-id="${flow.id}">✏️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent flows:', error);
        }
    },

    async loadCategories() {
        try {
            const container = document.getElementById('categories');
            if (!container) return;

            const categories = [
                { name: 'Governance', icon: '👔', color: '#0066cc' },
                { name: 'Risk Management', icon: '⚠️', color: '#ff6600' },
                { name: 'Compliance', icon: '✅', color: '#28a745' },
                { name: 'Policies', icon: '📋', color: '#6c757d' },
                { name: 'Procedures', icon: '📋', color: '#17a2b8' }
            ];

            container.innerHTML = categories.map(cat => `
                <div class="category-card" data-category="${cat.name}">
                    <div class="category-icon">${cat.icon}</div>
                    <div class="category-name">${cat.name}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    },

    updateLastUpdate() {
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            const now = new Date();
            lastUpdateEl.textContent = API.formatDate(now.toISOString());
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
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
