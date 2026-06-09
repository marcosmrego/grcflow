/* ===========================
   Process Flow Management Page
   =========================== */

const ProcessFlow = {
    currentFlow: null,
    editingFlowId: null,

    async init() {
        this.setupEventListeners();
        await this.loadFlows();
    },

    setupEventListeners() {
        const form = document.getElementById('flow-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFlow();
            });
        }

        const stepForm = document.getElementById('step-form');
        if (stepForm) {
            stepForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStep();
            });
        }

        const newFlowBtn = document.getElementById('btn-new-flow');
        if (newFlowBtn) newFlowBtn.addEventListener('click', () => this.openCreateModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('keyup', () => this.search());

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterByStatus());

        const modalClose = document.getElementById('flow-modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalCancel = document.getElementById('flow-modal-cancel');
        if (modalCancel) modalCancel.addEventListener('click', () => this.closeModal());

        const modalSave = document.getElementById('flow-modal-save');
        if (modalSave) modalSave.addEventListener('click', () => this.saveFlow());

        const viewModalClose = document.getElementById('flow-view-modal-close');
        if (viewModalClose) viewModalClose.addEventListener('click', () => this.closeViewModal());

        const viewModalDelete = document.getElementById('flow-view-modal-delete');
        if (viewModalDelete) viewModalDelete.addEventListener('click', () => this.deleteFlow());

        const viewModalCloseFooter = document.getElementById('flow-view-modal-close-footer');
        if (viewModalCloseFooter) viewModalCloseFooter.addEventListener('click', () => this.closeViewModal());

        const viewModalEdit = document.getElementById('flow-view-modal-edit');
        if (viewModalEdit) viewModalEdit.addEventListener('click', () => this.editFlow());

        const viewModalAddStep = document.getElementById('flow-view-modal-add-step');
        if (viewModalAddStep) viewModalAddStep.addEventListener('click', () => this.openAddStepModal());

        const viewModalContent = document.getElementById('flow-view-content');
        if (viewModalContent) {
            viewModalContent.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="delete-step"]');
                if (btn) this.deleteStep(btn.dataset.stepId);
            });
        }

        const stepModalClose = document.getElementById('step-modal-close');
        if (stepModalClose) stepModalClose.addEventListener('click', () => this.closeStepModal());

        const stepModalCancel = document.getElementById('step-modal-cancel');
        if (stepModalCancel) stepModalCancel.addEventListener('click', () => this.closeStepModal());

        const stepModalSave = document.getElementById('step-modal-save');
        if (stepModalSave) stepModalSave.addEventListener('click', () => this.saveStep());

        const container = document.getElementById('flows-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const id = btn.dataset.id;
                switch (btn.dataset.action) {
                    case 'create': this.openCreateModal(); break;
                    case 'view': this.viewFlow(id); break;
                    case 'edit': this.editFlowById(id); break;
                    case 'delete': this.confirmDelete(id); break;
                }
            });
        }
    },

    async loadFlows() {
        try {
            const container = document.getElementById('flows-container');
            if (!container) return;

            const flows = await API.getFlows();

            if (flows.length === 0) {
                container.innerHTML = `
                    <div class="empty-flows">
                        <div class="empty-flows-icon">🔄</div>
                        <div class="empty-flows-title">Nenhum fluxo de processo</div>
                        <p class="empty-flows-text">Comece criando seu primeiro fluxo de trabalho</p>
                        <button class="btn btn-primary" data-action="create">
                            + Criar Primeiro Fluxo
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = flows.map(flow => this.renderFlowCard(flow)).join('');
        } catch (error) {
            console.error('Error loading flows:', error);
            const container = document.getElementById('flows-container');
            if (container) {
                container.innerHTML = '<div class="alert alert-danger">Erro ao carregar fluxos</div>';
            }
        }
    },

    renderFlowCard(flow) {
        const stepCount = flow.steps ? flow.steps.length : 0;
        const statusIcon = flow.status === 'published' ? '✅' : 
                          flow.status === 'draft' ? '📝' : '📦';
        const statusLabel = flow.status === 'published' ? 'Publicado' : 
                           flow.status === 'draft' ? 'Rascunho' : 'Arquivado';

        return `
            <div class="card flow-card">
                <div class="flow-header">
                    <div class="flow-info">
                        <div class="flow-name">🔄 ${this.escapeHtml(flow.name)}</div>
                        <div class="flow-description">${this.escapeHtml(flow.description || 'Sem descrição')}</div>
                        <div class="flow-meta">
                            <span>📊 ${stepCount} passo${stepCount !== 1 ? 's' : ''}</span>
                            <span>📅 ${API.formatDateShort(flow.createdAt)}</span>
                            <span class="badge badge-primary">${statusIcon} ${statusLabel}</span>
                        </div>
                    </div>
                    <div class="flow-actions">
                        <button class="flow-action-btn" title="Ver detalhes" data-action="view" data-id="${flow.id}">👁️</button>
                        <button class="flow-action-btn" title="Editar" data-action="edit" data-id="${flow.id}">✏️</button>
                        <button class="flow-action-btn" title="Deletar" data-action="delete" data-id="${flow.id}">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    },

    openCreateModal() {
        this.editingFlowId = null;
        document.getElementById('flow-modal-title').textContent = 'Novo Fluxo de Processo';
        document.getElementById('flow-form').reset();
        this.toggleModal('flow-modal', true);
    },

    async editFlowById(id) {
        try {
            const flow = await API.getFlow(id);
            this.editingFlowId = id;

            document.getElementById('flow-modal-title').textContent = 'Editar Fluxo de Processo';
            document.getElementById('flow-name').value = flow.name;
            document.getElementById('flow-description').value = flow.description || '';
            document.getElementById('flow-status').value = flow.status;

            this.toggleModal('flow-modal', true);
        } catch (error) {
            console.error('Error loading flow:', error);
            alert('Erro ao carregar fluxo');
        }
    },

    async saveFlow() {
        try {
            const name = document.getElementById('flow-name').value;
            const description = document.getElementById('flow-description').value;
            const status = document.getElementById('flow-status').value;

            if (!name) {
                alert('Digite o nome do fluxo');
                return;
            }

            const data = {
                name,
                description,
                status,
                metadata: {}
            };

            if (this.editingFlowId) {
                await API.updateFlow(this.editingFlowId, data);
                alert('Fluxo atualizado com sucesso!');
            } else {
                await API.createFlow(data);
                alert('Fluxo criado com sucesso!');
            }

            this.closeModal();
            await this.loadFlows();
        } catch (error) {
            console.error('Error saving flow:', error);
            alert('Erro ao salvar fluxo');
        }
    },

    async viewFlow(id) {
        try {
            const flow = await API.getFlow(id);
            this.currentFlow = flow;

            document.getElementById('flow-view-title').textContent = this.escapeHtml(flow.name);
            
            const steps = flow.steps && flow.steps.length > 0 ? flow.steps : [];
            
            let stepsHtml = '';
            if (steps.length > 0) {
                stepsHtml = `
                    <div class="card">
                        <div class="card-header">
                            <h3>📋 Passos do Fluxo</h3>
                        </div>
                        <div class="card-body">
                            <div class="steps-container">
                                ${steps.map((step, idx) => this.renderStep(step, idx)).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }

            document.getElementById('flow-view-content').innerHTML = `
                <div class="form-group">
                    <label>Nome</label>
                    <p>${this.escapeHtml(flow.name)}</p>
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <p>${this.escapeHtml(flow.description || 'Sem descrição')}</p>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <p><span class="badge badge-primary">${flow.status}</span></p>
                </div>
                <div class="form-group">
                    <label>Data de Criação</label>
                    <p>${API.formatDate(flow.createdAt)}</p>
                </div>
                ${stepsHtml}
            `;

            this.toggleModal('flow-view-modal', true);
        } catch (error) {
            console.error('Error viewing flow:', error);
            alert('Erro ao carregar fluxo');
        }
    },

    renderStep(step, index) {
        const typeIcons = {
            'action': '⚙️',
            'decision': '🔀',
            'wait': '⏳',
            'notification': '📢'
        };

        const typeLabels = {
            'action': 'Ação',
            'decision': 'Decisão',
            'wait': 'Espera',
            'notification': 'Notificação'
        };

        const icon = typeIcons[step.type] || '•';
        const label = typeLabels[step.type] || step.type;

        return `
            <div class="step-item step-type-${step.type}">
                <div class="step-number">${index + 1}</div>
                <div class="step-info">
                    <div class="step-title">${this.escapeHtml(step.title)}</div>
                    ${step.description ? `<div class="step-description">${this.escapeHtml(step.description)}</div>` : ''}
                    <span class="step-type-badge">${icon} ${label}</span>
                </div>
                <button class="item-action" title="Remover passo" data-action="delete-step" data-step-id="${step.id}" style="margin-left: auto; flex-shrink: 0;">🗑️</button>
            </div>
        `;
    },

    editFlow() {
        if (this.currentFlow) {
            this.editFlowById(this.currentFlow.id);
            this.closeViewModal();
        }
    },

    async deleteFlow() {
        if (!this.currentFlow) return;

        if (!confirm('Tem certeza que deseja deletar este fluxo?')) {
            return;
        }

        try {
            await API.deleteFlow(this.currentFlow.id);
            alert('Fluxo deletado com sucesso!');
            this.closeViewModal();
            await this.loadFlows();
        } catch (error) {
            console.error('Error deleting flow:', error);
            alert('Erro ao deletar fluxo');
        }
    },

    confirmDelete(id) {
        if (confirm('Tem certeza que deseja deletar este fluxo?')) {
            this.currentFlow = { id };
            this.deleteFlow();
        }
    },

    async search() {
        try {
            const query = document.getElementById('search-input').value;
            const container = document.getElementById('flows-container');

            if (!query) {
                await this.loadFlows();
                return;
            }

            const allFlows = await API.getFlows();
            const filtered = allFlows.filter(f => 
                f.name.toLowerCase().includes(query.toLowerCase()) ||
                f.description.toLowerCase().includes(query.toLowerCase())
            );

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-flows">
                        <div class="empty-flows-icon">🔍</div>
                        <div class="empty-flows-title">Nenhum resultado</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = filtered.map(flow => this.renderFlowCard(flow)).join('');
        } catch (error) {
            console.error('Search error:', error);
        }
    },

    async filterByStatus() {
        try {
            const status = document.getElementById('status-filter').value;
            const container = document.getElementById('flows-container');

            if (!status) {
                await this.loadFlows();
                return;
            }

            const flows = await API.getFlows(status);

            if (flows.length === 0) {
                container.innerHTML = '<div class="empty-flows"><p>Nenhum fluxo com este status</p></div>';
                return;
            }

            container.innerHTML = flows.map(flow => this.renderFlowCard(flow)).join('');
        } catch (error) {
            console.error('Filter error:', error);
        }
    },

    openAddStepModal() {
        if (!this.currentFlow) return;
        const currentSteps = this.currentFlow.steps ? this.currentFlow.steps.length : 0;
        document.getElementById('step-form').reset();
        document.getElementById('step-order').value = currentSteps + 1;
        this.toggleModal('step-modal', true);
    },

    async deleteStep(stepId) {
        if (!this.currentFlow) return;
        if (!confirm('Remover este passo do fluxo?')) return;

        try {
            await API.deleteFlowStep(this.currentFlow.id, stepId);
            await this.viewFlow(this.currentFlow.id);
        } catch (error) {
            console.error('Error deleting step:', error);
            alert('Erro ao remover passo');
        }
    },

    closeModal() {
        this.toggleModal('flow-modal', false);
    },

    closeViewModal() {
        this.toggleModal('flow-view-modal', false);
    },

    closeStepModal() {
        this.toggleModal('step-modal', false);
    },

    toggleModal(id, show) {
        const modal = document.getElementById(id);
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    },

    async saveStep() {
        try {
            if (!this.currentFlow) {
                alert('Selecione um fluxo primeiro');
                return;
            }

            const order = parseInt(document.getElementById('step-order').value);
            const title = document.getElementById('step-title').value;
            const description = document.getElementById('step-description').value;
            const type = document.getElementById('step-type').value;

            if (isNaN(order) || !title || !type) {
                alert('Preencha todos os campos obrigatórios');
                return;
            }

            const stepData = {
                order,
                title,
                description,
                type,
                inputs: {},
                outputs: {},
                nextSteps: []
            };

            await API.addFlowStep(this.currentFlow.id, stepData);
            alert('Passo adicionado com sucesso!');
            
            this.closeStepModal();
            await this.viewFlow(this.currentFlow.id);
        } catch (error) {
            console.error('Error saving step:', error);
            alert('Erro ao adicionar passo');
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
    ProcessFlow.init();
});
