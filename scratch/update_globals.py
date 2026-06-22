import re

file_path = "d:/AI/bindu-fashion-tracker/app/globals.css"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Insert the media query and universal focus at the beginning after base selectors
global_rules = """
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Universal Focus Visibility */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent);
}

/* Base button and interactive transitions */
button, a, input, select, textarea, .editable-cell, .nav-item, .card {
  transition: all 0.15s ease-in-out;
}
"""

content = content.replace("html {\n  scroll-behavior: smooth;\n}", "html {\n  scroll-behavior: smooth;\n}\n" + global_rules)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated globals.css")
