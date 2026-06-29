import base64
import re
from io import BytesIO
try:
    from PIL import Image
except ImportError:
    import sys
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    from PIL import Image

with open('lib/logo-base64.ts', 'r') as f:
    content = f.read()

m = re.search(r'data:image/webp;base64,(.*?)[\"\']', content)
if m:
    b64 = m.group(1)
    webp_data = base64.b64decode(b64)
    img = Image.open(BytesIO(webp_data))
    
    png_io = BytesIO()
    img.save(png_io, format='PNG')
    png_b64 = base64.b64encode(png_io.getvalue()).decode('utf-8')
    
    new_content = content.replace('data:image/webp;base64,' + b64, 'data:image/png;base64,' + png_b64)
    with open('lib/logo-base64.ts', 'w') as f:
        f.write(new_content)
    print('Converted to PNG base64 successfully!')
else:
    print('Could not find webp base64')
