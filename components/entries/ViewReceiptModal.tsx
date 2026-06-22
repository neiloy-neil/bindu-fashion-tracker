'use client'

import { X } from 'lucide-react'

export function ViewReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-card rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-semibold">Attached Receipt</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-black/5 p-4 flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <iframe 
              src={url} 
              className="w-full h-[70vh] rounded"
              title="Receipt PDF"
            />
          ) : (
            <img 
              src={url} 
              alt="Receipt" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </div>
      </div>
    </div>
  )
}
