import { Resend } from 'resend'

const FROM = 'Bindu Premium <notifications@bindupremium.com>'

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getClient() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const client = getClient()
  if (!client) return // silently skip if not configured
  try {
    await client.emails.send({ from: FROM, to, subject, html })
  } catch (e) {
    console.error('[email] failed to send:', e)
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

export function supportTicketEmail(branchName: string, type: string, description: string) {
  return {
    subject: `[Support] New ${type} request from ${escapeHtml(branchName)}`,
    html: `
      <p>A new support ticket has been submitted.</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;font-weight:bold;width:120px">Branch</td><td style="padding:8px">${escapeHtml(branchName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Type</td><td style="padding:8px">${escapeHtml(type)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top">Description</td><td style="padding:8px">${escapeHtml(description)}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/requests">View in dashboard →</a></p>
    `,
  }
}

export function leaveRequestEmail(employeeName: string, type: string, startDate: string, endDate: string, reason: string | null) {
  return {
    subject: `[Leave] ${escapeHtml(employeeName)} — ${escapeHtml(type)} leave request`,
    html: `
      <p>A new leave request has been submitted.</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;font-weight:bold;width:120px">Employee</td><td style="padding:8px">${escapeHtml(employeeName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Type</td><td style="padding:8px">${escapeHtml(type)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Dates</td><td style="padding:8px">${escapeHtml(startDate)} → ${escapeHtml(endDate)}</td></tr>
        ${reason ? `<tr><td style="padding:8px;font-weight:bold;vertical-align:top">Reason</td><td style="padding:8px">${escapeHtml(reason)}</td></tr>` : ''}
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/hr/leaves">Review in dashboard →</a></p>
    `,
  }
}

export function partyPaymentPendingEmail(branchName: string, partyName: string, amount: number, method: string) {
  return {
    subject: `[Approval] Party payment pending — ${escapeHtml(partyName)}`,
    html: `
      <p>A party payment submitted by a branch is awaiting your approval.</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;font-weight:bold;width:120px">Branch</td><td style="padding:8px">${escapeHtml(branchName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Party</td><td style="padding:8px">${escapeHtml(partyName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Amount</td><td style="padding:8px">৳${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Method</td><td style="padding:8px">${escapeHtml(method)}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/cheques">Review in Approval Centre →</a></p>
    `,
  }
}

export function chequeApprovalEmail(partyName: string, amount: number, withdrawDate: string) {
  return {
    subject: `[Approval] Cheque pending — ${escapeHtml(partyName)}`,
    html: `
      <p>A cheque payment is pending your approval.</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;font-weight:bold;width:140px">Party</td><td style="padding:8px">${escapeHtml(partyName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Amount</td><td style="padding:8px">৳${amount.toLocaleString()}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Withdraw Date</td><td style="padding:8px">${escapeHtml(withdrawDate)}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/cheques">Review in Approval Centre →</a></p>
    `,
  }
}
