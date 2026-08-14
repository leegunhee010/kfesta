# 사진 일괄 변환 + 컨택트시트 (범용)
# python _tools/photo_sheet.py <원본폴더> <출력폴더> <접두사>
import os, sys
from PIL import Image, ImageOps, ImageDraw

SRC, DST, PFX = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(DST, exist_ok=True)

files = [os.path.join(SRC, f) for f in sorted(os.listdir(SRC))
         if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
print('원본', len(files), '장')

names = []
for i, f in enumerate(files):
    im = Image.open(f)
    im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    s = min(1.0, 1280 / max(w, h))
    if s < 1.0:
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    name = '{}-{:02d}.webp'.format(PFX, i + 1)
    im.save(os.path.join(DST, name), 'WEBP', quality=76, method=6)
    names.append(name)

TH = 200
cols = 7
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * TH, rows * (TH + 20)), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, name in enumerate(names):
    im = Image.open(os.path.join(DST, name))
    im.thumbnail((TH, TH))
    x = (i % cols) * TH
    y = (i // cols) * (TH + 20)
    sheet.paste(im, (x + (TH - im.width) // 2, y))
    d.text((x + 4, y + TH + 3), '{:02d}'.format(i + 1), fill=(255, 255, 255))

sp = os.path.join(os.environ['TEMP'], PFX + '-sheet.png')
sheet.save(sp)
print('sheet:', sp)
print('총', sum(os.path.getsize(os.path.join(DST, n)) // 1024 for n in names), 'KB')
