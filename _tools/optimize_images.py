# 아임웹 미러의 콘텐츠 이미지를 WebP로 최적화해 새 사이트로 옮긴다.
# python _tools/optimize_images.py
import os, sys, json
from PIL import Image

SRC = r"C:\Users\이건희\kfesta-mirror\assets\cdn.imweb.me"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")

MAX_EDGE = 1920
QUALITY = 82
EXTS = (".png", ".jpg", ".jpeg", ".gif", ".webp")

def main():
    os.makedirs(DST, exist_ok=True)
    rows, before, after = [], 0, 0

    for root, _, files in os.walk(SRC):
        for fn in files:
            if not fn.lower().endswith(EXTS):
                continue
            src = os.path.join(root, fn)
            sz = os.path.getsize(src)
            try:
                im = Image.open(src)
            except Exception as e:
                print("  SKIP", fn, e)
                continue

            animated = getattr(im, "n_frames", 1) > 1
            w, h = im.size
            # 원본 해상도가 표시 크기보다 과하게 큰 경우만 축소
            scale = min(1.0, MAX_EDGE / max(w, h))
            nw, nh = (round(w * scale), round(h * scale))

            stem = os.path.splitext(fn)[0]
            out = os.path.join(DST, stem + ".webp")

            if animated:
                # 애니메이션 GIF는 프레임 유지
                im.save(out, "WEBP", save_all=True, quality=QUALITY, method=6)
            else:
                im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
                if scale < 1.0:
                    im = im.resize((nw, nh), Image.LANCZOS)
                im.save(out, "WEBP", quality=QUALITY, method=6)

            nsz = os.path.getsize(out)
            before += sz
            after += nsz
            rows.append({
                "src": os.path.relpath(src, SRC).replace("\\", "/"),
                "out": stem + ".webp",
                "wh": [w, h], "new_wh": [nw, nh],
                "kb": round(sz / 1024), "new_kb": round(nsz / 1024),
            })

    rows.sort(key=lambda r: -r["kb"])
    with open(os.path.join(DST, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    print(f"이미지 {len(rows)}장")
    print(f"  {before/1048576:.1f}MB  ->  {after/1048576:.1f}MB  ({100 - after*100/before:.1f}% 감축)")
    print("\n상위 10장:")
    for r in rows[:10]:
        print(f"  {r['kb']:>6}KB -> {r['new_kb']:>5}KB  {r['wh'][0]}x{r['wh'][1]}"
              f"{'' if r['wh']==r['new_wh'] else ' -> %dx%d' % tuple(r['new_wh'])}  {r['out']}")

if __name__ == "__main__":
    main()
