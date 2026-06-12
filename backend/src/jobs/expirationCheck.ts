import cron from 'node-cron';
import { knowledgeRepository } from '../repositories/KnowledgeRepository';

const EXPIRY_MILESTONES = [30, 15, 5];

/**
 * Rotina diária de ciclo de vida documental (RF005):
 * - Marca como "expired" (VENCIDO) documentos publicados cuja validade de 365 dias passou.
 * - Gera alertas internos para documentos que entram nas janelas de 30/15/5 dias antes do vencimento.
 *
 * Envio de e-mail real depende de um serviço de SMTP/transacional ainda não configurado no
 * projeto — por ora o alerta é registrado em knowledge_item_expiry_notifications e logado.
 */
export async function runExpirationCheck(): Promise<void> {
  const expired = await knowledgeRepository.findExpired();
  for (const item of expired) {
    await knowledgeRepository.markExpired(item.id, item.companyId);
    console.log(`[expiration-check] Item "${item.title}" (${item.id}) marcado como VENCIDO.`);
  }

  for (const milestoneDays of EXPIRY_MILESTONES) {
    const expiring = await knowledgeRepository.findExpiringAtMilestone(milestoneDays);
    for (const item of expiring) {
      await knowledgeRepository.markExpiryNotified(item.id, milestoneDays);
      // TODO: enviar e-mail/notificação interna ao responsável quando o serviço de notificações existir.
      console.log(`[expiration-check] Item "${item.title}" (${item.id}) vence em ${milestoneDays} dias.`);
    }
  }
}

/**
 * Agenda a rotina para executar diariamente à 01:00.
 */
export function scheduleExpirationCheck(): void {
  cron.schedule('0 1 * * *', () => {
    runExpirationCheck().catch(err => console.error('[expiration-check] Falhou:', err));
  });
}
