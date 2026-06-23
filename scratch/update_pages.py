import re
import os

files_to_process = [
    "d:/AI/bindu-fashion-tracker/app/entries/page.tsx",
    "d:/AI/bindu-fashion-tracker/app/hr/salary/page.tsx",
    "d:/AI/bindu-fashion-tracker/app/hr/eid/page.tsx",
]

for filepath in files_to_process:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "entries/page.tsx" in filepath:
        content = content.replace(
            '<div className="page-body" style={{ padding: \'16px 20px\' }}>',
            '<div className="page-body flex-1 min-h-0 flex flex-col" style={{ padding: \'16px 20px\' }}>'
        )
    elif "hr/salary/page.tsx" in filepath:
        # It's wrapped in `<div className="max-w-7xl mx-auto">`.
        # We need the root to be `flex flex-col h-full`.
        content = content.replace(
            '<div className="max-w-7xl mx-auto">',
            '<div className="max-w-7xl mx-auto flex flex-col h-full">'
        )
        # And the table container is `<div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">`
        content = content.replace(
            '<div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">',
            '<div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4 flex-1 min-h-0 flex flex-col">'
        )
        # And the inner table wrapper `<div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>`
        content = content.replace(
            '<div className="overflow-x-auto" style={{ maxHeight: \'70vh\' }}>',
            '<div className="overflow-auto flex-1 min-h-0">'
        )

    elif "hr/eid/page.tsx" in filepath:
        content = content.replace(
            '<div className="max-w-7xl mx-auto">',
            '<div className="max-w-7xl mx-auto flex flex-col h-full">'
        )
        content = content.replace(
            '<div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">',
            '<div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4 flex-1 min-h-0 flex flex-col">'
        )
        content = content.replace(
            '<div className="overflow-x-auto" style={{ maxHeight: \'70vh\' }}>',
            '<div className="overflow-auto flex-1 min-h-0">'
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Pages updated")
