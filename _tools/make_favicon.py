# KFESTA 로고의 K 심볼 → 파비콘 세트
import os
from PIL import Image, ImageChops

SRC = r'C:\Users\이건희\kfesta\assets\img\b85af70e2ee60.webp'
ROOT = r'C:\Users\이건희\kfesta'
NAVY = (29, 32, 136)

# ⚠️ 투명 webp를 바로 RGB로 바꾸면 투명부가 검정이 되어 마스크가 전부 채워진다 — 흰 바탕에 먼저 합성
raw = Image.open(SRC).convert('RGBA')
im = Image.new('RGB', raw.size, (255, 255, 255))
im.paste(raw, mask=raw.split()[3])
print('logo', im.size)

# K 심볼만: 좌측 글리프 (전체 폭의 ~15%) 크롭 후 트림
w, h = im.size
k = im.crop((0, 0, int(w * 0.16), h))
bbox = ImageChops.difference(k, Image.new('RGB', k.size, (255, 255, 255))).getbbox()
k = k.crop(bbox)
print('K glyph', k.size)

# 네이비 픽셀 → 흰색 마스크. 이진 임계 대신 연속 램프로 안티앨리어싱 보존
mask = k.convert('L').point(lambda v: max(0, min(255, int((200 - v) * 2.2))))
# 작은 원본(72px)을 키울 때 부드럽게: 4배 확대 후 사용
mask = mask.resize((mask.width * 4, mask.height * 4), Image.LANCZOS)

def make_icon(size):
    canvas = Image.new('RGB', (size, size), NAVY)
    # K를 캔버스의 62% 높이로 배치
    target = int(size * 0.62)
    scale = target / max(mask.size)
    kw, kh = max(1, round(mask.width * scale)), max(1, round(mask.height * scale))
    m = mask.resize((kw, kh), Image.LANCZOS)
    white = Image.new('RGB', (kw, kh), (255, 255, 255))
    canvas.paste(white, ((size - kw) // 2, (size - kh) // 2), m)
    return canvas

# ICO (16/32/48) + PNG들
ico = make_icon(48)
ico.save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
make_icon(180).save(os.path.join(ROOT, 'apple-touch-icon.png'))
make_icon(192).save(os.path.join(ROOT, 'icon-192.png'))
make_icon(512).save(os.path.join(ROOT, 'icon-512.png'))
for f in ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']:
    print(f, os.path.getsize(os.path.join(ROOT, f)) // 1024, 'KB')
