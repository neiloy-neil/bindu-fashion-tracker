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
      <div role="dialog" aria-modal="true" aria-labelledby="checklist-title" className="bg-card border border-border rounded-xl shadow-2xl max-w-md max-h-[90vh] overflow-y-auto w-full p-6 animate-in slide-in-from-bottom-4">
        <h3 id="checklist-title" className="text-xl font-bold mb-4 flex items-center gap-2">
          <Lock className="text-primary" /> Final Checklist
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please confirm the following closing procedures have been completed before final submission.
        </p>
        
        <div className="space-y-4 mb-8">
          {([
            { id: 'safeLocked', label: 'Safe & registers locked' },
            { id: 'acOff', label: 'A/C and main lights turned off' },
            { id: 'shopClean', label: 'Shop floor cleaned & organized' },
            { id: 'shuttersDown', label: 'Shutters down & padlocked' },
            { id: 'cashVerified', label: 'Physical cash recounted & verified' }
          ] as const).map(item => (
            <label key={item.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-border bg-card text-primary focus:ring-primary focus:ring-offset-0"
                {...register(`eodChecklist.${item.id}`)}
              />
              <span className="text-sm select-none">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            type="button" 
            className="btn btn-secondary flex-1" 
            onClick={() => setShowChecklistModal(false)}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary flex-1" 
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
