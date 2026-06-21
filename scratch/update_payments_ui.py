import re

with open('app/entries/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if "import { supabase }" not in content:
    content = content.replace("import { z } from 'zod'", "import { z } from 'zod'\nimport { supabase } from '@/lib/supabase'")

# Add uploading state
if "uploadingAttachment" not in content:
    content = content.replace("const [loading, setLoading] = useState(false)", "const [loading, setLoading] = useState(false)\n  const [uploadingAttachment, setUploadingAttachment] = useState<Record<string, boolean>>({})")

payment_block_pattern = r'(<input type="text" className=\{inputClass\} placeholder="Note" \{\.\.\.form\.register\(`payments\.\$\{idx\}\.note` as const\)\} \/>\n\s*<\/div>)'

replacement = r'''\1
                      {(watchAll.payments[idx]?.method === 'BANK' || watchAll.payments[idx]?.method === 'CHEQUE') && (
                        <div className="sm:col-span-4 mt-2 p-3 bg-[#131b2c] border border-[#1e2d45] rounded-lg">
                          <label className="form-label text-xs flex items-center gap-2">
                            Payslip Attachment (required) 
                            {uploadingAttachment[idx] && <span className="text-[#00d2ff] animate-pulse">Uploading...</span>}
                          </label>
                          {!watchAll.payments[idx]?.attachmentUrl ? (
                            <input 
                              type="file" 
                              accept="image/*,.pdf"
                              disabled={uploadingAttachment[idx]}
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setUploadingAttachment(prev => ({ ...prev, [idx]: true }))
                                try {
                                  const partyId = watchAll.payments[idx]?.partyId || 'unknown'
                                  const timestamp = Date.now()
                                  const filePath = `payslips/${partyId}-${timestamp}-${file.name}`
                                  const { error } = await supabase.storage.from('receipts').upload(filePath, file)
                                  if (error) throw error
                                  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
                                  form.setValue(`payments.${idx}.attachmentUrl`, data.publicUrl)
                                } catch (err: any) {
                                  toast.error('Failed to upload attachment: ' + err.message)
                                } finally {
                                  setUploadingAttachment(prev => ({ ...prev, [idx]: false }))
                                }
                              }}
                              className="block w-full text-xs text-[#8899aa] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#10b981] file:text-white hover:file:bg-[#059669] cursor-pointer"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <a href={watchAll.payments[idx].attachmentUrl} target="_blank" rel="noreferrer" className="text-[#00d2ff] hover:underline text-xs flex items-center gap-1">
                                <Paperclip size={14} /> View Attached Payslip
                              </a>
                              <button 
                                type="button"
                                onClick={() => form.setValue(`payments.${idx}.attachmentUrl`, undefined)}
                                className="text-xs text-[#ef4444] hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}'''

content = re.sub(payment_block_pattern, replacement, content)

disable_pattern = r'disabled=\{loading \|\| \(missingPreviousDay && userRole !== \'ADMIN\'\)\}'

if 'const hasInvalidPayments' not in content:
    content = content.replace(
        'return (',
        'const hasInvalidPayments = watchAll.payments?.some(p => (p.method === \'BANK\' || p.method === \'CHEQUE\') && !p.attachmentUrl)\n  return ('
    )

content = content.replace(disable_pattern, "disabled={loading || (missingPreviousDay && userRole !== 'ADMIN') || hasInvalidPayments}")

with open('app/entries/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
