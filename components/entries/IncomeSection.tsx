import { useFieldArray, Control, UseFormRegister, useWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Plus, X, Paperclip } from 'lucide-react'
import { Category } from '@/lib/types'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setValue: UseFormSetValue<NewEntryFormValues>
  categories: Category[]
  inputClass: string
  selectClass: string
  errors: FieldErrors<NewEntryFormValues>
  generateId: () => string
}

export function IncomeSection({ control, register, setValue, categories, inputClass, selectClass, errors, generateId }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'incomeItems'
  })
  
  const incomeItemsWatch = useWatch({ control, name: 'incomeItems' }) || []
  const [uploadingAttachment, setUploadingAttachment] = useState<Record<string, boolean>>({})

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Income / Sales</h3>
      {fields.map((field, idx) => {
        const currentCategoryId = incomeItemsWatch[idx]?.categoryId;
        const currentCat = categories.find(c => String(c.id) === String(currentCategoryId));
        const isOpeningBalance = currentCat?.name === 'Opening Balance';

        return (
        <div key={field.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 mb-3 relative group">
          {!isOpeningBalance && (
            <button type="button" aria-label="Remove income" onClick={() => remove(idx)} className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground p-1 rounded-full z-10">
              <X size={14} />
            </button>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <select 
                className={`${selectClass} ${isOpeningBalance ? 'opacity-70 pointer-events-none' : ''}`} 
                {...register(`incomeItems.${idx}.categoryId` as const)}
              >
                <option value="">Select Category</option>
                {categories
                  .filter(c => c.type === 'INCOME' && (c.name !== 'Opening Balance' || String(c.id) === String(currentCategoryId)))
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.incomeItems?.[idx]?.categoryId?.message && <span className="text-xs text-destructive mt-1 block">{errors.incomeItems[idx].categoryId.message}</span>}
            </div>
            <div className="sm:col-span-3">
              <input 
                type="number"
                className={`text-right tabular-nums font-mono ${inputClass} ${isOpeningBalance ? 'opacity-70 pointer-events-none' : ''}`} 
                readOnly={isOpeningBalance}
                placeholder="Amount" 
                {...register(`incomeItems.${idx}.amount` as const)} 
              />
              {errors.incomeItems?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.incomeItems[idx].amount.message}</span>}
            </div>
            <div className="sm:col-span-5">
              <input type="text" className={inputClass} placeholder="Note" {...register(`incomeItems.${idx}.detail.note` as const)} />
            </div>
            
            {/* Supabase URL File Upload */}
            <div className="sm:col-span-12 mt-2">
              <label className="form-label text-xs flex items-center gap-2">
                Receipt / Invoice
                {uploadingAttachment[idx] && <span className="text-primary animate-pulse">Uploading...</span>}
              </label>
              
              <input 
                type="file" 
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                disabled={uploadingAttachment[idx]}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length === 0) return
                  const existingFiles = incomeItemsWatch[idx]?.detail?.files || []
                  setValue(`incomeItems.${idx}.detail.files`, [...existingFiles, ...files], { shouldDirty: true })
                }}
              />
              
              {incomeItemsWatch[idx]?.detail?.files && incomeItemsWatch[idx].detail.files.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {incomeItemsWatch[idx].detail.files.map((file: string | File, fileIdx: number) => {
                    const isLocal = file instanceof File;
                    const fileName = isLocal ? file.name : (typeof file === 'string' ? file.split('/').pop() : 'Unknown file');
                    
                    return (
                    <div key={fileIdx} className="flex items-center justify-between bg-muted p-2 rounded-md border border-border">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="shrink-0 text-primary" />
                        <span className="text-xs truncate" title={fileName}>{fileName}</span>
                      </div>
                      {!isOpeningBalance && (
                        <button 
                          type="button"
                          onClick={() => {
                            const updated = [...incomeItemsWatch[idx].detail.files]
                            const removed = updated.splice(fileIdx, 1)[0]
                            setValue(`incomeItems.${idx}.detail.files`, updated, { shouldDirty: true })
                            if (typeof removed === 'string') {
                              void fetch(`/api/upload?key=${encodeURIComponent(removed)}`, { method: 'DELETE' })
                            }
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>
      )})}
      <button type="button" onClick={() => append({ id: generateId(), categoryId: '', amount: '', detail: { note: '', partyName: '', files: [] } })} className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus size={14} /> Add Income
      </button>
    </div>
  )
}
