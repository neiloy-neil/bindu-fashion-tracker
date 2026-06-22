import re

def update_pdf_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Change "Bindu Fashion" to "Bindu Premium"
    content = content.replace('Bindu Fashion -', 'Bindu Premium -')

    # Change headStyles fillColor
    content = content.replace('fillColor: [30, 45, 69]', 'fillColor: [42, 53, 110]')

    # Add doc.setTextColor and doc.setFont around the title
    if "doc.setFontSize(20)" in content:
        content = content.replace('doc.setFontSize(20)', "doc.setFont('times', 'bold')\n    doc.setTextColor(42, 53, 110)\n    doc.setFontSize(20)")
        content = content.replace('doc.setFontSize(12)', "doc.setFont('helvetica', 'normal')\n    doc.setTextColor(0, 0, 0)\n    doc.setFontSize(12)")

    if "doc.setFontSize(18)" in content:
        content = content.replace('doc.setFontSize(18)', "doc.setFont('times', 'bold')\n  doc.setTextColor(42, 53, 110)\n  doc.setFontSize(18)")
        content = content.replace('doc.setFontSize(12)', "doc.setFont('helvetica', 'normal')\n  doc.setTextColor(0, 0, 0)\n  doc.setFontSize(12)")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

update_pdf_file("d:/AI/bindu-fashion-tracker/lib/exportPdf.ts")
update_pdf_file("d:/AI/bindu-fashion-tracker/components/dashboard/PdfGenerator.tsx")

print("Updated PDF scripts")
