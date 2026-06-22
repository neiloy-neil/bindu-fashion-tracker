import os
import re

files_to_update = [
    "app/requests/page.tsx",
    "app/page.tsx",
    "app/import/page.tsx",
    "app/entries/page.tsx",
    "app/categories/page.tsx",
    "app/branches/page.tsx",
    "app/admin/settings/page.tsx",
    "app/admin/requests/page.tsx",
    "app/admin/page.tsx",
    "app/admin/cheques/ChequesClient.tsx",
    "app/admin/audit-logs/page.tsx",
    "components/entries/NewEntryForm.tsx",
    "components/dashboard/RecentActivity.tsx"
]

for file_path in files_to_update:
    full_path = os.path.join("d:/AI/bindu-fashion-tracker", file_path)
    if not os.path.exists(full_path):
        continue
        
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    # We need to add the import statement if we are replacing a spinner
    if "spinner" in content and "BrandSpinner" not in content:
        # Import line
        import_stmt = "import { BrandSpinner } from '@/components/ui/BrandSpinner'\n"
        
        # Insert import after the last import
        last_import_match = list(re.finditer(r"^import .*\n", content, re.MULTILINE))
        if last_import_match:
            insert_pos = last_import_match[-1].end()
            content = content[:insert_pos] + import_stmt + content[insert_pos:]
        else:
            content = import_stmt + content
            
        # Replace simple spinners
        content = re.sub(r'<div className="spinner" />', '<BrandSpinner />', content)
        content = re.sub(r'<div className="spinner"></div>', '<BrandSpinner />', content)
        content = re.sub(r'<span className="spinner" />', '<BrandSpinner size={16} />', content)
        
        # Replace spinners with custom styles
        content = re.sub(
            r'<div className="spinner" style={{[^}]*}} />', 
            '<BrandSpinner size={16} />', 
            content
        )
        content = re.sub(
            r'<span className="spinner[^"]*" />', 
            '<BrandSpinner size={16} />', 
            content
        )

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

print("Replacement complete.")
