import re

filepath = "d:/AI/bindu-fashion-tracker/app/globals.css"

with open(filepath, "r", encoding="utf-8") as f:
    css = f.read()

# Fix .main-content
css = css.replace(
    ".main-content {\n  flex: 1;\n  display: flex;",
    ".main-content {\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  display: flex;"
)

# Fix .sheet-table-wrapper
css = css.replace(
    """.sheet-table-wrapper {
  overflow: auto;
  max-height: calc(100vh - 200px);
  border-radius: 10px;
  border: 1px solid var(--border);
}""",
    """.sheet-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid var(--border);
}"""
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(css)

print("globals.css updated")
