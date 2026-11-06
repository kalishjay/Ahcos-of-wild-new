import os
import re
import subprocess
import markdown

md_path = r"D:\EchosOfWild-main\SE4061_Assignment_1_Comprehensive_Project_Dossier.md"
html_path = r"D:\EchosOfWild-main\temp_dossier.html"
pdf_out_proj = r"D:\EchosOfWild-main\SE4061_Assignment_1_Comprehensive_Project_Dossier.pdf"
pdf_out_dl = r"C:\Users\kalis\Downloads\SE4061_Assignment_1_Comprehensive_Project_Dossier.pdf"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with open(md_path, "r", encoding="utf-8") as f:
    raw_md = f.read()

# Replace KaTeX / math delimiters with clean plain text or styled spans for printing
raw_md = re.sub(r'\\le', '≤', raw_md)
raw_md = re.sub(r'\\ge', '≥', raw_md)
raw_md = re.sub(r'\\times', '×', raw_md)
raw_md = re.sub(r'\\pm', '±', raw_md)
raw_md = re.sub(r'\\theta', 'θ', raw_md)
raw_md = re.sub(r'\\text\{([^}]+)\}', r'\1', raw_md)
raw_md = re.sub(r'\$([^$]+)\$', r'<span class="math">\1</span>', raw_md)

# Convert markdown to HTML
html_content = markdown.markdown(raw_md, extensions=['tables', 'fenced_code', 'toc'])

# Replace mermaid code blocks with <div class="mermaid">
html_content = re.sub(r'<pre><code class="language-mermaid">([\s\S]*?)</code></pre>', r'<div class="mermaid">\1</div>', html_content)

# Page-break styling for major H2 tags
html_content = re.sub(r'<h2>([0-9]+\.[^<]+)</h2>', r'<h2 class="section-break">\1</h2>', html_content)

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SLIIT SE4061 Assignment 1 - Comprehensive Project Dossier</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({{ startOnLoad: true, theme: 'neutral' }});
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  @page {{
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-right {{
      content: counter(page);
    }}
  }}

  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.6;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }}

  .header-cover {{
    border-bottom: 3px solid #0F2C59;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }}

  h1 {{
    font-size: 20pt;
    color: #0F2C59;
    margin: 6px 0 10px 0;
    font-weight: 800;
    letter-spacing: -0.5px;
  }}

  h2 {{
    font-size: 14pt;
    color: #1e3a8a;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 24px;
    margin-bottom: 10px;
    font-weight: 700;
  }}

  h2.section-break {{
    page-break-before: always;
    margin-top: 0;
    padding-top: 10px;
  }}

  h3 {{
    font-size: 11.5pt;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 6px;
    font-weight: 600;
  }}

  p, li {{
    color: #334155;
  }}

  strong {{
    color: #0f172a;
    font-weight: 600;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }}

  th, td {{
    border: 1px solid #cbd5e1;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }}

  th {{
    background-color: #0F2C59;
    color: #ffffff;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.5px;
  }}

  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}

  code {{
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    background-color: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 8.5pt;
    color: #0f172a;
  }}

  pre {{
    background-color: #0f172a;
    color: #e2e8f0;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}

  pre code {{
    background-color: transparent;
    color: #e2e8f0;
    padding: 0;
  }}

  blockquote {{
    border-left: 4px solid #D4AF37;
    background-color: #fefce8;
    margin: 14px 0;
    padding: 10px 16px;
    font-style: italic;
    color: #713f12;
    page-break-inside: avoid;
  }}

  .mermaid {{
    display: flex;
    justify-content: center;
    margin: 18px 0;
    background: #f8fafc;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    page-break-inside: avoid;
  }}

  .math {{
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-weight: 600;
    color: #0284c7;
  }}

  hr {{
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 20px 0;
  }}

  .badge {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
  }}
</style>
</head>
<body>
{html_content}
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

print("HTML written successfully. Now generating PDF via Chrome...")

chrome_cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=6000",
    "--print-to-pdf-no-header",
    f"--print-to-pdf={pdf_out_proj}",
    f"file:///{html_path.replace(os.sep, '/')}"
]

res = subprocess.run(chrome_cmd, capture_output=True, text=True)
print("Chrome execution finished with return code:", res.returncode)

if os.path.exists(pdf_out_proj):
    import shutil
    shutil.copyfile(pdf_out_proj, pdf_out_dl)
    size_mb = os.path.getsize(pdf_out_proj) / (1024 * 1024)
    print(f"PDF Successfully generated! Size: {size_mb:.2f} MB")
    print(f"Saved to {pdf_out_proj} and {pdf_out_dl}")
else:
    print("PDF generation failed.")
