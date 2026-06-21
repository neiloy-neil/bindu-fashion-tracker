import re

with open('app/entries/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace button texts
content = content.replace("{loading ? <span className=\"spinner\" /> : 'Submit EOD Report'}", "{loading ? <span className=\"spinner\" /> : 'Close Register'}")
content = content.replace("Confirm & Submit", "Close Register")

# Inject auto report logic
old_success = '''      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to submit')
      }
      
      localStorage.removeItem('newEntryDraftRHF')
      toast.success('Entry submitted successfully!', { id: uploadToast })
      router.push('/entries')'''

new_success = '''      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to submit')
      }
      
      localStorage.removeItem('newEntryDraftRHF')
      
      // Auto-download Daily Report PDF
      try {
        const dateStr = payload.date.toISOString().split('T')[0]
        const branchName = branches.find(b => b.id === payload.branchId)?.name || 'Branch'
        const reportRes = await fetch(`/api/reports/daily?branchId=${payload.branchId}&date=${dateStr}`)
        if (!reportRes.ok) throw new Error('Failed to fetch report')
        const reportData = await reportRes.json()
        
        const { exportReportAsPdf } = await import('@/lib/exportPdf')
        await exportReportAsPdf(reportData, branchName, dateStr)
        
        toast.success('Register closed — daily report downloaded.', { id: uploadToast })
      } catch (reportErr) {
        toast.error('Register closed and saved successfully. Report download failed — you can re-download it from the Daily Report page.', { id: uploadToast, duration: 8000 })
      }

      router.push('/entries')'''

content = content.replace(old_success, new_success)

with open('app/entries/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
