import nodemailer from 'nodemailer';

export interface InvoiceEmailData {
  to: string;
  companyName: string;
  contactName?: string | null;
  referenceMonth: Date;
  amount: number;
  dueDate: Date;
  notes?: string | null;
}

export interface EmailResult {
  sent: boolean;
  message: string;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatMonth(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function buildHtml(data: InvoiceEmailData): string {
  const greeting = data.contactName ? `Olá, ${data.contactName}` : `Prezado(a)`;
  const month = formatMonth(data.referenceMonth);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:#1a1a2e;padding:24px 32px">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">⚙️ GRC Flow</h1>
          <p style="margin:4px 0 0;color:#a0a0b8;font-size:13px">Plataforma de Gestão de Risco e Conformidade</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;color:#333;font-size:15px">${greeting},</p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6">
            Segue a fatura referente ao mês de <strong>${month}</strong> para a empresa <strong>${data.companyName}</strong>.
          </p>
          <!-- Invoice table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px">
            <tr style="background:#f9fafb">
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600;border-bottom:1px solid #e5e7eb">Detalhe</td>
              <td style="padding:10px 16px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600;border-bottom:1px solid #e5e7eb">Valor</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Empresa</td>
              <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6">${data.companyName}</td>
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:12px 16px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Mês de Referência</td>
              <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6">${month}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Vencimento</td>
              <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6">${formatDate(data.dueDate)}</td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="padding:14px 16px;color:#15803d;font-size:15px;font-weight:700">Valor Total</td>
              <td style="padding:14px 16px;color:#15803d;font-size:15px;font-weight:700">${formatBRL(data.amount)}</td>
            </tr>
          </table>
          ${data.notes ? `<p style="margin:0 0 24px;color:#555;font-size:13px;background:#f9fafb;border-left:3px solid #6366f1;padding:12px 16px;border-radius:0 4px 4px 0">${data.notes}</p>` : ''}
          <p style="margin:0;color:#888;font-size:12px;line-height:1.5">Em caso de dúvidas, entre em contato com a equipe GRC Flow.<br>Este e-mail foi gerado automaticamente — por favor não responda.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">GRC Flow · expansao-ai.com.br</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    const msg = `[EmailService] SMTP não configurado. Fatura para ${data.to} registrada mas não enviada por e-mail.`;
    console.log(msg);
    return { sent: false, message: 'SMTP não configurado — ação registrada, mas e-mail não enviado' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '"GRC Flow" <noreply@grcflow.com.br>',
    to: data.to,
    subject: `Fatura GRC Flow — ${formatMonth(data.referenceMonth)}`,
    html: buildHtml(data),
  });

  return { sent: true, message: `E-mail enviado para ${data.to}` };
}
