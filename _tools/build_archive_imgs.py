# 아카이브 사진 변환
import os
import fitz
from PIL import Image, ImageOps

TMP = os.environ['TEMP']
DST = r'C:\Users\이건희\kfesta\assets\img\archive'
os.makedirs(DST, exist_ok=True)

def save(im, name, maxe=1400, q=80):
    im = im.convert('RGB')
    w, h = im.size
    s = min(1.0, maxe / max(w, h))
    if s < 1.0:
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    p = os.path.join(DST, name)
    im.save(p, 'WEBP', quality=q, method=6)
    print(name, im.size, os.path.getsize(p) // 1024, 'KB')

# 2023 (docx 추출본)
for src, name in [('03', '2023-booth.webp'), ('11', '2023-meeting.webp'), ('07', '2023-open.webp')]:
    save(Image.open(os.path.join(TMP, 'arc23', src + '.png')), name)

# 2024 (pdf 추출본 + 원본 사진)
save(Image.open(os.path.join(TMP, 'arc24', '44.png')), '2024-wide.webp')
save(Image.open(os.path.join(TMP, 'arc24', '14.png')), '2024-crowd.webp')
save(ImageOps.exif_transpose(Image.open(r'C:\Users\이건희\Downloads\IMG_4010.jpg')), '2024-live.webp', 1400, 76)

# 2025 백드롭 (공식 비주얼)
doc = fitz.open(r'C:\Users\이건희\Desktop\기타\백드롭\2025침장_백드롭_4340x2280_0.pdf')
pix = doc[0].get_pixmap(dpi=18)
tmp = os.path.join(TMP, 'bd25.png')
pix.save(tmp)
save(Image.open(tmp), '2025-backdrop.webp', 1600, 82)
