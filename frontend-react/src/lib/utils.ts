export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    published: 'Publicado',
    archived: 'Arquivado',
    in_review: 'Em Revisão',
    pending_approval: 'Aguard. Aprovação',
    expired: 'Vencido'
  }
  return labels[status] ?? status
}

export function getDocTypeLabel(docType: string): string {
  const labels: Record<string, string> = {
    ARTICLE: 'Artigo',
    POL: 'Política',
    POP: 'Procedimento Operacional',
    IOP: 'Instrução Operacional',
    FOR: 'Formulário',
    FLU: 'Fluxograma'
  }
  return labels[docType] ?? docType
}

export function getConfidentialityLabel(c: string): string {
  const labels: Record<string, string> = {
    publico: 'Público',
    interno: 'Interno',
    restrito: 'Restrito',
    confidencial: 'Confidencial'
  }
  return labels[c] ?? c
}
