/* ===========================
   Knowledge Management Page
   =========================== */

const STATUS_LABELS = {
    draft: 'Rascunho',
    in_review: 'Em Revisão',
    pending_approval: 'Aguardando Aprovação',
    published: 'Aprovado',
    expired: 'Vencido',
    archived: 'Obsoleto'
};

const DOC_TYPE_LABELS = {
    ARTICLE: 'Artigo',
    POL: 'Política',
    POP: 'Procedimento Operacional',
    IOP: 'Instrução Operacional',
    FOR: 'Formulário',
    FLU: 'Fluxograma'
};

const CONFIDENTIALITY_LABELS = {
    publico: 'Público',
    interno: 'Interno',
    restrito: 'Restrito',
    confidencial: 'Confidencial'
};

const APPROVAL_LEVEL_LABELS = {
    1: '1ª Alçada — Técnica',
    2: '2ª Alçada — Compliance',
    3: '3ª Alçada — Final'
};

const APPROVAL_STATUS_LABELS = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Reprovado'
};

const Knowledge = {
    currentItem: null,
    editingId: null,
    quill: null,
    towers: [],

    async init() {
        this.initEditor();
        this.applyRolePermissions();
        await this.loadTowers();
        await this.loadStats();
        await this.loadItems();
        this.setupEventListeners();
    },

    async loadTowers() {
        try {
            this.towers = await API.getTowers();
            const select = document.getElementById('kb-tower');
            if (select) {
                select.innerHTML = '<option value="">Selecione uma torre</option>' +
                    this.towers.map(t => `<option value="${t.id}">${this.escapeHtml(t.name)} (${this.escapeHtml(t.abbreviation)})</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading towers:', error);
        }
    },

    towerLabel(towerId) {
        const tower = this.towers.find(t => t.id === towerId);
        return tower ? `${tower.name} (${tower.abbreviation})` : null;
    },

    /** Visualizador só consulta: sem criar, editar ou excluir itens. */
    canEdit() {
        const user = API.getUser();
        return !!user && user.role !== 'viewer';
    },

    applyRolePermissions() {
        const newItemBtn = document.getElementById('btn-new-item');
        if (newItemBtn && !this.canEdit()) newItemBtn.style.display = 'none';
    },

    initEditor() {
        const editorEl = document.getElementById('kb-content-editor');
        if (!editorEl || typeof Quill === 'undefined') return;

        this.quill = new Quill(editorEl, {
            theme: 'snow',
            placeholder: 'Conteúdo completo do documento',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['blockquote', 'link'],
                    ['clean']
                ]
            }
        });
    },

    /** Converte conteúdo legado (texto puro com quebras de linha) em HTML para o editor */
    contentToHtml(content) {
        if (!content) return '';
        // Heurística: só trata como HTML já formatado se contiver tags
        // que o próprio editor (Quill) gera. Evita falso-positivo com
        // texto puro que contenha "<algo>" literal.
        if (/<(p|h[1-6]|ul|ol|li|blockquote|strong|em|u|s|a\s|br|img|table)[\s/>]/i.test(content)) return content;
        return content
            .split(/\r?\n/)
            .map(line => `<p>${this.escapeHtml(line) || '<br>'}</p>`)
            .join('');
    },

    setupEventListeners() {
        const form = document.getElementById('knowledge-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.save();
            });
        }

        const newItemBtn = document.getElementById('btn-new-item');
        if (newItemBtn) newItemBtn.addEventListener('click', () => this.openCreateModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('keyup', () => this.applyFilters());

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.applyFilters());

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());

        const docTypeSelect = document.getElementById('kb-doc-type');
        if (docTypeSelect) docTypeSelect.addEventListener('change', () => this.toggleDocumentCodeField());

        const modalClose = document.getElementById('kb-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('kb-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('kb-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.save());

        const viewModalClose = document.getElementById('kb-view-modal-close');
        if (viewModalClose) viewModalClose.addEventListener('click', () => this.closeViewModal());

        const viewModalCloseFooter = document.getElementById('kb-view-modal-close-footer');
        if (viewModalCloseFooter) viewModalCloseFooter.addEventListener('click', () => this.closeViewModal());

        const viewModalEdit = document.getElementById('kb-view-modal-edit');
        if (viewModalEdit) viewModalEdit.addEventListener('click', () => this.editItem());

        const submitApprovalBtn = document.getElementById('kb-submit-approval-btn');
        if (submitApprovalBtn) submitApprovalBtn.addEventListener('click', () => this.submitForApproval());

        const tabs = document.querySelectorAll('.kb-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        const list = document.getElementById('knowledge-list');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'view': this.viewItem(id); break;
                    case 'edit': this.editFromId(id); break;
                    case 'delete': this.confirmDelete(id); break;
                }
            });
        }
    },

    async loadStats() {
        try {
            const stats = await API.getKnowledgeStats();
            document.getElementById('kpi-total').textContent = stats.total;
            document.getElementById('kpi-current').textContent = stats.current;
            document.getElementById('kpi-alert').textContent = stats.alert;
            document.getElementById('kpi-expired').textContent = stats.expired;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async loadItems(limit = 100) {
        try {
            const items = await API.getKnowledge(limit);
            this.allItems = items;
            this.renderList(items);
        } catch (error) {
            console.error('Error loading items:', error);
            const container = document.getElementById('knowledge-list');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar itens</div>';
            }
        }
    },

    async applyFilters() {
        try {
            const query = document.getElementById('search-input').value.trim();
            const category = document.getElementById('category-filter').value;
            const status = document.getElementById('status-filter').value;

            const container = document.getElementById('knowledge-list');
            container.innerHTML = '<div class="loading">Carregando...</div>';

            let items;
            if (query) {
                items = await API.searchKnowledge(query);
            } else if (category) {
                items = await API.getKnowledgeByCategory(category);
            } else {
                items = await API.getKnowledge(100);
            }

            if (status) {
                items = items.filter(item => item.status === status);
            }

            this.renderList(items);
        } catch (error) {
            console.error('Filter error:', error);
        }
    },

    renderList(items) {
        const container = document.getElementById('knowledge-list');
        if (!container) return;

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
                    ${this.canEdit() ? `<button class="btn btn-primary" data-action="create">+ Criar Primeiro Item</button>` : ''}
                </div>
            `;
            return;
        }

        const canEdit = this.canEdit();

        container.innerHTML = items.map(item => `
            <div class="item-row">
                <div class="item-info">
                    <div class="item-title" style="cursor:pointer" title="Ver detalhes" data-action="view" data-id="${item.id}">
                        ${this.escapeHtml(item.title)}
                        <span class="status-badge status-${item.status}">${STATUS_LABELS[item.status] || item.status}</span>
                    </div>
                    <div class="item-description">${this.escapeHtml(item.description)}</div>
                    <div class="item-meta">
                        <span>📂 ${this.escapeHtml(item.category)}</span>
                        <span>📄 ${DOC_TYPE_LABELS[item.docType] || item.docType}${item.documentCode ? ` — ${this.escapeHtml(item.documentCode)}` : ''}</span>
                        ${this.towerLabel(item.towerId) ? `<span>🏢 ${this.escapeHtml(this.towerLabel(item.towerId))}</span>` : ''}
                        <span>📅 ${API.formatDateShort(item.createdAt)}</span>
                        ${item.expiresAt ? `<span>⏳ Válido até ${API.formatDateShort(item.expiresAt)}</span>` : ''}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        ${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-action" title="Ver detalhes" data-action="view" data-id="${item.id}">👁️</button>
                    ${canEdit ? `<button class="item-action" title="Editar" data-action="edit" data-id="${item.id}">✏️</button>` : ''}
                    ${canEdit ? `<button class="item-action" title="Deletar" data-action="delete" data-id="${item.id}">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    },

    toggleDocumentCodeField() {
        const docType = document.getElementById('kb-doc-type').value;
        const group = document.getElementById('kb-document-code-group');
        const select = document.getElementById('kb-tower');
        const isControlled = docType !== 'ARTICLE';
        group.style.display = isControlled ? '' : 'none';
        if (!isControlled) select.value = '';
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('modal-title').textContent = 'Novo Item de Conhecimento';
        document.getElementById('knowledge-form').reset();
        if (this.quill) this.quill.setText('');
        document.getElementById('kb-doc-type').disabled = false;
        document.getElementById('kb-doc-type').value = 'ARTICLE';
        document.getElementById('kb-tower').disabled = false;
        document.getElementById('kb-document-code-hint').textContent = 'O código do documento é gerado automaticamente (ex: POL_HD_001)';
        document.getElementById('kb-confidentiality').value = 'interno';
        document.getElementById('kb-validity-days').value = 365;
        document.getElementById('kb-change-reason-group').style.display = 'none';
        this.toggleDocumentCodeField();
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
            if (this.quill) this.quill.root.innerHTML = this.contentToHtml(item.content);
            document.getElementById('kb-tags').value = item.tags.join(', ');
            document.getElementById('kb-doc-type').value = item.docType;
            document.getElementById('kb-doc-type').disabled = true;
            document.getElementById('kb-tower').value = item.towerId || '';
            document.getElementById('kb-tower').disabled = true;
            document.getElementById('kb-document-code-hint').textContent = item.documentCode
                ? `Código gerado: ${item.documentCode} (torre não pode ser alterada após a criação)`
                : 'Documento do tipo Artigo não usa código.';
            document.getElementById('kb-confidentiality').value = item.confidentiality;
            document.getElementById('kb-validity-days').value = item.validityDays;
            document.getElementById('kb-change-reason').value = '';
            document.getElementById('kb-change-reason-group').style.display = '';
            this.toggleDocumentCodeField();

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
            const content = this.quill ? this.quill.root.innerHTML : '';
            const isContentEmpty = this.quill ? this.quill.getText().trim().length === 0 : !content;
            const tagsInput = document.getElementById('kb-tags').value;
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
            const docType = document.getElementById('kb-doc-type').value;
            const towerId = document.getElementById('kb-tower').value;
            const confidentiality = document.getElementById('kb-confidentiality').value;
            const validityDays = parseInt(document.getElementById('kb-validity-days').value, 10) || 365;
            const changeReason = document.getElementById('kb-change-reason').value.trim();

            if (!category || !title || !description || isContentEmpty) {
                alert('Preencha todos os campos obrigatórios');
                return;
            }

            if (!this.editingId && docType !== 'ARTICLE' && !towerId) {
                alert('Selecione a torre/departamento deste documento.');
                return;
            }

            const data = {
                category, title, description, content, tags,
                docType,
                confidentiality,
                validityDays
            };

            if (!this.editingId && docType !== 'ARTICLE') {
                data.towerId = towerId;
            }

            if (this.editingId) {
                if (changeReason) data.changeReason = changeReason;
                await API.updateKnowledge(this.editingId, data);
                alert('Item atualizado com sucesso!');
            } else {
                await API.createKnowledge(data);
                alert('Item criado com sucesso!');
            }

            this.closeModal();
            await this.loadStats();
            await this.loadItems();
        } catch (error) {
            console.error('Error saving item:', error);
            alert(error.message || 'Erro ao salvar item');
        }
    },

    async viewItem(id) {
        try {
            const item = await API.getKnowledgeItem(id);
            this.currentItem = item;

            document.getElementById('view-title').textContent = this.escapeHtml(item.title);
            this.renderDetailsTab(item);
            await this.renderVersionsTab(item);
            await this.renderWorkflowTab(item);

            const canEdit = this.canEdit();

            document.getElementById('delete-btn').onclick = () => this.deleteItem(id);
            document.getElementById('delete-btn').style.display = canEdit ? '' : 'none';
            document.getElementById('kb-view-modal-edit').style.display = canEdit ? '' : 'none';

            const submitBtn = document.getElementById('kb-submit-approval-btn');
            if (canEdit && (item.status === 'draft' || item.status === 'in_review')) {
                submitBtn.style.display = '';
            } else {
                submitBtn.style.display = 'none';
            }

            this.switchTab('details');
            this.toggleModal('view-modal', true);
        } catch (error) {
            console.error('Error viewing item:', error);
            alert('Erro ao carregar item');
        }
    },

    renderDetailsTab(item) {
        document.getElementById('tab-details').innerHTML = `
            <div class="item-details">
                <div class="form-row">
                    <div class="form-group">
                        <label>Status</label>
                        <p><span class="status-badge status-${item.status}">${STATUS_LABELS[item.status] || item.status}</span></p>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Documento</label>
                        <p>${DOC_TYPE_LABELS[item.docType] || item.docType}${item.documentCode ? ` — ${this.escapeHtml(item.documentCode)}` : ''}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoria</label>
                        <p>${this.escapeHtml(item.category)}</p>
                    </div>
                    ${this.towerLabel(item.towerId) ? `
                    <div class="form-group">
                        <label>Torre/Departamento</label>
                        <p>${this.escapeHtml(this.towerLabel(item.towerId))}</p>
                    </div>` : ''}
                    <div class="form-group">
                        <label>Confidencialidade</label>
                        <p>${CONFIDENTIALITY_LABELS[item.confidentiality] || item.confidentiality}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <p>${this.escapeHtml(item.description)}</p>
                </div>
                <div class="form-group">
                    <label>Tags</label>
                    <div>${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('') || '<span style="color:var(--text-secondary)">Sem tags</span>'}</div>
                </div>
                <div class="form-group">
                    <label>Conteúdo</label>
                    <div class="kb-content-rendered ql-editor">
                        ${this.renderContent(item.content)}
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Validade</label>
                        <p>${item.validityDays} dias</p>
                    </div>
                    <div class="form-group">
                        <label>Vencimento</label>
                        <p>${item.expiresAt ? API.formatDate(item.expiresAt) : '—'}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Data de Criação</label>
                        <p>${API.formatDate(item.createdAt)}</p>
                    </div>
                    <div class="form-group">
                        <label>Última Atualização</label>
                        <p>${API.formatDate(item.updatedAt)}</p>
                    </div>
                </div>
            </div>
        `;
    },

    async renderVersionsTab(item) {
        const container = document.getElementById('tab-versions');
        container.innerHTML = '<div class="loading">Carregando versões...</div>';
        try {
            const versions = await API.getKnowledgeVersions(item.id);
            if (versions.length === 0) {
                container.innerHTML = '<p style="color:var(--text-secondary)">Nenhuma versão encontrada.</p>';
                return;
            }

            const latestVersion = versions[0].versionNumber;

            container.innerHTML = `
                <div class="version-list">
                    ${versions.map(v => `
                        <div class="version-row">
                            <div>
                                <strong>Versão ${v.versionNumber}</strong>
                                <span class="status-badge status-${v.status}">${STATUS_LABELS[v.status] || v.status}</span>
                                <div style="color: var(--text-secondary); margin-top: 0.25rem;">
                                    ${v.changeReason ? `Motivo: ${this.escapeHtml(v.changeReason)}<br>` : ''}
                                    ${v.affectedSection ? `Seção: ${this.escapeHtml(v.affectedSection)}<br>` : ''}
                                    Por ${this.escapeHtml(v.createdByName || v.createdByEmail || 'desconhecido')} em ${API.formatDate(v.createdAt)}
                                </div>
                            </div>
                            <div>
                                ${v.versionNumber !== latestVersion
                                    ? (this.canEdit() ? `<button class="btn btn-outline btn-sm" data-restore="${v.versionNumber}">Restaurar</button>` : '')
                                    : '<span class="badge badge-primary">Atual</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            container.querySelectorAll('[data-restore]').forEach(btn => {
                btn.addEventListener('click', () => this.restoreVersion(item.id, parseInt(btn.dataset.restore, 10)));
            });
        } catch (error) {
            console.error('Error loading versions:', error);
            container.innerHTML = '<div class="alert alert-danger">Erro ao carregar histórico de versões</div>';
        }
    },

    async renderWorkflowTab(item) {
        const container = document.getElementById('tab-workflow');

        if (item.status === 'draft') {
            container.innerHTML = '<p style="color:var(--text-secondary)">Este documento ainda não foi enviado para aprovação. Use o botão "Enviar p/ Aprovação" para iniciar o workflow.</p>';
            return;
        }

        container.innerHTML = '<div class="loading">Carregando workflow...</div>';
        try {
            const approvals = await API.getKnowledgeApprovals(item.id);
            if (approvals.length === 0) {
                container.innerHTML = '<p style="color:var(--text-secondary)">Nenhum workflow de aprovação iniciado para este documento.</p>';
                return;
            }

            // Próxima alçada pendente, na ordem sequencial
            const sorted = [...approvals].sort((a, b) => a.level - b.level);
            const nextPending = item.status === 'pending_approval'
                ? sorted.find(a => a.status === 'pending')
                : null;

            container.innerHTML = `
                <div class="approval-steps">
                    ${sorted.map(a => `
                        <div class="approval-step">
                            <div class="approval-step-info">
                                <strong>${APPROVAL_LEVEL_LABELS[a.level] || `Alçada ${a.level}`}</strong>
                                <span class="status-badge status-${a.status === 'approved' ? 'published' : a.status === 'rejected' ? 'expired' : 'pending_approval'}">
                                    ${APPROVAL_STATUS_LABELS[a.status] || a.status}
                                </span>
                                ${a.decidedAt ? `<span style="color:var(--text-secondary); font-size:0.85rem;">em ${API.formatDate(a.decidedAt)}</span>` : ''}
                                ${a.justification ? `<span style="color:var(--text-secondary); font-size:0.85rem;">Justificativa: ${this.escapeHtml(a.justification)}</span>` : ''}
                            </div>
                            ${this.canEdit() && nextPending && nextPending.level === a.level ? `
                                <div style="display:flex; gap:0.5rem;">
                                    <button class="btn btn-success btn-sm" data-approve="${a.level}">Aprovar</button>
                                    <button class="btn btn-danger btn-sm" data-reject="${a.level}">Reprovar</button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            container.querySelectorAll('[data-approve]').forEach(btn => {
                btn.addEventListener('click', () => this.decideApproval(item.id, parseInt(btn.dataset.approve, 10), 'approved'));
            });
            container.querySelectorAll('[data-reject]').forEach(btn => {
                btn.addEventListener('click', () => this.decideApproval(item.id, parseInt(btn.dataset.reject, 10), 'rejected'));
            });
        } catch (error) {
            console.error('Error loading approvals:', error);
            container.innerHTML = '<div class="alert alert-danger">Erro ao carregar workflow de aprovação</div>';
        }
    },

    async submitForApproval() {
        if (!this.currentItem) return;
        if (!confirm('Enviar este documento para o workflow de aprovação em 3 alçadas?')) return;

        try {
            await API.submitKnowledgeForApproval(this.currentItem.id);
            alert('Documento enviado para aprovação!');
            await this.viewItem(this.currentItem.id);
            await this.loadStats();
            await this.applyFilters();
        } catch (error) {
            console.error('Error submitting for approval:', error);
            alert(error.message || 'Erro ao enviar para aprovação');
        }
    },

    async decideApproval(id, level, decision) {
        try {
            if (decision === 'approved') {
                if (!confirm(`Confirmar aprovação da ${APPROVAL_LEVEL_LABELS[level] || `alçada ${level}`}?`)) return;
                await API.approveKnowledge(id, level);
                alert('Alçada aprovada!');
            } else {
                const justification = prompt('Justificativa para reprovação (obrigatória):');
                if (!justification) {
                    alert('A reprovação requer uma justificativa.');
                    return;
                }
                await API.rejectKnowledge(id, level, justification);
                alert('Alçada reprovada. O documento voltou para "Em Revisão".');
            }

            await this.viewItem(id);
            await this.loadStats();
            await this.applyFilters();
        } catch (error) {
            console.error('Error deciding approval:', error);
            alert(error.message || 'Erro ao registrar decisão');
        }
    },

    async restoreVersion(id, versionNumber) {
        if (!confirm(`Restaurar a versão ${versionNumber}? Isso criará uma nova versão com este conteúdo.`)) return;

        try {
            await API.restoreKnowledgeVersion(id, versionNumber);
            alert('Versão restaurada com sucesso!');
            await this.viewItem(id);
            await this.loadStats();
            await this.applyFilters();
        } catch (error) {
            console.error('Error restoring version:', error);
            alert(error.message || 'Erro ao restaurar versão');
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.kb-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        document.querySelectorAll('.kb-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
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
            await this.loadStats();
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

    renderContent(content) {
        const html = this.contentToHtml(content);
        return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : this.escapeHtml(content);
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
