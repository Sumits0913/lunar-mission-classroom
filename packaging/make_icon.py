# -*- coding: utf-8 -*-
"""生成 exe 用的应用图标：深空 + 地球 + 月球 + 地月转移轨道。"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

SS = 4          # 超采样倍数
SIZE = 256      # 基准尺寸
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "icon.ico")
S = SIZE * SS


def rounded_mask(size, radius_ratio=0.22):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    return m


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (1, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        px[0, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img.resize((size, size), Image.NEAREST)


def main():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 1) 圆角方形深空背景
    grad = vertical_gradient(S, (18, 38, 78), (4, 8, 22)).convert("RGBA")
    img.paste(grad, (0, 0), rounded_mask(S))

    # 2) 星点
    rnd = random.Random(2030)
    star_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(star_layer)
    for _ in range(150):
        x, y = rnd.randint(0, S - 1), rnd.randint(0, S - 1)
        r = rnd.choice([1, 1, 1, 2, 2, 3]) * SS / 2
        a = rnd.randint(70, 210)
        sd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    img.alpha_composite(star_layer)

    # 3) 地球（左下）
    ecx, ecy, er = int(S * 0.26), int(S * 0.70), int(S * 0.145)
    d.ellipse([ecx - er, ecy - er, ecx + er, ecy + er], fill=(38, 112, 214))
    land = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(land)
    for cx, cy, rr in [(0.22, 0.65, 0.045), (0.30, 0.73, 0.038), (0.24, 0.78, 0.030), (0.32, 0.66, 0.022)]:
        ld.ellipse([(cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S], fill=(76, 168, 110, 235))
    img.alpha_composite(land)

    # 4) 月球（右上）
    mcx, mcy, mr = int(S * 0.72), int(S * 0.30), int(S * 0.175)
    moon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    md = ImageDraw.Draw(moon)
    md.ellipse([mcx - mr, mcy - mr, mcx + mr, mcy + mr], fill=(222, 226, 233, 255))
    # 环形山
    craters = [(0.66, 0.24, 0.040), (0.79, 0.32, 0.032), (0.71, 0.38, 0.024),
               (0.62, 0.34, 0.020), (0.80, 0.22, 0.018), (0.75, 0.42, 0.015)]
    for cx, cy, rr in craters:
        md.ellipse([(cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S], fill=(168, 176, 189, 255))
    img.alpha_composite(moon)

    # 5) 地月转移轨道：虚线弧 + 箭头
    arc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arc)
    path = []
    steps = 420
    for i in range(steps + 1):
        t = i / steps
        # 二次贝塞尔：地球 -> 控制点 -> 月球
        x = (1 - t) ** 2 * (S * 0.33) + 2 * (1 - t) * t * (S * 0.36) + t ** 2 * (S * 0.655)
        y = (1 - t) ** 2 * (S * 0.62) + 2 * (1 - t) * t * (S * 0.30) + t ** 2 * (S * 0.355)
        path.append((x, y))
    dash, gap = 26, 18
    i = 0
    while i < len(path) - 1:
        seg = path[i:min(i + dash, len(path))]
        if len(seg) > 1:
            ad.line(seg, fill=(255, 205, 106, 235), width=int(S * 0.012), joint="curve")
        i += dash + gap
    # 箭头
    ax, ay = path[-1]
    px, py = path[-40]
    ang = math.atan2(ay - py, ax - px)
    alen = S * 0.055
    for sign in (1, -1):
        a2 = ang + math.pi + sign * 0.42
        ad.polygon([(ax, ay),
                    (ax + math.cos(a2) * alen, ay + math.sin(a2) * alen),
                    (ax + math.cos(a2 + 0.5) * alen * 0.45, ay + math.sin(a2 + 0.5) * alen * 0.45)],
                   fill=(255, 205, 106, 245))
    img.alpha_composite(arc)

    # 6) 缩回基准尺寸并裁圆角
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    img.putalpha(rounded_mask(SIZE))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, format="ICO",
             sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    img.save(os.path.join(os.path.dirname(OUT), "icon.png"))
    print("icon ok:", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
