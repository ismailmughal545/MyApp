/* ==========================================================================
   BREAKER SYSTEM  +  3D PNG EDITOR   (for Create Panel / Electric-app)
   --------------------------------------------------------------------------
   Toolbar  →  Breaker  →  choose type (MCB, MCCB, RCCB ...)  →  choose PNG
            →  3D editor (rotate with finger, color, crop, thickness)
            →  "Add" puts the 3D view on the canvas as a normal image object.

   Needs: breakers-data.js  (catalog)   and the globals of index.html
          (items, sel, show, toast, snap, draw, imgStore, getImg, defaultObj,
           wrap, panX, panY, zoom, toolset, pickerHTML, wirePicker)
   ========================================================================== */
(function () {
  'use strict';
  if (!window.BREAKER_TYPES) return;
  const TYPES = window.BREAKER_TYPES;
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const rad = d => d * Math.PI / 180;
  const BASE_MAX = 1200;

  /* ------------------------------ default settings ------------------------------ */
  const DEF = {
    hue: 0, sat: 100, bri: 100, con: 100, rm: 0, tint: '#ff5a1f', tintAmt: 0,
    thick: 10, side: 'auto', sideColor: '#4b5563', shadow: 1,
    rot: 0, fh: 0, fv: 0, cl: 0, ct: 0, cr: 1, cb: 1,
    yaw: 0, pitch: 0, zoom: 1,
    bgOn: 0, bgCol: '#ffffff', bgTol: 20, bgSoft: 25, bgEdge: 1, bgSeeds: [], mask: '', bSize: 40, bHard: 60
  };
  function cleanSet(o) {
    const s = {};
    if (!o || typeof o !== 'object') return s;
    const num = (k, a, b) => { const v = Number(o[k]); if (o[k] !== undefined && o[k] !== null && o[k] !== '' && Number.isFinite(v)) s[k] = clamp(v, a, b); };
    num('hue', -180, 180); num('sat', 0, 200); num('bri', 20, 200); num('con', 20, 200); num('rm', 0, 60);
    num('tintAmt', 0, 100); num('thick', 0, 60); num('shadow', 0, 1); num('rot', 0, 3); num('fh', 0, 1); num('fv', 0, 1);
    num('cl', 0, .95); num('ct', 0, .95); num('cr', .05, 1); num('cb', .05, 1);
    num('yaw', -3600, 3600); num('pitch', -3600, 3600); num('zoom', .3, 4);
    ['rot', 'fh', 'fv', 'shadow'].forEach(k => { if (k in s) s[k] = Math.round(s[k]); });
    ['tint', 'sideColor'].forEach(k => { if (typeof o[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(o[k])) s[k] = o[k]; });
    if (o.side === 'auto' || o.side === 'solid') s.side = o.side;
    num('bgTol', 0, 100); num('bgSoft', 0, 60); num('bgOn', 0, 1); num('bgEdge', 0, 1); num('bSize', 4, 200); num('bHard', 0, 100);
    ['bgOn', 'bgEdge'].forEach(k => { if (k in s) s[k] = Math.round(s[k]); });
    if (typeof o.bgCol === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.bgCol)) s.bgCol = o.bgCol;
    if (Array.isArray(o.bgSeeds)) s.bgSeeds = o.bgSeeds.filter(q => Array.isArray(q) && q.length >= 2 && isFinite(q[0]) && isFinite(q[1])).slice(0, 12).map(q => [clamp(+q[0], 0, 1), clamp(+q[1], 0, 1)]);
    if (typeof o.mask === 'string' && o.mask.length < 1000000 && /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(o.mask)) s.mask = o.mask;
    if (s.cr !== undefined && s.cl !== undefined && s.cr - s.cl < .04) { s.cl = 0; s.cr = 1; }
    if (s.cb !== undefined && s.ct !== undefined && s.cb - s.ct < .04) { s.ct = 0; s.cb = 1; }
    return s;
  }

  /* ------------------------------ styles ------------------------------ */
  const css = document.createElement('style');
  css.textContent = `
.tile svg{width:24px;height:24px}
.brkTypes{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:52vh;overflow:auto;margin:6px 0}
.sheet .brkTypes button{margin:0;min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 6px;border-radius:14px;background:#fff;border:1px solid #e1e7ee;box-shadow:0 1px 2px #0000000d;color:#1f2a36;text-align:center}
.sheet .brkTypes button b{font-size:17px}.sheet .brkTypes button small{font-size:10.5px;color:#6b7785;line-height:1.2}
.sheet .brkTypes button svg{width:26px;height:26px;color:#147bd1}
.brkHead{display:flex;align-items:center;gap:10px}.brkHead h3{margin:0;font-size:19px}.brkHead h3 small{font-size:11px;font-weight:400;color:#6b7785;margin-left:4px}
.sheet .brkBackBtn{margin:0;width:40px;height:40px;border-radius:12px;background:#e9edf2;font-size:20px}
.brkHint{font-size:12px;color:#526273;margin:8px 0 2px;line-height:1.4}.brkHint.warn{color:#b45309}
.brkGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:46vh;overflow:auto;margin:8px 0;padding:2px}
.sheet .brkGrid button{margin:0;padding:4px;aspect-ratio:1;position:relative;border-radius:12px;border:1px solid #dce4ed;overflow:hidden;
 background:#fff linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),linear-gradient(45deg,#eee 25%,#fff 25%,#fff 75%,#eee 75%);background-size:14px 14px;background-position:0 0,7px 7px}
.sheet .brkGrid button img{width:100%;height:100%;object-fit:contain;display:block}
.sheet .brkGrid button span{position:absolute;left:0;right:0;bottom:0;background:#000a;color:#fff;font-size:10px;padding:2px 0;text-align:center}
.sheet .brkGrid button.missing{background:#f1f4f8;border-style:dashed}.sheet .brkGrid button.missing span{background:#64748bcc}
.sheet .brkGrid button.missing::before{content:"＋";position:absolute;top:34%;left:0;right:0;text-align:center;font-size:24px;color:#94a3b8}

.b3d{position:fixed;inset:0;z-index:60;background:#f3f5f8;display:none;flex-direction:column;color:#202b36}
.b3d.open{display:flex}
.b3Head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border-bottom:1px solid #e3e8ee}
.b3Head button{border:0;border-radius:10px;height:42px;padding:0 14px;font-size:15px;background:#e9edf2;color:#33414d}
.b3Head button.primary{background:#147bd1;color:#fff;font-weight:700}
.b3Head b{flex:1;font-size:16px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b3Stage{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;
 background:#fff linear-gradient(45deg,#e9edf1 25%,transparent 25%,transparent 75%,#e9edf1 75%),linear-gradient(45deg,#e9edf1 25%,#fff 25%,#fff 75%,#e9edf1 75%);background-size:20px 20px;background-position:0 0,10px 10px}
.b3Stage canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
.b3Views{position:absolute;left:8px;right:8px;top:8px;display:flex;gap:6px;overflow-x:auto;z-index:2}
.b3Views button{border:0;border-radius:16px;padding:7px 12px;font-size:12.5px;background:#ffffffe6;box-shadow:0 1px 4px #0003;color:#33414d;white-space:nowrap}
.b3Hint{position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:11.5px;color:#4b5967;pointer-events:none;text-shadow:0 0 4px #fff}
.sheet.b3Panel{border-radius:18px 18px 0 0;padding:6px 14px 12px;max-height:40vh;overflow:auto;box-shadow:0 -4px 14px #0002;flex:0 0 auto}
.b3Tabs{display:flex;gap:6px;position:sticky;top:-6px;background:#f7f9fc;padding:6px 0 8px;z-index:3}
.b3Tabs button{flex:1;border:0;border-radius:10px;padding:10px 4px;font-size:13.5px;background:#edf1f4;color:#526170}
.b3Tabs button.active{background:#dcecf9;color:#147bd1;font-weight:700;box-shadow:inset 0 -3px #1682db}
.b3Row{display:flex;align-items:center;gap:10px;margin:7px 0}.b3Row label{flex:0 0 96px;font-size:12.5px;color:#455564}.b3Row output{flex:0 0 46px;text-align:right;font-size:12px;color:#147bd1;font-variant-numeric:tabular-nums}
.sheet .b3Row input[type=range]{flex:1;width:auto;margin:0;padding:0;border:0;height:30px;accent-color:#147bd1}
.b3Btns{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.sheet .b3Btns button{margin:0;padding:10px 12px;border-radius:10px;background:#eef2f6;font-size:13px;color:#33414d}
.sheet .b3Btns button.on{background:#dcecf9;outline:2px solid #147bd1;color:#147bd1}
.b3Note{font-size:11.5px;color:#64748b;margin:6px 0;line-height:1.45}
.b3Bg{position:absolute;left:8px;right:8px;top:8px;display:none;flex-direction:column;gap:5px;z-index:3;background:#fffffff2;border-radius:14px;padding:8px 10px;box-shadow:0 2px 8px #0003}
.b3Bg .r1,.b3Bg .r2{display:flex;align-items:center;gap:8px}
.b3Bg .r1 span.t{flex:1;font-size:12.5px;color:#33414d;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b3Bg .sw{width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1px #94a3b8;flex:0 0 auto;background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 50%/8px 8px}
.b3Bg button{border:0;border-radius:8px;height:28px;padding:0 10px;background:#e9edf2;color:#33414d;font-size:12.5px}
.b3Bg label{font-size:12.5px;color:#455564;font-weight:700}
.b3Bg input[type=range]{flex:1;min-width:0;height:28px;margin:0;accent-color:#147bd1}
.b3Bg output{flex:0 0 40px;text-align:right;font-size:13px;color:#147bd1;font-weight:700;font-variant-numeric:tabular-nums}
`;
  document.head.appendChild(css);

  /* ------------------------------ icons ------------------------------ */
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><rect x="6" y="2.5" width="12" height="19" rx="2"/><rect x="9" y="6" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><path d="M9 15.5h6M9 18.2h6"/></svg>';

  /* ------------------------------ state ------------------------------ */
  let S = Object.assign({}, DEF);       // current editor settings
  let base = null, T = null, Tp = null; // base canvas, transformed canvas, preview of T
  let PL = null;                        // cached preview layers
  let ctxInfo = null;                   // {typeId,label,file,url,kind,srcId,idx}
  let tab = 'color', ui = null, raf = 0, interacting = false, settleTimer = 0, tainted = false;
  let cropBox = null, cropDrag = null, drag = null, pinch0 = null, vel = { x: 0, y: 0 }, inertiaRaf = 0, tweenRaf = 0, lastMove = 0;
  const ptrs = new Map();
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);


  /* ============================== BACKGROUND REMOVAL (auto + manual) ============================== */
  let srcD = null, outD = null, bpCv = null, autoKeep = null, man = null, manDirty = false, bgUndo = [];
  let bgTool = 'pick', bgView = { z: 1, x: 0, y: 0 }, bgCur = null, bgSt = null, T0 = null, bgTok = 0, bgAutoRaf = 0, bgFlushRaf = 0, bgDirty = null;
  const hex2 = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

  function bgInit() {
    srcD = outD = bpCv = autoKeep = man = T0 = null; manDirty = false; bgUndo = []; bgSt = null; bgCur = null; bgDirty = null; bgTool = 'pick';
    try { srcD = base.getContext('2d').getImageData(0, 0, base.width, base.height); } catch (e) { tainted = true; srcD = null; return; }
    const W = base.width, H = base.height, n = W * H;
    outD = new ImageData(new Uint8ClampedArray(srcD.data), W, H);
    bpCv = mk(W, H); autoKeep = new Uint8Array(n).fill(255); man = new Uint8Array(n).fill(128);
    bgComputeAuto(false);
    if (S.mask) {
      const tok = ++bgTok, im = new Image();
      im.onload = () => {
        if (tok !== bgTok || !man) return;
        const c = mk(W, H), g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
        let d; try { d = g.getImageData(0, 0, W, H).data; } catch (e) { return; }
        for (let i = 0; i < n; i++) man[i] = d[i * 4];
        manDirty = true; bgCombine(0, 0, W, H); bgRefresh();
      };
      im.src = S.mask;
    }
  }
  function bgRefresh() { if (!base) return; buildT(); PL = null; scheduleRender(); }

  /* auto layer: color distance (+ optional flood fill from the tapped spots) */
  function bgComputeAuto(refresh) {
    if (!srcD) return;
    const W = base.width, H = base.height, n = W * H, d = srcD.data;
    autoKeep.fill(255);
    if (S.bgOn) {
      const tr = parseInt(S.bgCol.slice(1, 3), 16), tg = parseInt(S.bgCol.slice(3, 5), 16), tb = parseInt(S.bgCol.slice(5, 7), 16);
      const thr = 442 * Math.pow(S.bgTol / 100, 1.5), f = thr * S.bgSoft / 100, lo = Math.max(0, thr - f), thr2 = thr * thr, lo2 = lo * lo;
      const dist2 = i => { const q = i * 4, a = d[q] - tr, b = d[q + 1] - tg, c = d[q + 2] - tb; return a * a + b * b + c * c; };
      const keepOf = d2 => d2 <= lo2 ? 0 : d2 > thr2 ? 255 : f <= .01 ? 0 : clamp(255 * (Math.sqrt(d2) - lo) / f, 0, 255);
      if (!S.bgEdge) {
        for (let i = 0; i < n; i++) { if (d[i * 4 + 3] < 10) continue; autoKeep[i] = keepOf(dist2(i)); }
      } else {
        const reg = new Uint8Array(n), q = new Int32Array(n); let qh = 0, qt = 0;
        const ok = i => d[i * 4 + 3] < 10 || dist2(i) <= thr2;
        for (const sd of S.bgSeeds) {
          const x = clamp(Math.round(sd[0] * (W - 1)), 0, W - 1), y = clamp(Math.round(sd[1] * (H - 1)), 0, H - 1), i = y * W + x;
          if (!reg[i] && ok(i)) { reg[i] = 1; q[qt++] = i; }
        }
        while (qh < qt) {
          const i = q[qh++], x = i % W; let j;
          if (x > 0) { j = i - 1; if (!reg[j] && ok(j)) { reg[j] = 1; q[qt++] = j; } }
          if (x < W - 1) { j = i + 1; if (!reg[j] && ok(j)) { reg[j] = 1; q[qt++] = j; } }
          if (i >= W) { j = i - W; if (!reg[j] && ok(j)) { reg[j] = 1; q[qt++] = j; } }
          if (i < n - W) { j = i + W; if (!reg[j] && ok(j)) { reg[j] = 1; q[qt++] = j; } }
        }
        for (let k = 0; k < qt; k++) { const i = q[k]; if (d[i * 4 + 3] < 10) continue; autoKeep[i] = keepOf(dist2(i)); }
      }
    }
    bgCombine(0, 0, W, H);
    if (refresh) bgRefresh();
  }
  function bgAutoSoon() { if (bgAutoRaf) return; bgAutoRaf = requestAnimationFrame(() => { bgAutoRaf = 0; bgComputeAuto(true); }); }

  /* final alpha = original alpha × auto layer × manual layer (128 = untouched, <128 erased, >128 restored) */
  function bgCombine(x0, y0, x1, y1) {
    if (!srcD) return;
    const W = base.width, s = srcD.data, o = outD.data;
    for (let y = y0; y < y1; y++) {
      let i = y * W + x0;
      for (let x = x0; x < x1; x++, i++) {
        const ak = autoKeep[i], m = man[i];
        const k = m === 128 ? ak : m < 128 ? ak * m / 128 : ak + (255 - ak) * (m - 128) / 127;
        o[i * 4 + 3] = s[i * 4 + 3] * k / 255;
      }
    }
    bpCv.getContext('2d').putImageData(outD, 0, 0, x0, y0, x1 - x0, y1 - y0);
  }
  function bgMark(x0, y0, x1, y1) {
    if (!bgDirty) bgDirty = { x0, y0, x1, y1 };
    else { bgDirty.x0 = Math.min(bgDirty.x0, x0); bgDirty.y0 = Math.min(bgDirty.y0, y0); bgDirty.x1 = Math.max(bgDirty.x1, x1); bgDirty.y1 = Math.max(bgDirty.y1, y1); }
    if (!bgFlushRaf) bgFlushRaf = requestAnimationFrame(bgFlush);
  }
  function bgFlush() {
    bgFlushRaf = 0; if (!bgDirty || !srcD) { bgDirty = null; return; }
    const r = bgDirty; bgDirty = null; bgCombine(r.x0, r.y0, r.x1, r.y1); buildT(); PL = null; renderNow();
  }

  /* view geometry (canvas px) */
  function bgFit() {
    const W = ui.cv.width, H = ui.cv.height, m = 14 * dpr(), top = 84 * dpr(), availH = Math.max(40, H - top - m);
    return { fit: Math.min((W - 2 * m) / T.width, availH / T.height), bx: W / 2, by: top + availH / 2 };
  }
  function bgGeom() { const g = bgFit(), s = g.fit * bgView.z; return { s, cx: g.bx + bgView.x, cy: g.by + bgView.y }; }
  function toBase(px, py) {
    const { s, cx, cy } = bgGeom(); let x = (px - cx) / s, y = (py - cy) / s;
    if (S.fh) x = -x; if (S.fv) y = -y;
    const a = -(S.rot % 4), c = Math.round(Math.cos(a * Math.PI / 2)), sn = Math.round(Math.sin(a * Math.PI / 2));
    return { x: x * c - y * sn + base.width / 2, y: x * sn + y * c + base.height / 2 };
  }
  function bgZoomAt(px, py, k) {
    const g = bgFit(), s0 = g.fit * bgView.z, z1 = clamp(bgView.z * k, .6, 14), s1 = g.fit * z1;
    const ix = (px - (g.bx + bgView.x)) / s0, iy = (py - (g.by + bgView.y)) / s0;
    bgView.z = z1; bgView.x = px - ix * s1 - g.bx; bgView.y = py - iy * s1 - g.by; scheduleRender();
  }
  function getT0() {
    if (T0) return T0;
    const bw = base.width, bh = base.height, r = S.rot % 4, odd = r % 2 === 1, w = odd ? bh : bw, h = odd ? bw : bh;
    const c = mk(w, h), g = c.getContext('2d');
    g.translate(w / 2, h / 2); g.scale(S.fh ? -1 : 1, S.fv ? -1 : 1); g.rotate(r * Math.PI / 2); g.drawImage(base, -bw / 2, -bh / 2);
    return (T0 = c);
  }
  function drawBg(g, W, H) {
    if (!T) return;
    const { s, cx, cy } = bgGeom(), w = T.width * s, h = T.height * s, ox = cx - w / 2, oy = cy - h / 2;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (bgTool === 'restore') { g.globalAlpha = .3; g.drawImage(getT0(), ox, oy, w, h); g.globalAlpha = 1; }
    g.drawImage(T, ox, oy, w, h);
    g.lineWidth = dpr(); g.strokeStyle = 'rgba(20,123,209,.55)'; g.setLineDash([6 * dpr(), 4 * dpr()]); g.strokeRect(ox, oy, w, h); g.setLineDash([]);
    if (bgCur && bgTool !== 'pick') {
      const r = S.bSize / 2 * dpr();
      g.lineWidth = 2 * dpr(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.beginPath(); g.arc(bgCur.x, bgCur.y, r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = dpr(); g.strokeStyle = bgTool === 'erase' ? '#ff4d4d' : '#22c55e'; g.beginPath(); g.arc(bgCur.x, bgCur.y, r, 0, Math.PI * 2); g.stroke();
    }
  }

  /* tools */
  function bgPick(px, py) {
    const b = toBase(px, py), W = base.width, H = base.height, x = Math.floor(b.x), y = Math.floor(b.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, d = srcD.data;
    if (d[i + 3] < 10) { toast('That spot is already transparent'); return; }
    const seed = [x / (W - 1), y / (H - 1)];
    const near = S.bgOn && Math.hypot(d[i] - parseInt(S.bgCol.slice(1, 3), 16), d[i + 1] - parseInt(S.bgCol.slice(3, 5), 16), d[i + 2] - parseInt(S.bgCol.slice(5, 7), 16)) <= 442 * Math.pow(S.bgTol / 100, 1.5);
    if (near && S.bgEdge) S.bgSeeds = S.bgSeeds.concat([seed]).slice(-12);
    else { S.bgCol = hex2(d[i], d[i + 1], d[i + 2]); S.bgSeeds = [seed]; }
    S.bgOn = 1; if (S.bgTol < 5) S.bgTol = 20;
    bgSyncUI(); bgComputeAuto(true);
  }
  function bgAutoDetect() {
    if (!srcD) return;
    const W = base.width, H = base.height, d = srcD.data, P = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
    const cols = P.map(([px, py]) => {
      let r = 0, g = 0, b = 0, c = 0;
      for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 5; dx++) {
        const x = px === 0 ? dx : W - 1 - dx, y = py === 0 ? dy : H - 1 - dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4; if (d[i + 3] < 10) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; c++;
      }
      return c ? [r / c, g / c, b / c, px, py] : null;
    }).filter(Boolean);
    if (!cols.length) { toast('Background is already transparent'); return; }
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 50;
    let best = cols[0], bc = 0; cols.forEach(a => { const c = cols.filter(b => near(a, b)).length; if (c > bc) { bc = c; best = a; } });
    const grp = cols.filter(b => near(best, b)), av = [0, 1, 2].map(k => grp.reduce((t, q) => t + q[k], 0) / grp.length);
    S.bgCol = hex2(av[0], av[1], av[2]); S.bgSeeds = grp.map(q => [q[3] / (W - 1), q[4] / (H - 1)]); S.bgOn = 1; if (S.bgTol < 8) S.bgTol = 20;
    bgSyncUI(); bgComputeAuto(true);
    toast('Background found · use the % bar to remove more or less');
  }
  function bgPaint(b0, b1) {
    const W = base.width, H = base.height, rd = Math.max(.6, (S.bSize / 2 * dpr()) / bgGeom().s), hard = S.bHard / 100 * .92, inner = rd * hard, target = bgTool === 'erase' ? 0 : 255;
    const step = Math.max(.7, rd * .28), dist = b0 ? Math.hypot(b1.x - b0.x, b1.y - b0.y) : 0, cnt = b0 ? Math.max(1, Math.ceil(dist / step)) : 1;
    let X0 = W, Y0 = H, X1 = 0, Y1 = 0;
    for (let k = 1; k <= cnt; k++) {
      const t = b0 ? k / cnt : 1, cx = b0 ? b0.x + (b1.x - b0.x) * t : b1.x, cy = b0 ? b0.y + (b1.y - b0.y) * t : b1.y;
      const x0 = Math.max(0, Math.floor(cx - rd)), x1 = Math.min(W, Math.ceil(cx + rd) + 1), y0 = Math.max(0, Math.floor(cy - rd)), y1 = Math.min(H, Math.ceil(cy + rd) + 1);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const dd = Math.hypot(x + .5 - cx, y + .5 - cy); if (dd > rd) continue;
        let st = dd <= inner ? 1 : 1 - (dd - inner) / (rd - inner + 1e-6); st = st * st * (3 - 2 * st);
        const i = y * W + x; man[i] = Math.round(man[i] + (target - man[i]) * st);
      }
      X0 = Math.min(X0, x0); Y0 = Math.min(Y0, y0); X1 = Math.max(X1, x1); Y1 = Math.max(Y1, y1);
    }
    manDirty = true; if (X1 > X0) bgMark(X0, Y0, X1, Y1);
  }
  function bgUndoStroke() {
    if (!man || !bgUndo.length) { toast('Nothing to undo'); return; }
    man.set(bgUndo.pop()); manDirty = man.some(v => v !== 128); bgComputeAuto(true);
  }
  function bgManualReset() { if (!man) return; bgUndo.push(man.slice()); if (bgUndo.length > 15) bgUndo.shift(); man.fill(128); manDirty = false; bgComputeAuto(true); }
  function bgSerialize() {
    if (!man || !manDirty || !man.some(v => v !== 128)) return '';
    try {
      const W = base.width, H = base.height, c = mk(W, H), g = c.getContext('2d'), id = g.createImageData(W, H), d = id.data;
      for (let i = 0; i < W * H; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = man[i]; d[i * 4 + 3] = 255; }
      g.putImageData(id, 0, 0); const u = c.toDataURL('image/png'); return u.length < 900000 ? u : '';
    } catch (e) { return ''; }
  }

  /* pointers (only in the BG tab): tap = pick · drag = paint or move · two fingers = move & zoom */
  const cpt = p => { const r = ui.cv.getBoundingClientRect(); return { x: (p.x - r.left) * ui.cv.width / r.width, y: (p.y - r.top) * ui.cv.height / r.height }; };
  function bgGesture() {
    const v = [...ptrs.values()].map(cpt), mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 }, d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1;
    const g = bgFit(), s = g.fit * bgView.z;
    bgSt = { m: 'gest', d0: d, z0: bgView.z, ix: (mid.x - (g.bx + bgView.x)) / s, iy: (mid.y - (g.by + bgView.y)) / s };
  }
  function bgDown(e) {
    if (!srcD || !T) return;
    if (ptrs.size >= 2) { bgDirty && bgFlush(); bgCur = null; bgGesture(); scheduleRender(); return; }
    const p = canvasPt(e); bgCur = p;
    if (bgTool === 'pick') { bgSt = { m: 'tap', p0: p, vx: bgView.x, vy: bgView.y, moved: false }; scheduleRender(); return; }
    bgUndo.push(man.slice()); if (bgUndo.length > 15) bgUndo.shift();
    const b = toBase(p.x, p.y); bgSt = { m: 'paint', last: b }; bgPaint(null, b); scheduleRender();
  }
  function bgMove(e) {
    if (!srcD || !T || !bgSt) return;
    if (bgSt.m === 'gest' && ptrs.size >= 2) {
      const v = [...ptrs.values()].map(cpt), mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 }, d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1;
      const g = bgFit(), z1 = clamp(bgSt.z0 * d / bgSt.d0, .6, 14), s1 = g.fit * z1;
      bgView.z = z1; bgView.x = mid.x - bgSt.ix * s1 - g.bx; bgView.y = mid.y - bgSt.iy * s1 - g.by; scheduleRender(); return;
    }
    const p = canvasPt(e); bgCur = p;
    if (bgSt.m === 'tap') {
      if (Math.hypot(p.x - bgSt.p0.x, p.y - bgSt.p0.y) > 8 * dpr()) bgSt.moved = true;
      if (bgSt.moved) { bgView.x = bgSt.vx + (p.x - bgSt.p0.x); bgView.y = bgSt.vy + (p.y - bgSt.p0.y); }
      scheduleRender(); return;
    }
    if (bgSt.m === 'paint') { const b = toBase(p.x, p.y); bgPaint(bgSt.last, b); bgSt.last = b; scheduleRender(); }
  }
  function bgUp(e) {
    if (bgSt && bgSt.m === 'tap' && !bgSt.moved && ptrs.size === 0 && srcD && T) { const p = canvasPt(e); bgPick(p.x, p.y); }
    if (ptrs.size === 0) { bgSt = null; bgCur = null; bgDirty && bgFlush(); }
    else bgSt = { m: 'none' };
    scheduleRender();
  }

  /* panel + strip */
  function buildBgPanel(body) {
    const pb = document.createElement('div'); pb.dataset.p = 'bg'; pb.style.display = 'none';
    pb.innerHTML = `<div class="b3Btns" id="bgTools"><button type="button" data-bt="pick">🎯 Auto · tap color</button><button type="button" data-bt="erase">🖌 Erase</button><button type="button" data-bt="restore">↩ Restore</button></div>
      <div id="bgSecAuto"></div><div id="bgSecBrush"></div><div class="b3Note" id="bgNote"></div>`;
    body.appendChild(pb);
    const sa = $('#bgSecAuto', pb), sb = $('#bgSecBrush', pb);
    sa.insertAdjacentHTML('beforeend', `<div class="b3Btns"><button type="button" id="bgAutoBtn">✨ Auto detect</button><button type="button" id="bgEdgeBtn"></button><button type="button" id="bgClrBtn">↺ Reset auto</button></div>`);
    sa.appendChild(slider('Edge softness', 'bgSoft', 0, 60, '%', bgAutoSoon));
    sb.appendChild(slider('Brush size', 'bSize', 4, 200, 'px', scheduleRender));
    sb.appendChild(slider('Hardness', 'bHard', 0, 100, '%', scheduleRender));
    sb.insertAdjacentHTML('beforeend', `<div class="b3Btns"><button type="button" id="bgUndoBtn">↶ Undo stroke</button><button type="button" id="bgManClr">↺ Reset brush work</button></div>`);
    pb.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { bgTool = b.dataset.bt; bgCur = null; bgSyncUI(); scheduleRender(); });
    $('#bgAutoBtn', pb).onclick = bgAutoDetect;
    $('#bgEdgeBtn', pb).onclick = () => { S.bgEdge = S.bgEdge ? 0 : 1; bgSyncUI(); bgComputeAuto(true); };
    $('#bgClrBtn', pb).onclick = () => { S.bgOn = 0; S.bgSeeds = []; bgSyncUI(); bgComputeAuto(true); };
    $('#bgUndoBtn', pb).onclick = bgUndoStroke;
    $('#bgManClr', pb).onclick = bgManualReset;
    bgSyncUI();
  }
  function bgSyncUI() {
    if (!ui) return;
    const r = ui.root, pct = $('#bgPct', r); if (!pct) return;
    pct.value = S.bgTol; $('#bgPctOut', r).textContent = Math.round(S.bgTol) + '%';
    const sw = $('#bgSw', r), tx = $('#bgTxt', r), off = $('#bgOff', r);
    if (S.bgOn) { sw.style.background = S.bgCol; tx.textContent = 'Removing ' + S.bgCol.toUpperCase() + ' · ' + Math.round(S.bgTol) + '%'; off.style.display = ''; }
    else { sw.style.background = ''; tx.textContent = bgTool === 'pick' ? 'Tap the background color on the picture' : (bgTool === 'erase' ? 'Brush: drag to erase' : 'Brush: drag to restore'); off.style.display = 'none'; }
    r.querySelectorAll('[data-bt]').forEach(b => b.classList.toggle('on', b.dataset.bt === bgTool));
    const sa = $('#bgSecAuto', r), sb = $('#bgSecBrush', r); if (sa) sa.style.display = bgTool === 'pick' ? 'block' : 'none'; if (sb) sb.style.display = bgTool === 'pick' ? 'none' : 'block';
    const eb = $('#bgEdgeBtn', r); if (eb) eb.textContent = S.bgEdge ? '◎ Connected only' : '◎ Whole picture';
    const nt = $('#bgNote', r); if (nt) nt.textContent = bgTool === 'pick'
      ? 'Tap a color (e.g. white) to remove it. Use the % bar at the top to remove more or less. “Connected only” keeps same-colored parts inside the object; “Whole picture” removes that color everywhere. Drag = move · two fingers = zoom.'
      : 'Drag on the picture to ' + (bgTool === 'erase' ? 'erase' : 'bring back') + ' parts. Two fingers = move & zoom. Change brush size / hardness above.';
    if (tab === 'bg') ui.hint.textContent = bgTool === 'pick' ? 'Tap a background color · drag to move · pinch to zoom' : 'Drag to ' + (bgTool === 'erase' ? 'erase' : 'restore') + ' · two fingers to move / zoom';
  }

  /* ------------------------------ toolbar button ------------------------------ */
  const btn = document.getElementById('breakerBtn');
  if (btn) btn.onclick = () => openGallery('all');
  const toolsBar = document.getElementById('tools');
  // Keep the complete requested catalog directly visible on the horizontal toolbar.
  const moreTypes = TYPES.filter(t => !['all','lamp','contactor','overload','timer','meter','more'].includes(t.id));
  [['lampBtn', 'lamp'], ['contactorBtn', 'contactor'], ['overloadBtn', 'overload'], ['timerBtn', 'timer'], ['meterBtn', 'meter']].forEach(([el, id]) => { const b2 = document.getElementById(el); if (b2) b2.onclick = () => openGallery(id); });
  moreTypes.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.title = t.name;
    const svg = t.icon ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t.icon + '</svg>' : '';
    b.innerHTML = svg + '<small>' + esc(t.name) + '</small>';
    b.onclick = () => openGallery(t.id);
    if (toolsBar) toolsBar.appendChild(b);
  });
  // Keep MORE available as a catalog as well as keeping its PNG categories
  // directly accessible on the main horizontal toolbar.
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'tile';
  moreBtn.id = 'morePartsBtn';
  moreBtn.title = 'More electrical parts';
  moreBtn.innerHTML = '<span aria-hidden="true">⋯</span><small>MORE</small>';
  moreBtn.onclick = () => openGallery('more');
  if (toolsBar) toolsBar.appendChild(moreBtn);

  /* ============================== SHEET 2: PNG list ============================== */
  let galTarget = null;
  function openGallery(id) {
    const ty = TYPES.find(t => t.id === id);
    if (!ty) { toast('Image library not found'); return; }
    show(`<div class="brkHint" id="brkHint" style="margin:0 0 4px"></div>
      <label for="brkGalIn" class="pickLbl primary" style="padding:10px;margin:8px 0 2px">🖼 Open PNG / JPG from phone gallery</label>
      <div class="brkGrid" id="brkGrid"></div><div class="row"><button id="close">Close</button></div>`, (sh, ov) => {
      galTarget = ty;
      const grid = sh.querySelector('#brkGrid'), hint = sh.querySelector('#brkHint');
      let pending = ty.files.length, found = 0;
      const finished = () => {
        if (--pending > 0) return;
        hint.textContent = found ? '' : 'Empty — add PNG or JPG files to ' + ty.dir;
      };
      // each slot accepts .png, .jpg, .jpeg or .webp (first one that exists is used)
      const EXTS = ['png', 'jpg', 'jpeg', 'webp'];
      ty.files.forEach(f => {
        const base = f.replace(/\.[^.\/]+$/, '');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'brkTile'; b.style.display = 'none';
        const im = new Image();
        im.alt = '';
        let ei = 0, url = '';
        const tryNext = () => {
          if (ei >= EXTS.length) { b.remove(); finished(); return; }
          url = ty.dir + encodeURI(base + '.' + EXTS[ei++]);
          im.src = url;
        };
        im.onload = () => { b.style.display = ''; found++; finished(); };
        im.onerror = tryNext;
        tryNext();
        b.appendChild(im);
        b.onclick = () => {
          ov.style.display = 'none';
          openEditor({ title: '3D', img: im, meta: { k: 'file', t: ty.id, u: url, label: ty.name || 'Breaker' } });
        };
        grid.appendChild(b);
      });
    });
  }

  /* ============================== gallery file input ============================== */
  const gal = document.createElement('input');
  gal.type = 'file'; gal.accept = 'image/png,image/jpeg,image/webp,image/*'; gal.id = 'brkGalIn'; gal.tabIndex = -1;
  gal.setAttribute('aria-hidden', 'true');
  gal.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
  document.body.appendChild(gal);
  gal.addEventListener('change', () => {
    const f = gal.files && gal.files[0]; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      document.getElementById('overlay').style.display = 'none';
      openEditor({ title: '3D', img: im, meta: { k: 'gallery', t: galTarget ? galTarget.id : '', label: galTarget && galTarget.name || 'Breaker' } });
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('Could not read this image'); };
    im.src = url; gal.value = '';
  });

  /* ============================== editing an existing item ============================== */
  window.brkEdit = function (idx) {
    const o = items[idx]; if (!o || !o.brk || typeof o.brk !== 'object') return false;
    const b = o.brk, set = cleanSet(b.set);
    const open = (img, meta) => openEditor({ title: '3D', img, meta, set, idx });
    const im = new Image();
    if (b.k === 'file' && typeof b.u === 'string' && /^[\w-]+\/[\w-]+\/[^\\:?#]+\.(png|jpe?g|webp)$/i.test(b.u) && b.u.indexOf('..') < 0) {
      im.onload = () => open(im, { k: 'file', t: String(b.t || ''), u: b.u, label: String(b.label || 'Breaker') });
      im.onerror = () => toast('Source image not found: ' + b.u);
      im.src = b.u;
    } else if (b.k === 'gallery' && typeof b.srcId === 'string' && imgStore[b.srcId]) {
      im.onload = () => open(im, { k: 'gallery', t: String(b.t || ''), srcId: b.srcId, label: String(b.label || 'Breaker') });
      im.onerror = () => toast('Source image could not be read');
      im.src = imgStore[b.srcId];
    } else { toast('Original image is not available for 3D editing'); return false; }
    return true;
  };

  /* edit a plain photo (not made from a part) with the same color / crop / background tools */
  window.brkEditPhoto = function (idx) {
    const o = items[idx]; if (!o || o.type !== 'image' || !imgStore[o.imgId]) return false;
    const im = new Image();
    im.onload = () => openEditor({ title: '3D', img: im, meta: { k: 'gallery', t: '', srcId: o.imgId, label: o.name || 'Photo' }, set: { thick: 0, shadow: 0 }, idx });
    im.onerror = () => toast('Could not read this photo');
    im.src = imgStore[o.imgId]; return true;
  };

  /* ============================== editor: build UI ============================== */
  function ensureUI() {
    if (ui) return ui;
    const root = document.createElement('div'); root.className = 'b3d'; root.id = 'b3d';
    root.innerHTML = `
      <div class="b3Head"><button type="button" id="b3Back">← Back</button><b id="b3Title">3D</b><button type="button" id="b3Ok" class="primary">✓ Add</button></div>
      <div class="b3Stage" id="b3Stage"><canvas id="b3Cv"></canvas>
        <div class="b3Views">
          <button data-v="front">Front</button><button data-v="back">Back</button><button data-v="l">◀ 3D</button><button data-v="r">3D ▶</button><button data-v="top">Top</button><button data-v="bottom">Bottom</button><button data-v="reset">⟲ Reset</button>
        </div>
        <div class="b3Bg" id="b3Bg"><div class="r1"><span class="sw" id="bgSw"></span><span class="t" id="bgTxt"></span><button type="button" id="bgOff">✕ Off</button></div><div class="r2"><label>Remove</label><input type="range" id="bgPct" min="0" max="100" step="1"><output id="bgPctOut"></output></div></div>
        <div class="b3Hint" id="b3Hint">Drag with finger to rotate · pinch to zoom</div></div>
      <div class="sheet b3Panel" id="b3Panel">
        <div class="b3Tabs"><button data-tab="color">🎨 Color</button><button data-tab="crop">✂ Crop</button><button data-tab="d3">◈ 3D</button><button data-tab="bg">🧽 BG</button></div>
        <div id="b3Body"></div>
      </div>`;
    document.body.appendChild(root);
    ui = { root, cv: $('#b3Cv', root), stage: $('#b3Stage', root), hint: $('#b3Hint', root), title: $('#b3Title', root), body: $('#b3Body', root), panel: $('#b3Panel', root) };

    $('#b3Back', root).onclick = () => { closeEditor(); if (galTarget) openGallery(galTarget.id); else openGallery('more'); };
    $('#b3Ok', root).onclick = commit;
    $('#bgPct', root).addEventListener('input', e => { S.bgTol = +e.target.value; if (!S.bgOn && S.bgSeeds.length) S.bgOn = 1; bgSyncUI(); bgAutoSoon(); });
    $('#bgOff', root).onclick = () => { S.bgOn = 0; S.bgSeeds = []; bgSyncUI(); bgComputeAuto(true); };
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
    root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const v = b.dataset.v;
      if (tab === 'crop') setTab('d3');
      if (v === 'front') tweenTo(0, 0); else if (v === 'back') tweenTo(180, 0);
      else if (v === 'l') tweenTo(35, -12); else if (v === 'r') tweenTo(-35, -12);
      else if (v === 'top') tweenTo(0, -60); else if (v === 'bottom') tweenTo(0, 60);
      else tweenTo(DEF.yaw, DEF.pitch, 1);
    });
    wirePointers(ui.cv);
    if (window.ResizeObserver) new ResizeObserver(sizeCanvas).observe(ui.stage); else window.addEventListener('resize', sizeCanvas);
    return ui;
  }

  function sizeCanvas() {
    if (!ui) return;
    const r = ui.stage.getBoundingClientRect(), d = dpr();
    const w = Math.max(10, Math.round(r.width * d)), h = Math.max(10, Math.round(r.height * d));
    if (ui.cv.width !== w || ui.cv.height !== h) { ui.cv.width = w; ui.cv.height = h; }
    scheduleRender();
  }

  /* ----- panel bodies ----- */
  function slider(label, key, min, max, unit, onInput) {
    const row = document.createElement('div'); row.className = 'b3Row';
    row.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="1"><output></output>`;
    const inp = row.querySelector('input'), out = row.querySelector('output');
    const show_ = () => { out.textContent = Math.round(S[key]) + (unit || ''); };
    inp.value = S[key]; show_();
    inp.addEventListener('input', () => { S[key] = +inp.value; show_(); onInput && onInput(); });
    row._sync = () => { inp.value = S[key]; show_(); };
    return row;
  }
  const dirty = () => { PL = null; scheduleRender(); };

  function buildBody() {
    const body = ui.body; body.innerHTML = '';
    /* ---- COLOR ---- */
    const pc = document.createElement('div'); pc.dataset.p = 'color';
    const rows = [
      slider('Hue', 'hue', -180, 180, '°', dirty), slider('Saturation', 'sat', 0, 200, '%', dirty),
      slider('Brightness', 'bri', 20, 200, '%', dirty), slider('Contrast', 'con', 20, 200, '%', dirty)
    ];
    rows.forEach(r => pc.appendChild(r));
    const tintBox = document.createElement('div'); tintBox.innerHTML = pickerHTML('btint', 'Tint / recolor', false);
    pc.appendChild(tintBox);
    const ta = slider('Tint amount', 'tintAmt', 0, 100, '%', dirty); pc.appendChild(ta);
    const rm = slider('Remove white', 'rm', 0, 60, '', dirty); pc.appendChild(rm);
    const note = document.createElement('div'); note.className = 'b3Note'; note.textContent = 'Tint recolors the picture while keeping its shading. "Remove white" makes a white background transparent.'; pc.appendChild(note);
    const rb = document.createElement('div'); rb.className = 'b3Btns'; rb.innerHTML = '<button type="button" id="b3ColReset">↺ Reset colors</button>'; pc.appendChild(rb);
    body.appendChild(pc);
    wirePicker(ui.panel, 'btint', S.tint, false, c => { S.tint = c; if (S.tintAmt === 0) { S.tintAmt = 60; ta._sync(); } dirty(); }, () => { });
    $('#b3ColReset', pc).onclick = () => {
      ['hue', 'sat', 'bri', 'con', 'rm', 'tintAmt'].forEach(k => S[k] = DEF[k]); rows.concat([ta, rm]).forEach(r => r._sync()); dirty();
    };

    /* ---- CROP ---- */
    const pk = document.createElement('div'); pk.dataset.p = 'crop'; pk.style.display = 'none';
    pk.innerHTML = `<div class="b3Note">Drag the corners / edges on the picture to crop. Drag inside to move the crop box.</div>
      <div class="b3Btns"><button type="button" data-c="trim">⛶ Auto trim</button><button type="button" data-c="reset">↺ Reset crop</button><button type="button" data-c="rot">⟳ Rotate 90°</button><button type="button" data-c="fh">⇋ Flip ↔</button><button type="button" data-c="fv">⇅ Flip ↕</button></div>`;
    body.appendChild(pk);
    pk.querySelectorAll('[data-c]').forEach(b => b.onclick = () => cropAction(b.dataset.c));

    /* ---- 3D ---- */
    const p3 = document.createElement('div'); p3.dataset.p = 'd3'; p3.style.display = 'none';
    p3.appendChild(slider('Thickness', 'thick', 0, 60, '%', scheduleRender));
    p3.insertAdjacentHTML('beforeend', `<div class="b3Btns" id="b3Side"><button type="button" data-s="auto">Sides: same as picture</button><button type="button" data-s="solid">Sides: solid color</button></div>
      <div id="b3SideCol">${pickerHTML('bside', 'Side / back color', false)}</div>
      <div class="b3Btns"><button type="button" id="b3Shadow">▬ Floor shadow</button></div>
      <div class="b3Note">Move your finger on the picture to turn it front / back / any side. Two fingers = zoom. Use the buttons at the top for quick views.</div>`);
    body.appendChild(p3);
    wirePicker(ui.panel, 'bside', S.sideColor, false, c => { S.sideColor = c; if (S.side !== 'solid') { S.side = 'solid'; syncSide(); } dirty(); }, () => { });
    p3.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.side = b.dataset.s; syncSide(); dirty(); });
    $('#b3Shadow', p3).onclick = () => { S.shadow = S.shadow ? 0 : 1; syncSide(); scheduleRender(); };
    ui.sliders3 = p3.querySelector('.b3Row');
    buildBgPanel(body);
    syncSide();
  }
  function syncSide() {
    if (!ui) return;
    ui.body.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === S.side));
    const sh = $('#b3Shadow', ui.body); if (sh) sh.classList.toggle('on', !!S.shadow);
    const sc = $('#b3SideCol', ui.body); if (sc) sc.style.display = S.side === 'solid' ? 'block' : 'none';
  }
  function setTab(t) {
    tab = t;
    ui.root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    ui.body.querySelectorAll('[data-p]').forEach(p => p.style.display = p.dataset.p === t ? 'block' : 'none');
    const vw = ui.stage.querySelector('.b3Views'); if (vw) vw.style.display = (t === 'crop' || t === 'bg') ? 'none' : 'flex';
    const bs = $('#b3Bg', ui.root); if (bs) bs.style.display = t === 'bg' ? 'flex' : 'none';
    if (t === 'bg') { bgView = { z: 1, x: 0, y: 0 }; bgSyncUI(); if (tainted || !srcD) ui.hint.textContent = '⚠ Open the app through http/https (not file://) so background tools can work'; }
    else ui.hint.textContent = t === 'crop' ? 'Crop: drag the handles' : 'Drag with finger to rotate · pinch to zoom';
    if (t !== 'crop') PL = null;
    cancelInertia(); scheduleRender();
  }

  /* ============================== open / close ============================== */
  function openEditor(o) {
    ensureUI();
    ctxInfo = { meta: o.meta, idx: o.idx === undefined ? -1 : o.idx };
    S = Object.assign({}, DEF, cleanSet(o.set));
    // base canvas (keeps transparency)
    const W = o.img.naturalWidth || o.img.width, H = o.img.naturalHeight || o.img.height;
    const sc = Math.min(1, BASE_MAX / Math.max(W, H));
    base = mk(W * sc, H * sc); base.getContext('2d').drawImage(o.img, 0, 0, base.width, base.height);
    tainted = false; PL = null; Tp = null; bgInit(); buildT();
    ui.title.textContent = o.title || '3D';
    buildBody(); setTab('color');
    ui.root.classList.add('open');
    sizeCanvas(); scheduleRender();
  }
  function closeEditor() {
    cancelInertia(); cancelTween();
    if (ui) ui.root.classList.remove('open');
    base = T = Tp = PL = null; bgTok++; srcD = outD = bpCv = autoKeep = man = T0 = null; bgUndo = []; bgSt = null; bgCur = null; manDirty = false;
  }

  /* ============================== image pipeline ============================== */
  function buildT() {
    const bw = base.width, bh = base.height, r = S.rot % 4, odd = r % 2 === 1;
    const w = odd ? bh : bw, h = odd ? bw : bh;
    const c = mk(w, h), g = c.getContext('2d');
    g.translate(w / 2, h / 2); g.scale(S.fh ? -1 : 1, S.fv ? -1 : 1); g.rotate(r * Math.PI / 2);
    g.drawImage(bpCv || base, -bw / 2, -bh / 2);
    T = c; Tp = null; T0 = null;
  }
  function buildTp() {
    const sc = Math.min(1, 900 / Math.max(T.width, T.height));
    Tp = mk(T.width * sc, T.height * sc); Tp.getContext('2d').drawImage(T, 0, 0, Tp.width, Tp.height);
  }
  function colorize(c) {
    const g = c.getContext('2d'); let id;
    try { id = g.getImageData(0, 0, c.width, c.height); } catch (e) { tainted = true; return; }
    const d = id.data, hue = rad(S.hue), cs = Math.cos(hue), sn = Math.sin(hue);
    const m = [.213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928,
      .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .140, .072 - cs * .072 - sn * .283,
      .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072];
    const sat = S.sat / 100, bri = S.bri / 100, con = S.con / 100, ta = S.tintAmt / 100, rm = S.rm;
    const tr = parseInt(S.tint.slice(1, 3), 16), tg = parseInt(S.tint.slice(3, 5), 16), tb = parseInt(S.tint.slice(5, 7), 16);
    const doHue = S.hue !== 0, lim = 255 - rm * 3;
    for (let i = 0; i < d.length; i += 4) {
      let a = d[i + 3]; if (!a) continue;
      let r = d[i], g1 = d[i + 1], b = d[i + 2];
      if (rm > 0) { const mn = Math.min(r, g1, b); if (mn >= lim) { d[i + 3] = 0; continue; } if (mn > lim - 24) a = a * (lim - mn) / 24; }
      if (doHue) { const r2 = r * m[0] + g1 * m[1] + b * m[2], g2 = r * m[3] + g1 * m[4] + b * m[5], b2 = r * m[6] + g1 * m[7] + b * m[8]; r = r2; g1 = g2; b = b2; }
      if (sat !== 1) { const gr = .299 * r + .587 * g1 + .114 * b; r = gr + (r - gr) * sat; g1 = gr + (g1 - gr) * sat; b = gr + (b - gr) * sat; }
      if (ta > 0) {
        const lum = (.299 * r + .587 * g1 + .114 * b) / 255; let rr, gg, bb;
        if (lum < .5) { const k = lum * 2; rr = tr * k; gg = tg * k; bb = tb * k; }
        else { const k = (lum - .5) * 2; rr = tr + (255 - tr) * k; gg = tg + (255 - tg) * k; bb = tb + (255 - tb) * k; }
        r = r + (rr - r) * ta; g1 = g1 + (gg - g1) * ta; b = b + (bb - b) * ta;
      }
      if (bri !== 1) { r *= bri; g1 *= bri; b *= bri; }
      if (con !== 1) { r = (r - 128) * con + 128; g1 = (g1 - 128) * con + 128; b = (b - 128) * con + 128; }
      d[i] = r; d[i + 1] = g1; d[i + 2] = b; d[i + 3] = a;
    }
    g.putImageData(id, 0, 0);
  }
  function tone(f, dark, scale) {
    const c = mk(f.width * scale, f.height * scale), g = c.getContext('2d');
    g.drawImage(f, 0, 0, c.width, c.height);
    if (S.side === 'solid') {
      g.globalCompositeOperation = 'source-in'; g.fillStyle = S.sideColor; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,' + (dark * .35) + ')'; g.fillRect(0, 0, c.width, c.height);
    } else {
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,' + dark + ')'; g.fillRect(0, 0, c.width, c.height);
    }
    return c;
  }
  function makeLayers(maxSide, sideScale) {
    const sx = S.cl * T.width, sy = S.ct * T.height, sw = Math.max(1, (S.cr - S.cl) * T.width), sh = Math.max(1, (S.cb - S.ct) * T.height);
    const sc = Math.min(1, maxSide / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * sc)), h = Math.max(1, Math.round(sh * sc));
    const f = mk(w, h); f.getContext('2d').drawImage(T, sx, sy, sw, sh, 0, 0, w, h);
    colorize(f);
    return { front: f, side: tone(f, .5, sideScale), back: tone(f, .38, sideScale), w, h };
  }

  /* ============================== 3D slab drawing ============================== */
  function slabThickness(L) { return S.thick / 100 * Math.max(L.w, L.h); }
  function drawSlab(g, cx, cy, k, L, yaw, pitch, n, shadow) {
    const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
    const a = k * cY, b = k * sP * sY, d = k * cP, ex = k * sY, ey = -k * sP * cY;
    const t = slabThickness(L), hw = L.w / 2, hh = L.h / 2, facing = cP * cY;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (shadow) {
      let minX = 1e9, maxX = -1e9, maxY = -1e9;
      for (const ix of [-1, 1]) for (const iy of [-1, 1]) for (const iz of [-1, 1]) {
        const X = cx + a * ix * hw + ex * iz * t / 2, Y = cy + b * ix * hw + d * iy * hh + ey * iz * t / 2;
        minX = Math.min(minX, X); maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y);
      }
      const rx = (maxX - minX) * .55 + 6, ry = Math.max(5, rx * .13);
      g.save(); g.translate((minX + maxX) / 2, maxY + ry * .45); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(0,0,0,.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (t < .6) {
      g.setTransform(a, b, 0, d, cx, cy); g.drawImage(facing >= 0 ? L.front : L.back, -hw, -hh, L.w, L.h);
      g.setTransform(1, 0, 0, 1, 0, 0); return;
    }
    const order = []; for (let i = 0; i <= n; i++) order.push(i); if (facing < 0) order.reverse();
    for (const i of order) {
      const z = -t / 2 + t * i / n, src = i === n ? L.front : i === 0 ? L.back : L.side;
      g.setTransform(a, b, 0, d, cx + ex * z, cy + ey * z);
      g.drawImage(src, -hw, -hh, L.w, L.h);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ============================== preview render ============================== */
  function scheduleRender() { if (!raf) raf = requestAnimationFrame(render); }
  function renderNow() { if (raf) { cancelAnimationFrame(raf); raf = 0; } render(); }
  function render() {
    raf = 0;
    if (!ui || !base || !ui.root.classList.contains('open')) return;
    const cv = ui.cv, g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (tab === 'crop') { drawCrop(g, W, H); return; }
    if (tab === 'bg') { drawBg(g, W, H); return; }
    if (!PL) { PL = makeLayers(720, .5); if (tainted) ui.hint.textContent = '⚠ Open the app through http/https (not file://) so color & 3D can work'; }
    const t = slabThickness(PL), D = Math.hypot(PL.w, PL.h, t), k = S.zoom * Math.min(W, H) * .82 / D;
    const n = interacting ? clamp(Math.ceil(t * k), 1, 28) : clamp(Math.ceil(t * k * 1.25), 1, 150);
    drawSlab(g, W / 2, H / 2 + H * .02, k, PL, rad(S.yaw), rad(S.pitch), n, !!S.shadow);
  }

  /* ============================== crop mode ============================== */
  function drawCrop(g, W, H) {
    if (!Tp) buildTp();
    const m = 28 * dpr(), sc = Math.min((W - 2 * m) / Tp.width, (H - 2 * m) / Tp.height);
    const dw = Tp.width * sc, dh = Tp.height * sc, ox = (W - dw) / 2, oy = (H - dh) / 2;
    cropBox = { ox, oy, dw, dh };
    g.drawImage(Tp, ox, oy, dw, dh);
    const x0 = ox + S.cl * dw, y0 = oy + S.ct * dh, x1 = ox + S.cr * dw, y1 = oy + S.cb * dh;
    g.fillStyle = 'rgba(15,23,42,.55)';
    g.fillRect(ox, oy, dw, y0 - oy); g.fillRect(ox, y1, dw, oy + dh - y1); g.fillRect(ox, y0, x0 - ox, y1 - y0); g.fillRect(x1, y0, ox + dw - x1, y1 - y0);
    g.lineWidth = 2 * dpr(); g.strokeStyle = '#fff'; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.lineWidth = 1 * dpr(); g.strokeStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); for (let i = 1; i < 3; i++) { g.moveTo(x0 + (x1 - x0) * i / 3, y0); g.lineTo(x0 + (x1 - x0) * i / 3, y1); g.moveTo(x0, y0 + (y1 - y0) * i / 3); g.lineTo(x1, y0 + (y1 - y0) * i / 3); } g.stroke();
    const hs = cropHandles(); g.lineWidth = 2 * dpr();
    for (const key in hs) { g.beginPath(); g.arc(hs[key][0], hs[key][1], 9 * dpr(), 0, Math.PI * 2); g.fillStyle = '#147bd1'; g.fill(); g.strokeStyle = '#fff'; g.stroke(); }
  }
  function cropHandles() {
    const { ox, oy, dw, dh } = cropBox, x0 = ox + S.cl * dw, y0 = oy + S.ct * dh, x1 = ox + S.cr * dw, y1 = oy + S.cb * dh, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return { tl: [x0, y0], tr: [x1, y0], bl: [x0, y1], br: [x1, y1], t: [mx, y0], b: [mx, y1], l: [x0, my], r: [x1, my] };
  }
  function canvasPt(e) { const r = ui.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * ui.cv.width / r.width, y: (e.clientY - r.top) * ui.cv.height / r.height }; }
  function cropStart(e) {
    if (!cropBox) return; const p = canvasPt(e), hs = cropHandles(); let best = null, bd = 30 * dpr();
    for (const k in hs) { const d = Math.hypot(p.x - hs[k][0], p.y - hs[k][1]); if (d < bd) { bd = d; best = k; } }
    if (!best) { const { ox, oy, dw, dh } = cropBox; if (p.x > ox + S.cl * dw && p.x < ox + S.cr * dw && p.y > oy + S.ct * dh && p.y < oy + S.cb * dh) best = 'move'; }
    cropDrag = best ? { h: best, p, o: { cl: S.cl, ct: S.ct, cr: S.cr, cb: S.cb } } : null;
  }
  function cropMove(e) {
    if (!cropDrag || !cropBox) return; const p = canvasPt(e), { dw, dh } = cropBox, dx = (p.x - cropDrag.p.x) / dw, dy = (p.y - cropDrag.p.y) / dh, o = cropDrag.o, h = cropDrag.h, MIN = .05;
    let { cl, ct, cr, cb } = o;
    if (h === 'move') { const w = cr - cl, hh = cb - ct; cl = clamp(cl + dx, 0, 1 - w); ct = clamp(ct + dy, 0, 1 - hh); cr = cl + w; cb = ct + hh; }
    else {
      if (h.includes('l')) cl = clamp(o.cl + dx, 0, o.cr - MIN);
      if (h.includes('r')) cr = clamp(o.cr + dx, o.cl + MIN, 1);
      if (h.includes('t')) ct = clamp(o.ct + dy, 0, o.cb - MIN);
      if (h.includes('b')) cb = clamp(o.cb + dy, o.ct + MIN, 1);
    }
    S.cl = cl; S.ct = ct; S.cr = cr; S.cb = cb; scheduleRender();
  }
  function cropAction(a) {
    if (a === 'reset') { S.cl = 0; S.ct = 0; S.cr = 1; S.cb = 1; }
    else if (a === 'trim') {
      let id; try { id = T.getContext('2d').getImageData(0, 0, T.width, T.height).data; } catch (e) { toast('Open the app through http/https'); return; }
      const W = T.width, H = T.height; let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (id[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return;
      S.cl = clamp(x0 / W - .004, 0, .95); S.ct = clamp(y0 / H - .004, 0, .95); S.cr = clamp((x1 + 1) / W + .004, .05, 1); S.cb = clamp((y1 + 1) / H + .004, .05, 1);
    }
    else if (a === 'fh') { const l = S.cl; S.cl = 1 - S.cr; S.cr = 1 - l; S.fh = S.fh ? 0 : 1; buildT(); }
    else if (a === 'fv') { const t = S.ct; S.ct = 1 - S.cb; S.cb = 1 - t; S.fv = S.fv ? 0 : 1; buildT(); }
    else if (a === 'rot') { const { cl, ct, cr, cb } = S; S.cl = 1 - cb; S.cr = 1 - ct; S.ct = cl; S.cb = cr; const f = S.fh; S.fh = S.fv; S.fv = f; S.rot = (S.rot + 1) % 4; buildT(); }
    PL = null; scheduleRender();
  }

  /* ============================== finger rotate / zoom ============================== */
  const ROT = .45;
  function pdist() { const v = [...ptrs.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1; }
  function cancelInertia() { if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = 0; } vel.x = vel.y = 0; }
  function cancelTween() { if (tweenRaf) { cancelAnimationFrame(tweenRaf); tweenRaf = 0; } }
  function settle(delay) { clearTimeout(settleTimer); settleTimer = setTimeout(() => { interacting = false; scheduleRender(); }, delay === undefined ? 120 : delay); }
  function inertia() {
    if (Math.abs(vel.x) < .03 && Math.abs(vel.y) < .03) { inertiaRaf = 0; settle(0); return; }
    S.yaw += vel.x; S.pitch += vel.y; vel.x *= .94; vel.y *= .94; renderNow(); inertiaRaf = requestAnimationFrame(inertia);
  }
  function tweenTo(y, p, z) {
    cancelInertia(); cancelTween(); interacting = true;
    const sy = S.yaw, sp = S.pitch, sz = S.zoom, dy = ((y - sy) % 360 + 540) % 360 - 180, dp = ((p - sp) % 360 + 540) % 360 - 180, t0 = performance.now(), dur = 320;
    const step = now => {
      const u = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - u, 3);
      S.yaw = sy + dy * e; S.pitch = sp + dp * e; if (z !== undefined) S.zoom = sz + (z - sz) * e;
      renderNow();
      if (u < 1) tweenRaf = requestAnimationFrame(step); else { tweenRaf = 0; interacting = false; S.yaw = ((S.yaw % 360) + 360) % 360; if (S.yaw > 180) S.yaw -= 360; S.pitch = ((S.pitch % 360) + 360) % 360; if (S.pitch > 180) S.pitch -= 360; scheduleRender(); }
    };
    tweenRaf = requestAnimationFrame(step);
  }
  function wirePointers(cv) {
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelInertia(); cancelTween();
      if (tab === 'bg') { bgDown(e); return; }
      if (ptrs.size === 2) { pinch0 = { d: pdist(), z: S.zoom }; drag = null; cropDrag = null; return; }
      if (tab === 'crop') { cropStart(e); return; }
      drag = { x: e.clientX, y: e.clientY }; interacting = true; clearTimeout(settleTimer); lastMove = 0;
    });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
      if (tab === 'bg') { bgMove(e); return; }
      if (ptrs.size === 2 && pinch0) { interacting = true; S.zoom = clamp(pinch0.z * pdist() / pinch0.d, .3, 4); scheduleRender(); return; }
      if (tab === 'crop') { cropMove(e); return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      S.yaw += dx * ROT; S.pitch -= dy * ROT;
      vel.x = vel.x * .35 + dx * ROT * .65; vel.y = vel.y * .35 - dy * ROT * .65; lastMove = performance.now();
      scheduleRender();
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (tab === 'bg') { bgUp(e); return; }
      if (ptrs.size < 2) pinch0 = null;
      if (ptrs.size === 0) {
        if (tab === 'crop') { cropDrag = null; PL = null; scheduleRender(); return; }
        if (drag && performance.now() - lastMove < 70 && (Math.abs(vel.x) > .5 || Math.abs(vel.y) > .5)) { drag = null; inertiaRaf = requestAnimationFrame(inertia); }
        else { drag = null; settle(); }
      }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); if (tab === 'bg') { const q = canvasPt(e); bgZoomAt(q.x, q.y, e.deltaY < 0 ? 1.12 : .89); return; } S.zoom = clamp(S.zoom * (e.deltaY < 0 ? 1.08 : .92), .3, 4); interacting = true; scheduleRender(); settle(); }, { passive: false });
  }

  /* ============================== export → canvas ============================== */
  function exportPNG() {
    const L = makeLayers(900, 1); if (tainted) return null;
    const t = slabThickness(L), D = Math.hypot(L.w, L.h, t), Q = Math.ceil(D * 1.3) + 56, c = mk(Q, Q), g = c.getContext('2d');
    drawSlab(g, Q / 2, Q / 2, 1, L, rad(S.yaw), rad(S.pitch), clamp(Math.ceil(t * 1.1), 1, 220), !!S.shadow);
    let px; try { px = g.getImageData(0, 0, Q, Q).data; } catch (e) { return null; }
    let x0 = Q, y0 = Q, x1 = -1, y1 = -1;
    for (let y = 0; y < Q; y++) { const row = y * Q * 4; for (let x = 0; x < Q; x++) if (px[row + x * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(Q - 1, x1 + 3); y1 = Math.min(Q - 1, y1 + 3);
    const w = x1 - x0 + 1, h = y1 - y0 + 1; let data = null;
    for (const s of [1, .8, .62, .5]) {
      const o = mk(w * s, h * s); o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
      try { data = o.toDataURL('image/png'); } catch (e) { return null; }
      if (data.length < 1600000) break;
    }
    return { data, w, h };
  }
  function commit() {
    if (!base) return;
    const r = exportPNG();
    if (!r) { ui.hint.textContent = tainted ? '⚠ Open the app through http/https (not file://)' : 'Nothing to add — the picture is empty'; return; }
    const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    S.mask = bgSerialize();
    const id = 'i' + rid(), m = ctxInfo.meta, brk = { k: m.k, t: m.t || '', label: m.label || 'Breaker', set: Object.assign({}, S) };
    if (m.k === 'file') brk.u = m.u;
    else {
      let sid = m.srcId;
      if (!sid) { const sc = Math.min(1, 900 / Math.max(base.width, base.height)), sb = mk(base.width * sc, base.height * sc); sb.getContext('2d').drawImage(base, 0, 0, sb.width, sb.height); sid = 's' + rid(); try { imgStore[sid] = sb.toDataURL('image/png'); } catch (e) { sid = ''; } }
      if (sid) brk.srcId = sid; else delete brk.set;
    }
    imgStore[id] = r.data; getImg(id); snap();
    const idx = ctxInfo.idx;
    if (idx >= 0 && items[idx] && items[idx].type === 'image') {
      const o = items[idx]; o.imgId = id; o.h = Math.max(5, o.w * r.h / r.w); o.brk = brk; sel = idx; toast('3D picture updated');
    } else {
      const sc = 240 / Math.max(r.w, r.h), w = Math.max(20, r.w * sc), h = Math.max(20, r.h * sc), o = defaultObj('image');
      o.imgId = id; o.w = w; o.h = h; o.x = (wrap.clientWidth / 2 - panX) / zoom - w / 2; o.y = (wrap.clientHeight / 2 - panY) / zoom - h / 2;
      o.stroke = 0; o.fill = 'transparent'; o.name = String(m.label || 'Breaker').slice(0, 60); o.brk = brk;
      items.push(o); sel = items.length - 1; toast((m.label || 'Breaker') + ' added — drag, resize or rotate it; tap ↻ handle to edit in 3D again');
    }
    closeEditor(); toolset('select'); draw();
  }

  /* ============================== hardware back button hook ==============================
     Lets the Android back button step out of the 3D editor one level at a time (back to the
     gallery it was opened from), exactly like tapping the on-screen "#b3Back" button does,
     instead of closing everything at once. Returns true if it handled the back press. */
  window.cpBreakerBackStep = function () {
    if (ui && ui.root && ui.root.classList.contains('open')) {
      closeEditor();
      if (galTarget) openGallery(galTarget.id); else openGallery('more');
      return true;
    }
    return false;
  };
})();
