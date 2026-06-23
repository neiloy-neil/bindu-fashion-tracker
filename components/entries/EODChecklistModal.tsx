import { UseFormRegister, useWatch, Control } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { NewEntryFormValues } from '@/lib/schemas'

interface Props {
  control: Control<NewEntryFormValues>
  register: UseFormRegister<NewEntryFormValues>
  setShowChecklistModal: (val: boolean) => void
  onSubmitFinal: () => void
}

export function EODChecklistModal({ control, register, setShowChecklistModal, onSubmitFinal }: Props) {
  useWatch({ control, name: 'eodChecklist' })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="checklist-title" className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl max-w-md max-h-[90dvh] w-full animate-in slide-in-from-bottom-4 relative overflow-hidden flex flex-col">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none z-0">
          <img src="/bindu-logo.webp" alt="" className="w-64 h-64 object-contain" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-6 pb-0 shrink-0">
        <h3 id="checklist-title" className="text-xl font-bold mb-4 flex items-center gap-2">
          <Lock className="text-[var(--accent)]" /> Final Checklist
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please confirm the following closing procedures have been completed before final submission.
        </p>
        
        </div>
          <div className="space-y-4 p-6 overflow-y-auto flex-1 min-h-0">
          {([
            { id: 'safeLocked', label: 'Safe & registers locked' },
            { id: 'acOff', label: 'A/C and main lights turned off' },
            { id: 'shopClean', label: 'Shop floor cleaned & organized' },
            { id: 'shuttersDown', label: 'Shutters down & padlocked' },
            { id: 'cashVerified', label: 'Physical cash recounted & verified' }
          ] as const).map(item => (
            <label key={item.id} className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] transition-colors">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
                {...register(`eodChecklist.${item.id}`)}
              />
              <span className="text-sm select-none">{item.label}</span>
            </label>
          ))}
        </div>

        </div>
        <div className="flex gap-3 p-6 pt-0 shrink-0">
          <button 
            type="button" 
            className="btn btn-secondary flex-1 py-4" 
            onClick={() => setShowChecklistModal(false)}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="flex-1 py-4 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold rounded-lg shadow-lg shadow-[var(--accent-glow)] transition-all flex justify-center items-center" 
            onClick={() => {
              setShowChecklistModal(false)
              onSubmitFinal()
            }}
          >
            Close Register
          </button>
        </div>
      </div>
    </div>
  )
}
