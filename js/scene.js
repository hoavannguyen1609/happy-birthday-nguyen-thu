/* =====================================================================
 *  Đồ hoạ vẽ bằng HTML5 Canvas 2D (không dùng SVG, không dùng ảnh ngoài)
 *  - #scene-canvas : nữ tu & nữ đệ tử quỳ cầu nguyện dưới chân Đức Mẹ Mân Côi
 *  - #hero-rosary  : chuỗi hạt thạch anh trắng tóc đỏ & Thánh Giá pha lê
 *  - favicon       : Thánh Giá vàng nhỏ
 * ===================================================================== */
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  let SCALE = 1; // tỉ lệ điểm ảnh của lớp đang vẽ (shadowBlur không theo phép biến đổi)

  /* ============================ TIỆN ÍCH VẼ ============================ */

  /** Dựng đường từ danh sách lệnh: ["M",x,y] ["L",x,y] ["Q",cx,cy,x,y] ["C",c1x,c1y,c2x,c2y,x,y] ["Z"]. */
  function trace(ctx, cmds) {
    ctx.beginPath();
    cmds.forEach(([c, ...a]) => {
      if (c === "M") ctx.moveTo(a[0], a[1]);
      else if (c === "L") ctx.lineTo(a[0], a[1]);
      else if (c === "Q") ctx.quadraticCurveTo(a[0], a[1], a[2], a[3]);
      else if (c === "C") ctx.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
      else if (c === "Z") ctx.closePath();
    });
  }

  function paint(ctx, cmds, fill, stroke, lineWidth = 1) {
    trace(ctx, cmds);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
  }

  function linear(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }

  function radial(ctx, x0, y0, r0, x1, y1, r1, stops) {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }

  function ellipse(ctx, x, y, rx, ry, fill, rotation = 0, stroke = null, lineWidth = .7) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function rect(ctx, x, y, w, h, fill, r = 0) {
    ctx.beginPath();
    if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /** Nét bo tròn có viền (dùng cho ngón tay, dây, sợi tóc): vẽ viền đậm trước rồi lõi sáng. */
  function capsule(ctx, pts, width, fill, outline) {
    const run = (w, color) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineWidth = w;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };
    if (outline) run(width + 1.1, outline);
    run(width, fill);
  }

  /** Bật bóng đổ mềm cho các nét vẽ kế tiếp. */
  function softShadow(ctx, color, blur, dx, dy) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * SCALE;
    ctx.shadowOffsetX = dx * SCALE;
    ctx.shadowOffsetY = dy * SCALE;
  }

  function noShadow(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /** Hình Thánh Giá: thanh dọc rộng `bar` dài `len`, thanh ngang tại `armY` dài `span`. */
  function crossPath(ctx, cx, top, bar, len, armY, span) {
    const h = bar / 2, s = span / 2;
    trace(ctx, [
      ["M", cx - h, top], ["L", cx + h, top], ["L", cx + h, armY], ["L", cx + s, armY], ["L", cx + s, armY + bar],
      ["L", cx + h, armY + bar], ["L", cx + h, top + len], ["L", cx - h, top + len], ["L", cx - h, armY + bar],
      ["L", cx - s, armY + bar], ["L", cx - s, armY], ["L", cx - h, armY], ["Z"]
    ]);
  }

  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
      i ? ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)) : ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /** Lấy các điểm cách đều nhau dọc theo chuỗi đoạn Bézier bậc ba (để xâu hạt). */
  function pointsAlong(segments, spacing) {
    const pts = [];
    segments.forEach(([p0, p1, p2, p3]) => {
      for (let i = 0; i <= 300; i++) {
        const t = i / 300, u = 1 - t;
        pts.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        ]);
      }
    });
    return spaced(pts, spacing);
  }

  function spaced(pts, spacing) {
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc >= spacing) { out.push(pts[i]); acc = 0; }
    }
    return out;
  }

  function strokeSegments(ctx, segments, color, width) {
    ctx.beginPath();
    segments.forEach(([p0, p1, p2, p3], i) => {
      if (i === 0) ctx.moveTo(p0[0], p0[1]);
      ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  /* --------------------------- Các loại hạt --------------------------- */
  function gleam(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x - r * .38, y - r * .42, r * .26, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fill();
  }

  function beadBeryl(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = radial(ctx, x - r * .35, y - r * .4, r * .1, x, y, r, [[0, "#e3f7ff"], [.45, "#4cc3f2"], [1, "#11699a"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 80, 120, .45)";
    ctx.lineWidth = .6;
    ctx.stroke();
    gleam(ctx, x, y, r);
  }

  function beadQuartz(ctx, x, y, r, fleck) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = radial(ctx, x - r * .35, y - r * .4, r * .1, x, y, r, [[0, "#ffffff"], [.5, "#f4f7f9"], [1, "#c9d4db"]]);
    ctx.fill();
    ctx.strokeStyle = "#a9b7c0";
    ctx.lineWidth = Math.max(.45, r * .16);
    ctx.stroke();
    if (fleck) {
      ctx.beginPath();
      ctx.moveTo(x - r * .1, y + r * .5);
      ctx.lineTo(x + r * .5, y - r * .05);
      ctx.strokeStyle = "rgba(170, 30, 40, .75)";
      ctx.lineWidth = Math.max(.35, r * .14);
      ctx.stroke();
    }
    gleam(ctx, x, y, r);
  }

  function beadRed(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = radial(ctx, x - r * .35, y - r * .4, r * .1, x, y, r, [[0, "#e7838a"], [.5, "#9e1f2b"], [1, "#5a0f16"]]);
    ctx.fill();
    gleam(ctx, x, y, r);
  }

  function crystalCross(ctx, cx, top, bar, len, armY, span, lineWidth) {
    crossPath(ctx, cx, top, bar, len, armY, span);
    ctx.fillStyle = linear(ctx, cx - span / 2, top, cx + span / 2, top + len, [[0, "rgba(255,255,255,.95)"], [.45, "rgba(224,247,250,.8)"], [1, "rgba(159,220,245,.9)"]]);
    ctx.fill();
    ctx.strokeStyle = "#7fcbe9";
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - bar * .2, top + bar * .4);
    ctx.lineTo(cx - bar * .2, armY - bar * .2);
    ctx.moveTo(cx - bar * .2, armY + bar * 1.3);
    ctx.lineTo(cx - bar * .2, top + len - bar * .5);
    ctx.moveTo(cx - span / 2 + bar * .4, armY + bar * .4);
    ctx.lineTo(cx - bar * .9, armY + bar * .4);
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = lineWidth * 1.1;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  /** Đoá hồng nhỏ dưới chân Đức Mẹ. */
  function rose(ctx, x, y, r) {
    ellipse(ctx, x - r * 1.2, y + r * .4, r * .9, r * .4, "#6f9e5c", -20 * DEG);
    ellipse(ctx, x + r * 1.2, y + r * .4, r * .9, r * .4, "#6f9e5c", 20 * DEG);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - Math.PI / 2;
      ellipse(ctx, x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .62, r * .62, "#f3a6bb", 0, "#d9668a", .5);
    }
    ellipse(ctx, x, y, r * .5, r * .5, "#e77f9e");
    ctx.beginPath();
    ctx.arc(x, y, r * .28, .3, 5.2);
    ctx.strokeStyle = "#b8476c";
    ctx.lineWidth = .6;
    ctx.stroke();
  }

  /** Gắn canvas vào kích thước khung (theo devicePixelRatio), gọi lại onResize khi khung đổi cỡ. */
  function fitCanvas(canvas, W, H, onResize) {
    const apply = () => {
      const cssW = canvas.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(cssW * dpr), h = Math.round(cssW * H / W * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      onResize(w / W);
    };
    if ("ResizeObserver" in window) new ResizeObserver(apply).observe(canvas);
    else window.addEventListener("resize", apply);
    apply();
  }

  /* ======================= CẢNH ĐỨC MẸ & HAI NGƯỜI QUỲ ======================= */
  const SW = 600, SH = 760;
  const CANDLES = [130, 470]; // toạ độ x của hai cây nến
  const SKIN = "#f3d6bd", SKIN_LINE = "rgba(160, 110, 85, .55)", HAIR = "#1d1815";

  // Chuỗi của đệ tử (thạch anh trắng tóc đỏ)
  const SIS_LOOP = [[[366, 622], [348, 642], [356, 668], [376, 666]], [[376, 666], [392, 664], [386, 636], [374, 622]]];
  const SIS_PENDANT = [[[376, 666], [377, 672], [378, 678], [379, 686]]];
  const sisBeads = pointsAlong(SIS_LOOP, 6.4).slice(1, -1);
  const sisPendant = pointsAlong(SIS_PENDANT, 6.5).slice(1);

  /** Lớp nền tĩnh: tường, hốc vòm, cột, nến, sàn gỗ, bệ đá. */
  function drawBack(ctx) {
    rect(ctx, 0, 0, SW, 560, linear(ctx, 0, 0, 0, 560, [[0, "#f8ecd0"], [1, "#ecd7ae"]]));

    // hốc tường hình vòm
    ctx.beginPath();
    ctx.moveTo(160, 560); ctx.lineTo(160, 215); ctx.arc(300, 215, 140, Math.PI, 0); ctx.lineTo(440, 560); ctx.closePath();
    ctx.fillStyle = "#e3c98d";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(172, 560); ctx.lineTo(172, 218); ctx.arc(300, 218, 128, Math.PI, 0); ctx.lineTo(428, 560); ctx.closePath();
    ctx.fillStyle = radial(ctx, 300, 230, 10, 300, 260, 330, [[0, "#fffbe9"], [.45, "#fbe7b2"], [1, "#e9c983"]]);
    ctx.fill();

    // cột hai bên
    [44, 500].forEach((x) => {
      rect(ctx, x, 40, 56, 520, linear(ctx, x, 0, x + 56, 0, [[0, "#e2c99a"], [.5, "#f6e8c9"], [1, "#d9bd88"]]));
      rect(ctx, x - 8, 30, 72, 16, "#d9bd88", 3);
    });

    // hai cây nến gắn tường hai bên hốc vòm
    CANDLES.forEach((x) => {
      const gold = linear(ctx, x - 14, 300, x + 14, 370, [[0, "#fbeec0"], [.55, "#d4a537"], [1, "#a67a17"]]);
      paint(ctx, [["M", x - 4, 364], ["L", x + 4, 364], ["L", x + 1, 380], ["L", x - 1, 380], ["Z"]], gold);
      rect(ctx, x - 14, 358, 28, 6, gold, 2);
      rect(ctx, x - 8, 318, 16, 41, "#fffaf0", 2);
      ctx.strokeStyle = "#e8dcc4";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 8, 318, 16, 41);
    });

    // sàn gỗ phối cảnh
    rect(ctx, 0, 556, SW, 204, linear(ctx, 0, 556, 0, SH, [[0, "#c99a64"], [1, "#87592f"]]));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 556, SW, 204);
    ctx.clip();
    ctx.strokeStyle = "rgba(111, 72, 38, .35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 19; i++) { ctx.moveTo(300, 430); ctx.lineTo(-600 + i * 100, SH); }
    for (let i = 0; i < 18; i++) {
      const x0 = -600 + i * 100, t = [.45, .75, .6, .9][i % 4], y = 430 + (SH - 430) * t;
      if (y > 560) { ctx.moveTo(300 + (x0 - 300) * t, y); ctx.lineTo(300 + (x0 + 100 - 300) * t, y); }
    }
    ctx.stroke();
    ctx.restore();
    rect(ctx, 0, 552, SW, 8, "#a77446");

    // vệt sáng trên sàn
    ctx.save();
    ctx.translate(300, 598);
    ctx.scale(1, 46 / 230);
    ctx.beginPath();
    ctx.arc(0, 0, 230, 0, TAU);
    ctx.fillStyle = radial(ctx, 0, 0, 0, 0, 0, 230, [[0, "rgba(255,233,176,.55)"], [1, "rgba(255,233,176,0)"]]);
    ctx.fill();
    ctx.restore();

    // bệ đá
    rect(ctx, 210, 540, 180, 14, "#c9b690", 2);
    paint(ctx, [["M", 232, 482], ["L", 368, 482], ["L", 380, 540], ["L", 220, 540], ["Z"]], linear(ctx, 220, 482, 380, 540, [[0, "#f1e6d2"], [1, "#cbb995"]]));
    ctx.globalAlpha = .7;
    paint(ctx, [["M", 228, 510], ["L", 372, 510], ["M", 262, 482], ["L", 262, 510], ["M", 330, 482], ["L", 330, 510],
      ["M", 246, 510], ["L", 246, 540], ["M", 300, 510], ["L", 300, 540], ["M", 354, 510], ["L", 354, 540]], null, "#b9a37c", 1.2);
    ctx.globalAlpha = 1;
    rect(ctx, 222, 470, 156, 14, "#efe2c8", 3);
  }

  /* ------------------------------ ĐỨC MẸ MÂN CÔI BẾ CHÚA HÀI ĐỒNG ------------------------------ */
  // Tràng hạt thả từ bàn tay phải Đức Mẹ (bên trái người xem)
  const MARY_LOOP = [[[234, 314], [226, 344], [222, 374], [232, 386]], [[232, 386], [244, 374], [244, 344], [239, 314]]];
  const MARY_PENDANT = [[[232, 386], [233, 396], [234, 406], [234, 416]]];
  const maryBeads = pointsAlong(MARY_LOOP, 8.6).slice(1, -1);
  const maryPendant = pointsAlong(MARY_PENDANT, 9.5).slice(1);

  // Vạt áo choàng vắt chéo trước thân: mép trên, mép dưới (để vẽ viền vàng)
  const DRAPE_TOP = [[[352, 226], [340, 262], [318, 290], [292, 306]], [[292, 306], [274, 317], [258, 328], [248, 340]]];
  const DRAPE_BOTTOM = [[[246, 366], [268, 374], [300, 392], [318, 420]], [[318, 420], [330, 438], [336, 456], [338, 470]]];
  const DRAPE = [["M", 352, 226], ["C", 340, 262, 318, 290, 292, 306], ["C", 274, 317, 258, 328, 248, 340], ["L", 246, 366],
    ["C", 268, 374, 300, 392, 318, 420], ["C", 330, 438, 336, 456, 338, 470], ["L", 374, 470],
    ["C", 380, 400, 374, 300, 360, 236], ["Z"]];

  /** Vầng hào quang tia vàng sau đầu (giống tượng). */
  function sunburst(ctx, cx, cy, inner, long, short, count) {
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count - Math.PI / 2, len = i % 2 ? short : long, w = (TAU / count) * .36;
      paint(ctx, [["M", cx + inner * Math.cos(a - w), cy + inner * Math.sin(a - w)], ["L", cx + len * Math.cos(a), cy + len * Math.sin(a)],
        ["L", cx + inner * Math.cos(a + w), cy + inner * Math.sin(a + w)], ["Z"]],
      linear(ctx, cx, cy - long, cx, cy + long, [[0, "#fbeec0"], [.5, "#d9b24a"], [1, "#a67a17"]]), "rgba(140, 100, 20, .55)", .5);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, TAU);
    ctx.strokeStyle = "#c99a2e";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  /** Viền vàng hoa văn chạy dọc mép áo choàng. */
  function goldHem(ctx, segments) {
    strokeSegments(ctx, segments, "#d9b24a", 3.2);
    strokeSegments(ctx, segments, "#f6e2a0", 1);
    pointsAlong(segments, 7).forEach(([x, y], i) => ellipse(ctx, x, y, i % 2 ? .9 : 1.3, i % 2 ? .9 : 1.3, "#8f6a14"));
  }

  function drawMaryHead(ctx) {
    // tóc nâu sẫm ôm khuôn mặt, buông xuống vai
    paint(ctx, [["M", 282, 128], ["C", 272, 150, 270, 182, 274, 212], ["C", 278, 217, 285, 214, 285, 207], ["C", 283, 182, 285, 158, 291, 140], ["Z"]],
      linear(ctx, 270, 128, 290, 214, [[0, "#5a3a29"], [1, "#2e1c13"]]));
    paint(ctx, [["M", 310, 128], ["C", 321, 150, 323, 180, 319, 206], ["C", 315, 211, 308, 209, 308, 202], ["C", 310, 180, 308, 156, 301, 140], ["Z"]],
      linear(ctx, 302, 128, 322, 210, [[0, "#5a3a29"], [1, "#2e1c13"]]));
    paint(ctx, [["M", 276, 150], ["C", 274, 172, 275, 192, 279, 208], ["M", 316, 150], ["C", 318, 172, 317, 190, 314, 204]], null, "rgba(150, 105, 80, .55)", .6);

    // cổ
    paint(ctx, [["M", 289, 152], ["L", 289, 176], ["Q", 296, 180, 303, 176], ["L", 303, 152], ["Z"]], linear(ctx, 0, 152, 0, 178, [[0, "#e0b493"], [1, "#efcdb2"]]));

    ctx.save();
    ctx.translate(296, 160); ctx.rotate(4 * DEG); ctx.translate(-296, -160);
    // gương mặt
    paint(ctx, [["M", 296, 122], ["C", 305, 122, 310.5, 130, 310.5, 141], ["C", 310.5, 152, 304, 160, 296, 161], ["C", 288, 160, 281.5, 152, 281.5, 141],
      ["C", 281.5, 130, 287, 122, 296, 122], ["Z"]], radial(ctx, 294, 139, 3, 296, 141, 22, [[0, "#fdebdc"], [.7, "#f5d6bf"], [1, "#e6bc9c"]]), SKIN_LINE, .7);
    // tóc rẽ ngôi trên trán
    paint(ctx, [["M", 281.5, 136], ["C", 283, 122, 293, 119, 296, 124], ["C", 299, 119, 309, 122, 310.5, 136], ["C", 306, 128, 300, 127, 296, 129],
      ["C", 292, 127, 286, 128, 281.5, 136], ["Z"]], "#3d271c");
    paint(ctx, [["M", 285, 134.5], ["Q", 290, 131.8, 294.5, 134], ["M", 297.5, 134], ["Q", 302, 131.8, 307, 134.5]], null, "#5a3e30", .9);
    // mắt hiền nhìn xuống: lòng trắng, mống mắt nâu khuất dưới mí
    [[290, 141], [302, 141]].forEach(([x, y]) => {
      const eye = [["M", x - 4.4, y], ["Q", x, y - 3.2, x + 4.4, y], ["Q", x, y + 2.6, x - 4.4, y], ["Z"]];
      paint(ctx, eye, "#fbf6f1");
      ctx.save();
      trace(ctx, eye);
      ctx.clip();
      ellipse(ctx, x, y + .5, 2.4, 2.4, radial(ctx, x, y + .5, .3, x, y + .5, 2.4, [[0, "#7a5236"], [1, "#3e2617"]]));
      ellipse(ctx, x, y + .5, 1.05, 1.05, "#160c07");
      ellipse(ctx, x - .8, y - .4, .55, .55, "rgba(255,255,255,.9)");
      ctx.restore();
      paint(ctx, [["M", x - 4.6, y + .2], ["Q", x, y - 3.6, x + 4.6, y + .2]], null, "#2e1c13", 1.1);
      paint(ctx, [["M", x - 3.6, y - 2.6], ["Q", x, y - 4.6, x + 3.6, y - 2.6]], null, "rgba(150, 100, 80, .45)", .5);
    });
    // mũi, môi, má
    paint(ctx, [["M", 296.6, 141], ["Q", 295.2, 147, 295.4, 150.5]], null, "rgba(190,140,115,.7)", .85);
    paint(ctx, [["M", 293.2, 151], ["Q", 296, 152.8, 298.8, 151]], null, "rgba(180,125,100,.75)", .75);
    paint(ctx, [["M", 292.2, 155.3], ["Q", 294.4, 153.9, 296, 154.7], ["Q", 297.6, 153.9, 299.8, 155.3], ["Q", 296, 156.2, 292.2, 155.3], ["Z"]], "#c06f6d");
    paint(ctx, [["M", 292.8, 155.5], ["Q", 296, 158.8, 299.2, 155.5], ["Q", 296, 156.6, 292.8, 155.5], ["Z"]], "#da918b");
    ellipse(ctx, 287, 148, 3.6, 2.6, "rgba(236, 140, 140, .25)");
    ellipse(ctx, 305, 148, 3.6, 2.6, "rgba(236, 140, 140, .25)");
    // khăn xanh trùm đầu
    paint(ctx, [["M", 276, 148], ["C", 271, 122, 282, 104, 296, 104], ["C", 311, 104, 322, 120, 318, 148], ["C", 316, 134, 309, 123, 296, 122],
      ["C", 283, 123, 277, 134, 276, 148], ["Z"]], linear(ctx, 276, 104, 318, 148, [[0, "#9fe2ff"], [.6, "#3fa7dc"], [1, "#1f78b2"]]), "rgba(15, 80, 125, .6)", .8);
    paint(ctx, [["M", 279, 140], ["C", 279, 125, 287, 113, 296, 112]], null, "#d9b24a", 1.2);
    ctx.restore();
  }

  function drawChild(ctx) {
    sunburst(ctx, 334, 174, 13, 28, 21, 22);
    // áo hồng nhạt
    paint(ctx, [["M", 322, 192], ["C", 318, 210, 318, 232, 322, 246], ["L", 350, 246], ["C", 352, 230, 350, 210, 346, 192], ["C", 338, 186, 330, 186, 322, 192], ["Z"]],
      linear(ctx, 318, 188, 352, 246, [[0, "#fbdbe3"], [1, "#e796ad"]]), "rgba(160, 70, 95, .55)", .7);
    paint(ctx, [["M", 330, 200], ["C", 328, 216, 328, 230, 330, 244], ["M", 341, 200], ["C", 343, 216, 343, 230, 342, 244]], null, "rgba(190, 90, 120, .4)", .8);
    paint(ctx, [["M", 322, 244], ["L", 350, 244]], null, "#d9b24a", 1.4);
    // chân trần buông xuống
    capsule(ctx, [[328, 243], [327, 256], [325, 270]], 7, SKIN, SKIN_LINE);
    capsule(ctx, [[342, 243], [343, 256], [341.5, 270.5]], 7, SKIN, SKIN_LINE);
    ellipse(ctx, 323.5, 273, 4.4, 2.8, SKIN, -12 * DEG, SKIN_LINE);
    ellipse(ctx, 340.5, 273.5, 4.4, 2.8, SKIN, 12 * DEG, SKIN_LINE);
    paint(ctx, [["M", 325.5, 256], ["Q", 328, 257.5, 330, 256], ["M", 340.5, 256], ["Q", 343, 257.5, 345.5, 256]], null, "rgba(170, 115, 90, .45)", .6);
    // tay phải giơ ban phép lành
    capsule(ctx, [[325, 198], [316, 187]], 6, "#f4b9c9", "rgba(160, 70, 95, .55)");
    ellipse(ctx, 314, 182, 3.4, 3.8, SKIN, 0, SKIN_LINE);
    capsule(ctx, [[313, 180], [312, 174]], 1.7, SKIN, SKIN_LINE);
    capsule(ctx, [[315.5, 180], [315.5, 173.5]], 1.7, SKIN, SKIN_LINE);
    // tay trái cầm quả địa cầu có Thánh Giá
    capsule(ctx, [[346, 200], [357, 211]], 6, "#f4b9c9", "rgba(160, 70, 95, .55)");
    ellipse(ctx, 359.5, 213, 3.6, 3.2, SKIN, 0, SKIN_LINE);
    ctx.beginPath();
    ctx.arc(364, 205, 7.5, 0, TAU);
    ctx.fillStyle = radial(ctx, 361.5, 202, 1, 364, 205, 7.5, [[0, "#6fa8dc"], [.6, "#1d4f8f"], [1, "#0d2a52"]]);
    ctx.fill();
    paint(ctx, [["M", 356.6, 205], ["Q", 364, 208, 371.4, 205]], null, "#d9b24a", 1);
    gleam(ctx, 364, 205, 7.5);
    crossPath(ctx, 364, 193, 1.4, 5.5, 194.8, 4);
    ctx.fillStyle = "#d9b24a";
    ctx.fill();
    // đầu: gương mặt tròn, tóc xoăn nâu
    ellipse(ctx, 334, 177, 10, 10.8, radial(ctx, 332, 176, 1, 334, 177, 12, [[0, "#fdebdc"], [1, "#eec3a4"]]), 0, SKIN_LINE);
    [[326, 170, 4.2], [331, 167, 4.4], [337, 167, 4.4], [342, 170, 4], [344.5, 175, 3], [324, 175, 2.8]].forEach(([x, y, r]) =>
      ellipse(ctx, x, y, r, r, "#7a4a2a", 0, "rgba(70, 40, 20, .5)", .5));
    paint(ctx, [["M", 328.5, 178], ["Q", 330.5, 179.6, 332.5, 178], ["M", 335.5, 178], ["Q", 337.5, 179.6, 339.5, 178]], null, "#3a241a", .8);
    paint(ctx, [["M", 331.6, 183.2], ["Q", 334, 185, 336.4, 183.2]], null, "#c06f6d", .8);
    ellipse(ctx, 328.5, 181.5, 2.2, 1.5, "rgba(236, 140, 140, .3)");
    ellipse(ctx, 339.5, 181.5, 2.2, 1.5, "rgba(236, 140, 140, .3)");
  }

  function drawMary(ctx) {
    const robe = linear(ctx, 256, 0, 346, 0, [[0, "#dcecf5"], [.5, "#f7fcff"], [1, "#d6e8f3"]]);
    const robeLine = "rgba(120, 160, 190, .55)";

    sunburst(ctx, 296, 136, 30, 72, 54, 32);

    // áo choàng xanh phía sau thân (nối từ khăn trùm đầu)
    softShadow(ctx, "rgba(110, 70, 20, .35)", 16, 5, 7);
    paint(ctx, [["M", 278, 132], ["C", 266, 152, 262, 170, 258, 186], ["C", 236, 232, 226, 330, 230, 470], ["L", 372, 470],
      ["C", 376, 330, 368, 232, 340, 186], ["C", 334, 170, 328, 152, 316, 132], ["Z"]],
    linear(ctx, 230, 130, 372, 470, [[0, "#7fd2f7"], [.55, "#2f97cf"], [1, "#165f93"]]));
    noShadow(ctx);
    paint(ctx, [["M", 240, 240], ["C", 234, 300, 232, 380, 236, 466], ["M", 250, 250], ["C", 246, 320, 244, 400, 246, 466]], null, "rgba(10, 60, 100, .35)", 1.2);

    // áo trong trắng ánh xanh: thân dưới, thân trên, khăn quàng cổ
    paint(ctx, [["M", 268, 280], ["C", 262, 350, 258, 420, 256, 470], ["L", 346, 470], ["C", 344, 420, 338, 350, 332, 280], ["Z"]], robe, robeLine, .8);
    paint(ctx, [["M", 272, 330], ["C", 268, 380, 266, 430, 266, 468], ["M", 286, 326], ["C", 284, 380, 284, 430, 284, 468]], null, "rgba(130, 170, 200, .45)", 1);
    paint(ctx, [["M", 262, 182], ["C", 280, 176, 316, 176, 338, 182], ["C", 342, 220, 336, 256, 332, 282], ["L", 268, 282],
      ["C", 262, 256, 258, 220, 262, 182], ["Z"]], robe, robeLine, .8);
    paint(ctx, [["M", 284, 200], ["C", 282, 230, 284, 256, 286, 278], ["M", 312, 200], ["C", 314, 230, 314, 256, 312, 278]], null, "rgba(130, 170, 200, .4)", .9);
    paint(ctx, [["M", 268, 280], ["Q", 300, 287, 332, 280]], null, "#d9b24a", 2.4);

    drawMaryHead(ctx);
    paint(ctx, [["M", 270, 178], ["C", 284, 187, 310, 187, 326, 178], ["C", 331, 186, 327, 195, 318, 197], ["C", 304, 192, 290, 192, 278, 197],
      ["C", 269, 195, 265, 186, 270, 178], ["Z"]], linear(ctx, 266, 178, 330, 197, [[0, "#d5f1ff"], [1, "#8ccff0"]]), "rgba(40, 120, 170, .5)", .7);

    // tay phải đưa ra phía trước, ống tay áo rộng viền vàng
    paint(ctx, [["M", 264, 186], ["C", 250, 200, 244, 226, 244, 250], ["C", 242, 268, 236, 282, 228, 293], ["L", 249, 302],
      ["C", 253, 289, 258, 272, 262, 256], ["C", 266, 236, 272, 210, 278, 196], ["Z"]], robe, robeLine, .8);
    paint(ctx, [["M", 228, 293], ["L", 249, 302]], null, "#d9b24a", 2);

    // vạt áo choàng vắt chéo trước thân, viền vàng hoa văn
    paint(ctx, DRAPE, linear(ctx, 246, 226, 378, 470, [[0, "#a6e6ff"], [.45, "#4fb6e6"], [1, "#1c6fa6"]]), "rgba(15, 80, 125, .6)", .8);
    paint(ctx, [["M", 344, 250], ["C", 352, 320, 356, 400, 356, 466], ["M", 328, 300], ["C", 338, 360, 344, 420, 348, 468],
      ["M", 300, 330], ["C", 318, 360, 330, 400, 336, 440]], null, "rgba(10, 70, 115, .38)", 1.3);
    paint(ctx, [["M", 348, 256], ["C", 356, 322, 360, 400, 360, 462], ["M", 306, 330], ["C", 322, 356, 334, 394, 340, 432]], null, "rgba(255, 255, 255, .35)", 1);
    goldHem(ctx, DRAPE_TOP);
    goldHem(ctx, DRAPE_BOTTOM);

    // tay trái đỡ Chúa Hài Đồng (ống tay áo nằm dưới Chúa)
    paint(ctx, [["M", 334, 186], ["C", 352, 198, 364, 228, 362, 252], ["C", 360, 262, 346, 265, 334, 259], ["L", 330, 249],
      ["C", 342, 246, 348, 236, 344, 214], ["Z"]], robe, robeLine, .8);
    paint(ctx, [["M", 362, 252], ["C", 356, 262, 344, 264, 336, 259]], null, "#d9b24a", 2);
    drawChild(ctx);
    ellipse(ctx, 349, 251, 5.8, 5, SKIN, -8 * DEG, SKIN_LINE);
    capsule(ctx, [[344.5, 248.5], [341, 249.2]], 2.6, SKIN, SKIN_LINE);
    capsule(ctx, [[344.6, 251.8], [340.8, 252.8]], 2.6, SKIN, SKIN_LINE);
    capsule(ctx, [[345.2, 255], [341.6, 256.4]], 2.4, SKIN, SKIN_LINE);

    // bàn chân mang dép & hai đoá hồng
    [[284, 472], [313, 472]].forEach(([x, y], f) => {
      paint(ctx, [["M", x - 8, y + 3.6], ["Q", x, y + 5.6, x + 8, y + 3.6]], null, "#6b4626", 1.4);   // đế dép
      ellipse(ctx, x, y, 7.6, 3.8, SKIN, 0, SKIN_LINE);
      [-5, -2.4, 0, 2.4, 4.8].forEach((dx, i) => ellipse(ctx, x + dx * (f ? 1 : -1), y + 2.6 - Math.abs(i - 1) * .3, i === 0 ? 1.7 : 1.3, 1.25, SKIN, 0, SKIN_LINE, .5));
      paint(ctx, [["M", x - 6, y - 1.2], ["Q", x, y + .6, x + 6, y - 1.2]], null, "#7a5230", 1.4);       // quai dép
    });
    rose(ctx, 262, 476, 5.5);
    rose(ctx, 338, 476, 5.5);

    // tràng hạt Beryl xanh thả từ bàn tay phải
    strokeSegments(ctx, MARY_LOOP, "rgba(30, 110, 160, .55)", .9);
    paint(ctx, [["M", 232, 386], ["L", 234, 416]], null, "rgba(30, 110, 160, .55)", .9);
    maryBeads.forEach(([x, y], i) => beadBeryl(ctx, x, y, i % 11 === 10 ? 4.6 : 3.6));
    maryPendant.forEach(([x, y]) => beadBeryl(ctx, x, y, 3.3));
    crossPath(ctx, 234, 419, 4.4, 21, 425, 13.5);
    ctx.fillStyle = linear(ctx, 227, 419, 241, 440, [[0, "#fbeec0"], [.55, "#d4a537"], [1, "#a67a17"]]);
    ctx.fill();
    ctx.strokeStyle = "#9c7315";
    ctx.lineWidth = .6;
    ctx.stroke();

    // bàn tay phải mở, các ngón buông xuống giữ chuỗi
    ellipse(ctx, 238.5, 305, 6.8, 7.6, SKIN, 18 * DEG, SKIN_LINE);
    capsule(ctx, [[233.5, 309], [231.5, 318]], 2.9, SKIN, SKIN_LINE);
    capsule(ctx, [[237.5, 310.5], [236.5, 320.5]], 3, SKIN, SKIN_LINE);
    capsule(ctx, [[241.5, 310.5], [241.5, 319.5]], 2.9, SKIN, SKIN_LINE);
    capsule(ctx, [[244.5, 308], [245.5, 316]], 2.6, SKIN, SKIN_LINE);
    capsule(ctx, [[233, 302], [227.5, 307]], 3, SKIN, SKIN_LINE);
  }

  /* ------------------ HAI NGƯỜI QUỲ (khung dáng quay mặt sang trái) ------------------ */
  const KNEE_LEGS = [["M", 385, 640], ["C", 376, 665, 370, 690, 372, 706], ["L", 498, 708], ["C", 506, 706, 508, 696, 500, 690],
    ["C", 480, 684, 470, 676, 462, 662], ["C", 456, 648, 452, 640, 446, 632], ["Z"]];
  const KNEE_TORSO = [["M", 392, 592], ["C", 382, 610, 380, 628, 385, 642], ["L", 446, 634], ["C", 448, 612, 444, 594, 436, 582],
    ["C", 424, 576, 404, 580, 392, 592], ["Z"]];
  const KNEE_SLEEVE = [["M", 398, 592], ["C", 388, 604, 378, 612, 372, 618], ["C", 368, 624, 374, 630, 380, 628],
    ["C", 392, 622, 404, 614, 414, 604], ["Z"]];
  // đầu nhìn nghiêng, toạ độ cục bộ quanh tâm đầu (0,0), mặt hướng sang trái
  const HEAD_PROFILE = [["M", 0, -23], ["C", 12, -23, 22, -13, 22, 0], ["C", 22, 12, 15, 20, 6, 23], ["L", -2, 24],
    ["C", -8, 24, -13, 23, -17, 22], ["C", -19, 20, -20, 18, -21, 16], ["C", -22, 15, -21.5, 14, -20.5, 13.5],
    ["C", -22, 13, -22.5, 12, -22, 11], ["C", -21.5, 10, -21, 9.5, -21, 9], ["C", -23, 8.5, -25.5, 7, -25, 5],
    ["C", -24, 2, -22, -1, -21.5, -3], ["C", -21.5, -6, -20, -10, -18, -13], ["C", -14, -20, -7, -23, 0, -23], ["Z"]];
  const HAIR_CAP = [["M", -18.5, -12], ["C", -14, -25, 6, -29, 19, -18], ["C", 26, -10, 26, 6, 17, 19],
    ["C", 12, 15, 7, 9, 4, 2], ["C", 1, -5, -8, -9, -18.5, -12], ["Z"]];

  // Đầu đặt trên cổ: tâm đầu, góc cúi nhẹ, tỉ lệ so với thân
  const HEAD_X = 405, HEAD_Y = 556, HEAD_TILT = -18 * DEG, HEAD_SCALE = .86;

  /** Thu toạ độ theo cỡ đầu, cho mái tóc dài khớp với đầu. */
  function alongHead(ctx, draw) {
    ctx.save();
    ctx.translate(HEAD_X, HEAD_Y); ctx.scale(HEAD_SCALE, HEAD_SCALE); ctx.translate(-410, -557);
    draw();
    ctx.restore();
  }

  /** Đầu cúi nhẹ nhìn nghiêng: da, mắt nhắm, lông mày, môi, tóc (và khăn voan của nữ tu). */
  function drawProfileHead(ctx, isAoDai) {
    ctx.save();
    ctx.translate(HEAD_X, HEAD_Y);
    ctx.rotate(HEAD_TILT);
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    paint(ctx, HEAD_PROFILE, radial(ctx, -8, 0, 2, -4, 2, 28, [[0, "#fde9da"], [.65, "#f4d3ba"], [1, "#e6bc9c"]]), SKIN_LINE, .7);
    ellipse(ctx, -10, 7, 3.8, 2.6, "rgba(236, 140, 140, .2)");
    paint(ctx, [["M", -18, -6.5], ["Q", -14, -8.6, -9, -7]], null, "#3b2a22", 1);         // lông mày
    paint(ctx, [["M", -16.5, -1.2], ["Q", -13, 1.8, -9.2, -.6]], null, "#3b2a22", 1.15);   // mí mắt khép
    paint(ctx, [["M", -15.6, .1], ["L", -16.6, 2.3], ["M", -13.4, .9], ["L", -13.8, 3.1], ["M", -11.2, .7], ["L", -11.2, 2.8]], null, "#3b2a22", .55);
    ellipse(ctx, -21.6, 7.8, .9, .6, "#c4917a");                                          // cánh mũi
    paint(ctx, [["M", -22, 11], ["C", -21.5, 12, -21, 12.8, -20.5, 13.5], ["C", -21.5, 14.2, -21.8, 15.2, -21, 16], ["L", -19.6, 15.1],
      ["C", -19.9, 14.4, -19.4, 13.9, -18.6, 13.8], ["C", -19.5, 13.2, -20, 12.4, -20.3, 11.4], ["Z"]], "rgba(212, 130, 126, .85)"); // môi khép
    paint(ctx, [["M", -21.2, 13.6], ["L", -18.4, 13.9]], null, "#a85a58", .6);
    paint(ctx, HAIR_CAP, linear(ctx, -18, -26, 22, 18, [[0, "#2c241f"], [1, "#151110"]]));
    paint(ctx, [["M", -13, -17], ["C", -3, -23, 10, -21, 17, -10], ["M", -7, -14], ["C", 4, -17, 12, -11, 15, 0],
      ["M", -2, -10], ["C", 6, -11, 11, -4, 12, 8]], null, "rgba(120, 100, 90, .55)", .6);
    if (isAoDai) {
      ellipse(ctx, 5.5, 2.5, 3.2, 4.8, "#f0cdb2", 10 * DEG, SKIN_LINE, .6);
      paint(ctx, [["M", 5, .2], ["Q", 7, 2.5, 5.2, 5]], null, "rgba(170,115,90,.6)", .5);
    } else {
      // khăn voan mỏng ôm theo đầu
      paint(ctx, [["M", -21, -12], ["C", -17, -28, 6, -33, 21, -21], ["C", 29, -12, 29, 6, 23, 20], ["L", 15, 22],
        ["C", 13, 12, 8, 3, 3, -3], ["C", -3, -9, -12, -12, -21, -12], ["Z"]], "rgba(255, 255, 255, .58)", "rgba(225, 225, 235, .95)", .7);
      paint(ctx, [["M", -12, -22], ["C", 0, -27, 14, -22, 22, -10], ["M", -4, -17], ["C", 8, -18, 18, -8, 21, 8]], null, "rgba(240, 240, 247, .9)", .7);
    }
    ctx.restore();
  }

  /**
   * Vẽ một người quỳ cầu nguyện, mặt quay sang trái.
   * outfit "aodai": nữ đệ tử áo dài trắng, tóc đen dài, không đội lúp, hai tay lần chuỗi thạch anh.
   * outfit "habit": nữ tu áo dòng đen, cổ áo trắng đứng, Thánh Giá cài ngực, khăn voan trắng mỏng, chắp tay.
   */
  function drawKneeler(ctx, outfit) {
    const isAoDai = outfit === "aodai";
    const cloth = isAoDai
      ? linear(ctx, 380, 580, 505, 708, [[0, "#ffffff"], [1, "#ece8e0"]])
      : linear(ctx, 380, 580, 505, 708, [[0, "#3c3c47"], [1, "#101013"]]);
    const edge = isAoDai ? "#c9bfac" : "#050506";
    // áo dài trắng trơn, không nếp hoa văn; áo dòng đen giữ nếp vải cho có khối
    const fold = isAoDai ? null : "rgba(0, 0, 0, .55)";
    const sheen = isAoDai ? null : "rgba(255, 255, 255, .13)";

    // bóng tiếp đất mềm
    ctx.save();
    ctx.translate(440, 708); ctx.scale(1, .12);
    ellipse(ctx, 0, 0, 90, 90, radial(ctx, 0, 0, 0, 0, 0, 90, [[0, "rgba(60,35,15,.38)"], [1, "rgba(60,35,15,0)"]]));
    ctx.restore();

    // phần dưới quỳ gối: quần trắng (áo dài) hoặc váy áo dòng đen
    paint(ctx, KNEE_LEGS, isAoDai ? linear(ctx, 380, 640, 505, 708, [[0, "#fdfcf9"], [1, "#e6e1d6"]]) : cloth, edge, .8);
    paint(ctx, [["M", 392, 660], ["C", 410, 672, 430, 690, 440, 706], ["M", 420, 650], ["C", 440, 665, 460, 690, 470, 706],
      ["M", 450, 660], ["C", 466, 676, 480, 692, 488, 704]], null, fold, 1.2);
    paint(ctx, [["M", 395, 657], ["C", 412, 669, 430, 686, 438, 700], ["M", 424, 648], ["C", 442, 662, 458, 684, 466, 700]], null, sheen, .8);
    ellipse(ctx, 502, 699, 5, 8, isAoDai ? "#e0d8c8" : "#0b0b0d", 0, edge, .6);

    // vạt sau áo dài phủ xuống sàn
    if (isAoDai) {
      paint(ctx, [["M", 444, 634], ["C", 456, 656, 474, 684, 492, 708], ["L", 460, 708], ["C", 450, 688, 440, 664, 432, 640], ["Z"]], cloth, edge, .8);
      paint(ctx, [["M", 442, 646], ["C", 452, 666, 466, 688, 476, 706]], null, fold, 1);
    }

    // thân áo, nếp & ánh vải
    paint(ctx, KNEE_TORSO, cloth, edge, .8);
    paint(ctx, [["M", 430, 590], ["C", 436, 606, 438, 620, 436, 634], ["M", 408, 600], ["C", 402, 614, 400, 626, 402, 638]], null, fold, 1);
    paint(ctx, [["M", 424, 588], ["C", 430, 602, 432, 618, 430, 632]], null, sheen, .8);

    if (isAoDai) {
      // mái tóc đen dài thả sau lưng, có sợi tóc ánh sáng
      alongHead(ctx, () => {
        paint(ctx, [["M", 424, 556], ["C", 442, 572, 452, 604, 451, 640], ["C", 451, 650, 443, 654, 436, 648],
          ["C", 436, 616, 430, 594, 416, 577], ["Z"]], linear(ctx, 420, 556, 450, 650, [[0, "#2c241f"], [1, "#120e0c"]]));
        paint(ctx, [["M", 428, 566], ["C", 439, 586, 445, 610, 444, 640], ["M", 433, 570], ["C", 444, 592, 448, 616, 447, 642]], null, "rgba(130, 110, 100, .5)", .6);
      });
    }

    // cổ: cổ áo dài đứng thấp, hoặc cổ áo trắng đứng cao của nữ tu
    paint(ctx, [["M", 403, 573], ["C", 408, 570, 413, 568, 417.5, 567], ["C", 421, 573, 423, 580, 424.5, 586], ["L", 405, 591],
      ["C", 404, 585, 403, 579, 403, 573], ["Z"]], linear(ctx, 403, 567, 424, 591, [[0, "#e0b493"], [1, "#efcdb2"]]), SKIN_LINE, .6);
    if (isAoDai) {
      paint(ctx, [["M", 402, 582], ["C", 409, 578, 418, 577, 424.5, 580], ["L", 425.5, 589], ["C", 418, 587, 410, 588, 403, 591.5], ["Z"]], "#ffffff", "#c9bfac", .8);
    } else {
      paint(ctx, [["M", 402, 576], ["C", 409, 571, 417, 569, 423, 571], ["L", 426.5, 592], ["C", 418, 589, 409, 591, 403, 595], ["Z"]],
        linear(ctx, 402, 570, 427, 595, [[0, "#ffffff"], [1, "#dfe1e6"]]), "#c3c6cd", .8);
      paint(ctx, [["M", 403, 584], ["C", 410, 580, 418, 579, 425, 581]], null, "rgba(170, 175, 185, .6)", .6);
    }

    // vạt trước áo dài rủ trước đầu gối
    if (isAoDai) {
      paint(ctx, [["M", 388, 638], ["C", 382, 662, 376, 690, 372, 708], ["L", 400, 708], ["C", 402, 688, 404, 664, 408, 640], ["Z"]], cloth, edge, .8);
      paint(ctx, [["M", 396, 646], ["C", 392, 668, 388, 690, 386, 706]], null, fold, 1);
      paint(ctx, [["M", 400, 646], ["C", 397, 668, 394, 690, 393, 704]], null, sheen, .8);
    }

    // tay áo
    paint(ctx, KNEE_SLEEVE, isAoDai ? linear(ctx, 372, 592, 414, 628, [[0, "#ffffff"], [1, "#e6e0d4"]]) : linear(ctx, 372, 592, 414, 628, [[0, "#30303a"], [1, "#141418"]]), edge, .8);
    paint(ctx, [["M", 404, 600], ["C", 396, 608, 388, 614, 380, 619]], null, fold, .9);

    if (!isAoDai) {
      // Thánh Giá bạc nhỏ cài trên ngực áo dòng, ngay dưới cổ áo
      crossPath(ctx, 413, 596, 1.8, 9.5, 599, 6.4);
      ctx.fillStyle = linear(ctx, 409, 596, 417, 606, [[0, "#ffffff"], [1, "#aab2bc"]]);
      ctx.fill();
      ctx.strokeStyle = "rgba(90, 95, 105, .6)";
      ctx.lineWidth = .3;
      ctx.stroke();
    }

    if (isAoDai) {
      // chuỗi Mân Côi thạch anh: chủ đạo trắng, điểm hạt đỏ sẫm, đầu chuỗi Thánh Giá pha lê
      strokeSegments(ctx, SIS_LOOP, "#cfc4b3", .8);
      paint(ctx, [["M", 376, 666], ["L", 379, 686]], null, "#cfc4b3", .8);
      sisBeads.forEach(([x, y], i) => (i % 5 === 2 ? beadRed(ctx, x, y, 2.8) : beadQuartz(ctx, x, y, 2.7, i % 2 === 0)));
      sisPendant.forEach(([x, y], i) => (i === 1 ? beadRed(ctx, x, y, 2.6) : beadQuartz(ctx, x, y, 2.5, false)));
      crystalCross(ctx, 379, 688, 3, 15, 692, 10.5, .7);
      // hai bàn tay nâng chuỗi, ngón tay ôm hạt
      ellipse(ctx, 371, 615, 7.4, 5.8, SKIN, -22 * DEG, SKIN_LINE);
      capsule(ctx, [[365, 611], [360, 616.5]], 2.6, SKIN, SKIN_LINE);
      capsule(ctx, [[366, 614.5], [361, 620.5]], 2.6, SKIN, SKIN_LINE);
      capsule(ctx, [[368, 618], [364, 623.5]], 2.5, SKIN, SKIN_LINE);
      capsule(ctx, [[372, 609.5], [366.5, 605.5]], 2.8, SKIN, SKIN_LINE);
    } else {
      // hai bàn tay chắp lại, đầu ngón hướng lên
      paint(ctx, [["M", 381, 614.8], ["C", 377, 606, 369, 594, 364.8, 588.4], ["Q", 361.2, 584.6, 359.2, 591.6],
        ["C", 362, 598, 368, 610, 373, 619.2], ["Z"]], linear(ctx, 360, 588, 381, 619, [[0, "#fbe3d0"], [1, "#eec6a8"]]), SKIN_LINE, .7);
      paint(ctx, [["M", 377, 617], ["C", 372, 607, 366, 597, 362, 589]], null, "rgba(170, 115, 90, .6)", .6);
      paint(ctx, [["M", 371, 602.5], ["L", 367.6, 604.6], ["M", 368.2, 597.6], ["L", 365, 599.4]], null, "rgba(170, 115, 90, .35)", .45);
      capsule(ctx, [[379.5, 612.5], [374.5, 603.5]], 2.4, "#f0cdb2", SKIN_LINE);
    }

    if (!isAoDai) {
      // khăn voan trắng mỏng buông từ sau đầu xuống lưng
      paint(ctx, [["M", 411, 538], ["C", 424, 540, 432, 552, 434, 568], ["C", 439, 592, 445, 618, 447, 646], ["L", 430, 640],
        ["C", 428, 618, 424, 598, 419, 582], ["C", 417, 574, 415, 566, 413, 558], ["Z"]], "rgba(255, 255, 255, .55)", "rgba(225, 225, 235, .95)", .8);
      paint(ctx, [["M", 424, 548], ["C", 432, 572, 437, 604, 439, 640]], null, "rgba(240, 240, 247, .9)", .9);
    }

    // đầu cúi nhẹ trên cổ
    drawProfileHead(ctx, isAoDai);
  }

  /** Lớp trước tĩnh: Đức Mẹ, nữ tu (trái), nữ đệ tử (phải), ánh vàng phủ cảnh. */
  function drawFront(ctx) {
    drawMary(ctx);

    // nữ tu áo đen: dùng chung khung dáng quỳ, lật ngang để quay mặt về phía Đức Mẹ
    ctx.save();
    ctx.translate(SW, 0); ctx.scale(-1, 1);
    ctx.translate(440, 712); ctx.scale(1.16, 1.16); ctx.translate(-440, -708);
    drawKneeler(ctx, "habit");
    ctx.restore();

    ctx.save();
    ctx.translate(440, 712); ctx.scale(1.16, 1.16); ctx.translate(-440, -708);
    drawKneeler(ctx, "aodai");
    ctx.restore();

    // ánh vàng ấm phủ toàn cảnh
    ctx.fillStyle = radial(ctx, 300, 266, 0, 300, 266, 520, [[.55, "rgba(255,255,255,0)"], [1, "rgba(138,90,36,.28)"]]);
    ctx.fillRect(0, 0, SW, SH);
  }

  /** Lớp động phía sau Đức Mẹ: tia sáng & hào quang (Gradient tròn) thở nhẹ. */
  function drawGlowBehind(ctx, t) {
    ctx.save();
    ctx.globalAlpha = .22 + .12 * Math.sin(t * .8);
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (-90 + (i - 7.5) * 11.5) * DEG, w = 2.6 * DEG;
      ctx.moveTo(300, 190);
      ctx.lineTo(300 + 340 * Math.cos(a - w), 190 + 340 * Math.sin(a - w));
      ctx.lineTo(300 + 340 * Math.cos(a + w), 190 + 340 * Math.sin(a + w));
      ctx.closePath();
    }
    ctx.fill();

    ctx.globalAlpha = .78 + .22 * Math.sin(t * .9);
    ctx.fillStyle = radial(ctx, 300, 230, 0, 300, 230, 170, [[0, "rgba(255,246,210,.95)"], [.6, "rgba(247,220,143,.35)"], [1, "rgba(247,220,143,0)"]]);
    ctx.fillRect(130, 60, 340, 340);

    ctx.globalAlpha = .7 + .3 * Math.sin(t * 1.3 + 1);
    ctx.fillStyle = radial(ctx, 300, 146, 0, 300, 146, 62, [[0, "rgba(255,246,210,1)"], [.6, "rgba(247,220,143,.45)"], [1, "rgba(247,220,143,0)"]]);
    ctx.fillRect(238, 84, 124, 124);
    ctx.restore();
  }

  const sparkles = Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 + TAU / 24, phase: Math.random() * TAU, speed: 1.2 + Math.random() * 1.4, size: 3 + Math.random() * 2.5 }));
  const motes = Array.from({ length: 20 }, () => ({
    x: 20 + Math.random() * 560, y: Math.random() * 560, r: .8 + Math.random() * 1.4,
    v: 6 + Math.random() * 10, sway: 6 + Math.random() * 10, phase: Math.random() * TAU, a: .35 + Math.random() * .4
  }));

  /** Ánh sao lấp lánh trên vầng hào quang. */
  function drawSparkles(ctx, t) {
    sparkles.forEach((s) => {
      const alpha = Math.pow(Math.max(0, Math.sin(t * s.speed + s.phase)), 2);
      if (alpha < .02) return;
      const a = s.a + t * .07, x = 300 + Math.cos(a) * 62, y = 146 + Math.sin(a) * 62, len = s.size * (.6 + .4 * alpha);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#fffbe6";
      ctx.lineWidth = .9;
      ctx.beginPath();
      ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, TAU);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    });
  }

  /** Đốm sáng nhỏ rơi dịu dàng trong nhà nguyện. */
  function drawMotes(ctx, t, dt) {
    motes.forEach((m) => {
      m.y += m.v * dt;
      if (m.y > 600) { m.y = -6; m.x = 20 + Math.random() * 560; }
      const x = m.x + Math.sin(t * .6 + m.phase) * m.sway;
      ctx.beginPath();
      ctx.arc(x, m.y, m.r * 2.6, 0, TAU);
      ctx.fillStyle = radial(ctx, x, m.y, 0, x, m.y, m.r * 2.6, [[0, `rgba(255,248,214,${m.a})`], [1, "rgba(255,236,170,0)"]]);
      ctx.fill();
    });
  }

  /** Ngọn nến lung linh tại toạ độ x (đỉnh lửa y = 300). */
  function drawFlame(ctx, t, x, phase) {
    const flick = 1 + .06 * Math.sin(t * 9 + phase) + .04 * Math.sin(t * 13.7 + phase);
    ctx.save();
    ctx.globalAlpha = .75 + .25 * Math.sin(t * 7 + phase);
    ctx.fillStyle = radial(ctx, x, 308, 0, x, 308, 24, [[0, "rgba(255,246,210,.95)"], [.6, "rgba(247,220,143,.35)"], [1, "rgba(247,220,143,0)"]]);
    ctx.fillRect(x - 26, 282, 52, 52);
    ctx.globalAlpha = 1;
    ctx.translate(x, 318); ctx.scale(1 / flick, flick); ctx.translate(-x, -318);
    paint(ctx, [["M", x, 300], ["C", x + 6, 308, x + 6, 314, x, 318], ["C", x - 6, 314, x - 6, 308, x, 300], ["Z"]],
      radial(ctx, x, 312, 0, x, 310, 13, [[0, "#fffbe6"], [.5, "#ffd36b"], [1, "rgba(242,154,46,0)"]]));
    ctx.restore();
  }

  function initScene() {
    const canvas = document.getElementById("scene-canvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let k = 1, back = null, front = null, visible = true, rafId = 0, last = 0;

    const layer = (draw) => {
      const c = document.createElement("canvas");
      c.width = canvas.width;
      c.height = canvas.height;
      const x = c.getContext("2d");
      x.setTransform(k, 0, 0, k, 0, 0);
      SCALE = k;
      draw(x);
      return c;
    };

    const frame = (t, dt) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(back, 0, 0);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      drawGlowBehind(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(front, 0, 0);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      CANDLES.forEach((x, i) => drawFlame(ctx, t, x, i * 1.7));
      drawSparkles(ctx, t);
      if (dt !== null) drawMotes(ctx, t, dt);
    };

    const loop = (now) => {
      const dt = last ? Math.min((now - last) / 1000, .05) : 0;
      last = now;
      frame(now / 1000, dt);
      rafId = visible ? requestAnimationFrame(loop) : 0;
    };

    const start = () => { if (!rafId && !reducedMotion && back) { last = 0; rafId = requestAnimationFrame(loop); } };

    fitCanvas(canvas, SW, SH, (scale) => {
      k = scale;
      back = layer(drawBack);   // vẽ sẵn lớp tĩnh một lần cho mỗi cỡ màn hình
      front = layer(drawFront);
      frame(1.2, reducedMotion ? null : 0);
      start();
    });

    // chỉ chạy hoạt ảnh khi cảnh đang trong khung nhìn
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      }).observe(canvas);
    }
  }

  /* ============== CHUỖI HẠT NHỎ Ở ĐẦU TRANG (#hero-rosary) ============== */
  function initHeroRosary() {
    const canvas = document.getElementById("hero-rosary");
    if (!canvas || !canvas.getContext) return;
    const W = 160, H = 230, ctx = canvas.getContext("2d");

    const ring = [];
    for (let i = 0; i <= 720; i++) {
      const a = -Math.PI / 2 + i * TAU / 720;
      ring.push([80 + 58 * Math.cos(a), 66 + 54 * Math.sin(a)]);
    }
    const beads = spaced(ring, 13.4).slice(0, -1);

    fitCanvas(canvas, W, H, (k) => {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = radial(ctx, 80, 190, 0, 80, 190, 38, [[0, "rgba(255,247,214,1)"], [.6, "rgba(236,210,127,.35)"], [1, "rgba(236,210,127,0)"]]);
      ctx.fillRect(40, 150, 80, 80);
      beads.forEach(([x, y], i) => beadQuartz(ctx, x, y, 4.6, i % 2 === 0));
      [138, 149, 160].forEach((y, i) => beadQuartz(ctx, 80, y, 4.2, i === 1));
      crystalCross(ctx, 80, 166, 10, 58, 180, 38, 1.5);
    });
  }

  /* ======================= FAVICON VẼ BẰNG CANVAS ======================= */
  function setFavicon() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    crossPath(ctx, 32, 6, 8, 52, 18, 36);
    ctx.fillStyle = linear(ctx, 14, 6, 50, 58, [[0, "#fbeec0"], [.55, "#d4a537"], [1, "#a67a17"]]);
    ctx.fill();
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = c.toDataURL("image/png");
    document.head.appendChild(link);
  }

  initScene();
  initHeroRosary();
  setFavicon();
})();
