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

export function dailySummaryEmail(date: string, totalSales: number, totalExpenses: number, netBalance: number, branchSummaries: Array<{ branchName: string, sales: number, expenses: number, net: number }>) {
  return {
    subject: `[Daily Summary] Register Closed — ${date}`,
    html: `
      <h2>Daily Summary for ${date}</h2>
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="padding:16px;background:#f0fdf4;border-radius:8px">
          <div style="font-size:12px;color:#166534;font-weight:bold;text-transform:uppercase">Total Sales</div>
          <div style="font-size:24px;color:#15803d;font-weight:bold">৳${totalSales.toLocaleString()}</div>
        </div>
        <div style="padding:16px;background:#fef2f2;border-radius:8px">
          <div style="font-size:12px;color:#991b1b;font-weight:bold;text-transform:uppercase">Total Expenses</div>
          <div style="font-size:24px;color:#b91c1c;font-weight:bold">৳${totalExpenses.toLocaleString()}</div>
        </div>
        <div style="padding:16px;background:#f8fafc;border-radius:8px">
          <div style="font-size:12px;color:#334155;font-weight:bold;text-transform:uppercase">Net Balance</div>
          <div style="font-size:24px;color:${netBalance >= 0 ? '#15803d' : '#b91c1c'};font-weight:bold">৳${netBalance.toLocaleString()}</div>
        </div>
      </div>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;text-align:left">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1">
            <th style="padding:12px 8px">Branch</th>
            <th style="padding:12px 8px;text-align:right">Sales</th>
            <th style="padding:12px 8px;text-align:right">Expenses</th>
            <th style="padding:12px 8px;text-align:right">Net</th>
          </tr>
        </thead>
        <tbody>
          ${branchSummaries.map(b => `
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:12px 8px;font-weight:500">${escapeHtml(b.branch)}</td>
              <td style="padding:12px 8px;text-align:right">৳${b.sales.toLocaleString()}</td>
              <td style="padding:12px 8px;text-align:right">৳${b.expenses.toLocaleString()}</td>
              <td style="padding:12px 8px;text-align:right;color:${b.net >= 0 ? '#15803d' : '#b91c1c'};font-weight:bold">৳${b.net.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL}">View full dashboard →</a></p>
    `,
  }
}
