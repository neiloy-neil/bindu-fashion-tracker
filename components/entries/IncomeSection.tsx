import { useFieldArray, Control, UseFormRegister, useWatch, UseFormSetValue, FieldErrors, Controller } from 'react-hook-form'
import { Plus, X, Paperclip } from 'lucide-react'
import { Category } from '@/lib/types'
import { useState } from 'react'
import { NewEntryFormValues } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
        <div key={field.id} className="relative mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group">
          {!isOpeningBalance && (
            <Button type="button" size="icon" aria-label="Remove income" onClick={() => remove(idx)} className="absolute -right-2 -top-2 z-10 h-7 w-7 rounded-full bg-destructive text-destructive-foreground">
              <X size={14} />
            </Button>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <Controller
                control={control}
                name={`incomeItems.${idx}.categoryId` as const}
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange} disabled={isOpeningBalance}>
                    <SelectTrigger className={`h-10 w-full text-sm ${isOpeningBalance ? 'opacity-70 pointer-events-none' : ''}`}>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.type === 'INCOME' && (c.name !== 'Opening Balance' || String(c.id) === String(currentCategoryId)))
                        .map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.incomeItems?.[idx]?.categoryId?.message && <span className="text-xs text-destructive mt-1 block">{errors.incomeItems[idx].categoryId.message}</span>}
            </div>
            <div className="sm:col-span-3">
              <Input 
                type="number"
                className={`h-10 w-full text-right tabular-nums font-mono ${isOpeningBalance ? 'opacity-70 pointer-events-none' : ''}`} 
                readOnly={isOpeningBalance}
                placeholder="Amount" 
                {...register(`incomeItems.${idx}.amount` as const)} 
              />
              {errors.incomeItems?.[idx]?.amount?.message && <span className="text-xs text-destructive mt-1 block">{errors.incomeItems[idx].amount.message}</span>}
            </div>
            <div className="sm:col-span-5">
              <Input type="text" className="h-10 w-full text-sm" placeholder="Note" {...register(`incomeItems.${idx}.detail.note` as const)} />
            </div>
            
            {/* Supabase URL File Upload */}
            <div className="sm:col-span-12 mt-2">
              <Label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Receipt / Invoice
                {uploadingAttachment[idx] && <span className="text-primary animate-pulse">Uploading...</span>}
              </Label>
              
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
                    <div key={fileIdx} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={14} className="shrink-0 text-primary" />
                        <span className="text-xs truncate" title={fileName}>{fileName}</span>
                      </div>
                      {!isOpeningBalance && (
                        <Button 
                          type="button"
                          onClick={() => {
                            const updated = [...incomeItemsWatch[idx].detail.files]
                            const removed = updated.splice(fileIdx, 1)[0]
                            setValue(`incomeItems.${idx}.detail.files`, updated, { shouldDirty: true })
                            if (typeof removed === 'string') {
                              void fetch(`/api/upload?key=${encodeURIComponent(removed)}`, { method: 'DELETE' })
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>
      )})}
      <Button type="button" variant="ghost" size="sm" onClick={() => append({ id: generateId(), categoryId: '', amount: '', detail: { note: '', partyName: '', files: [] } })} className="h-auto gap-1 px-0 text-xs text-primary hover:text-primary">
        <Plus size={14} /> Add Income
      </Button>
    </div>
  )
}
