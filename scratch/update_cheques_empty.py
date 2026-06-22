import re

file_path = "d:/AI/bindu-fashion-tracker/app/admin/cheques/ChequesClient.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Loading state
loading_state_old = """              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Clock className="animate-spin inline-block mr-2" size={20} />
                    Loading cheques...
                  </td>
                </tr>
              )"""

loading_state_new = """              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <BrandSpinner size={32} />
                      Loading cheques...
                    </div>
                  </td>
                </tr>
              )"""

# Empty state
empty_state_old = """              ) : filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle size={32} className="mb-2 opacity-20" />
                      No {filter.toLowerCase()} cheques found.
                    </div>
                  </td>
                </tr>
              )"""

empty_state_new = """              ) : filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle size={32} className="mb-4 opacity-20 text-[var(--accent)]" />
                      <h3 className="text-lg text-foreground font-semibold mb-2">No {filter.toLowerCase()} cheques require approval</h3>
                      <p className="text-sm">You're all caught up. New cheques from branch payments will appear here.</p>
                    </div>
                  </td>
                </tr>
              )"""

content = content.replace(loading_state_old, loading_state_new)
content = content.replace(empty_state_old, empty_state_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated app/admin/cheques/ChequesClient.tsx")
