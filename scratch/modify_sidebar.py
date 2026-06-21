import re

with open('components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

nav_item_addition = """  {
    href: '/transfers/incoming',
    label: 'Incoming Transfers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
"""
content = content.replace("  {\n    href: '/requests',", nav_item_addition + "  {\n    href: '/requests',")

# Add state for pending transfers
state_addition = """  const [role, setRole] = useState<'ADMIN' | 'BRANCH' | null>(null)
  const [isLightMode, setIsLightMode] = useState(false)
  const [pendingTransfers, setPendingTransfers] = useState(0)"""

content = content.replace("  const [role, setRole] = useState<'ADMIN' | 'BRANCH' | null>(null)\n  const [isLightMode, setIsLightMode] = useState(false)", state_addition)

# Fetch pending transfers
fetch_addition = """    // Check role
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) setRole(session.user.role)
      })

    // Fetch pending transfers
    fetch('/api/transfers/pending-count')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.count === 'number') setPendingTransfers(data.count)
      })
      .catch(console.error)"""

content = content.replace("""    // Check role
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) setRole(session.user.role)
      })""", fetch_addition)

# Add badge in render
render_addition = """            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen?.(false)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ position: 'relative' }}
            >
              {item.icon}
              {item.label}
              {item.href === '/transfers/incoming' && pendingTransfers > 0 && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                }}>
                  {pendingTransfers}
                </span>
              )}
            </Link>"""

content = re.sub(r'<Link.*?key=\{item\.href\}.*?</Link>', render_addition, content, flags=re.DOTALL)

with open('components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
