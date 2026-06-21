import { createClient } from '@supabase/supabase-js'

export function storageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Private Supabase storage is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function signedStorageReference(reference: string | null | undefined) {
  if (!reference || /^https?:\/\//i.test(reference) || reference.startsWith('/')) return reference
  const { data, error } = await storageAdmin().storage.from('receipts').createSignedUrl(reference, 60 * 15)
  return error ? null : data.signedUrl
}

export async function signEntryAttachments<T extends {
  items?: Array<{ receiptUrls: string[] }>
  payments?: Array<{ attachmentUrl: string | null }>
  expenseEntries?: Array<{ attachmentUrl: string | null }>
}>(entry: T) {
  await Promise.all([
    ...(entry.items ?? []).flatMap(item => item.receiptUrls.map(async (reference, index) => {
      item.receiptUrls[index] = (await signedStorageReference(reference)) ?? reference
    })),
    ...(entry.payments ?? []).map(async payment => {
      payment.attachmentUrl = (await signedStorageReference(payment.attachmentUrl)) ?? payment.attachmentUrl
    }),
    ...(entry.expenseEntries ?? []).map(async expense => {
      expense.attachmentUrl = (await signedStorageReference(expense.attachmentUrl)) ?? expense.attachmentUrl
    }),
  ])
  return entry
}
