# 2023 docx + 2024 pdf에서 행사 사진 추출 → 컨택트시트
import os, zipfile, io
import fitz
from PIL import Image, ImageDraw

TMP = os.environ['TEMP']

def sheet(images, name, cols=7, th=200):
    rows = (len(images) + cols - 1) // cols
    s = Image.new('RGB', (cols * th, rows * (th + 20)), (24, 24, 24))
    d = ImageDraw.Draw(s)
    for i, im in enumerate(images):
        t = im.copy(); t.thumbnail((th, th))
        x, y = (i % cols) * th, (i // cols) * (th + 20)
        s.paste(t, (x + (th - t.width) // 2, y))
        d.text((x + 4, y + th + 3), '{:02d} {}x{}'.format(i + 1, im.width, im.height), fill=(255, 255, 255))
    p = os.path.join(TMP, name)
    s.save(p)
    print('sheet:', p, '({}장)'.format(len(images)))

# 2023 docx 미디어
docx = r'C:\Users\이건희\Downloads\2023년 글로컬 대구침장 특화산업 육성사업_수출상담회 결과보고서_최종.docx'
imgs23 = []
with zipfile.ZipFile(docx) as z:
    for n in sorted(z.namelist()):
        if n.startswith('word/media/') and n.lower().endswith(('.png', '.jpg', '.jpeg')):
            try:
                im = Image.open(io.BytesIO(z.read(n))).convert('RGB')
                if im.width >= 500 and im.height >= 400:  # 아이콘·로고 제외
                    im.info['src'] = n
                    imgs23.append(im)
            except Exception:
                pass
print('2023 docx 후보', len(imgs23))
os.makedirs(os.path.join(TMP, 'arc23'), exist_ok=True)
for i, im in enumerate(imgs23):
    im.save(os.path.join(TMP, 'arc23', '{:02d}.png'.format(i + 1)))
if imgs23: sheet(imgs23, 'arc23-sheet.png')

# 2024 pdf 임베디드 이미지
pdf = r'C:\Users\이건희\Downloads\2024년 글로컬 대구침장 특화산업 육성사업_수출상담회 결과보고서.pdf'
doc = fitz.open(pdf)
seen = set()
imgs24 = []
for pno in range(len(doc)):
    for xref, *_ in doc[pno].get_images(full=True):
        if xref in seen: continue
        seen.add(xref)
        try:
            d = doc.extract_image(xref)
            im = Image.open(io.BytesIO(d['image'])).convert('RGB')
            if im.width >= 600 and im.height >= 450:
                imgs24.append(im)
        except Exception:
            pass
    if len(imgs24) >= 60: break
print('2024 pdf 후보', len(imgs24))
os.makedirs(os.path.join(TMP, 'arc24'), exist_ok=True)
for i, im in enumerate(imgs24):
    im.save(os.path.join(TMP, 'arc24', '{:02d}.png'.format(i + 1)))
if imgs24: sheet(imgs24, 'arc24-sheet.png')
