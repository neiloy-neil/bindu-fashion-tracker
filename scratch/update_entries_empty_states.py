import re

file_path = "d:/AI/bindu-fashion-tracker/app/entries/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Loading state
content = content.replace(
    '<span style={{ color: \'var(--text-secondary)\' }}>Loading sheet…</span>',
    '<span style={{ color: \'var(--text-secondary)\' }}>Loading register data...</span>'
)

# Empty state replacement
empty_state_old = """          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ margin: '0 0 16px', fontSize: 16 }}>No entries for {MONTHS[month-1]} {year}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/import" className="btn btn-primary">Import Excel</Link>
              <Link href="/entries/new" className="btn btn-secondary">Add Entry</Link>
            </div>
          </div>"""

empty_state_new = """          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <h3 style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 600 }}>No register data submitted</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14 }}>There are no entries for {MONTHS[month-1]} {year} yet.<br />If the shop is open today, click '+ New Entry' to start the daily sheet.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/entries/new" className="btn btn-primary" style={{ minWidth: 160 }}>+ New Entry</Link>
              <Link href="/import" className="btn btn-secondary" style={{ minWidth: 160 }}>Import Excel</Link>
            </div>
          </div>"""

content = content.replace(empty_state_old, empty_state_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated app/entries/page.tsx empty states")
