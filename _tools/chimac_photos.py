# 치맥페 매장 사진 일괄 변환 + 컨택트시트
import os
from PIL import Image, ImageOps, ImageDraw

SRC = r'C:\Users\이건희\Desktop\기타\치맥페 사진\행사 매장 구성 사진'
DST = r'C:\Users\이건희\kfesta\assets\img\chimac'

files = []
for root, _, fns in os.walk(SRC):
    for fn in sorted(fns):
        if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
            files.append(os.path.join(root, fn))
print('원본', len(files), '장')

names = []
for i, f in enumerate(files):
    im = Image.open(f)
    im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    s = min(1.0, 1280 / max(w, h))
    if s < 1.0:
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    label = os.path.basename(os.path.dirname(f)).replace('치바고_', 'cvg-')
    name = 'site-{:02d}-{}.webp'.format(i + 1, label)
    im.save(os.path.join(DST, name), 'WEBP', quality=76, method=6)
    names.append(name)

TH = 220
cols = 6
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * TH, rows * (TH + 22)), (24, 24, 24))
d = ImageDraw.Draw(sheet)
for i, name in enumerate(names):
    im = Image.open(os.path.join(DST, name))
    im.thumbnail((TH, TH))
    x = (i % cols) * TH
    y = (i // cols) * (TH + 22)
    sheet.paste(im, (x + (TH - im.width) // 2, y))
    d.text((x + 4, y + TH + 4), '{:02d} {}'.format(i + 1, name[8:26]), fill=(255, 255, 255))

sp = os.path.join(os.environ['TEMP'], 'chimac-sheet.png')
sheet.save(sp)
print('sheet:', sp)
print('총 용량', sum(os.path.getsize(os.path.join(DST, n)) // 1024 for n in names), 'KB')
