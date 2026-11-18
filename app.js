(function () {
  "use strict";
  var CFG = window.TK_CONFIG || {}, DEMO = !CFG.endpoint, f = document.getElementById("f"), banner = document.getElementById("banner"), btn = document.getElementById("submit"), okEl = document.getElementById("ok");
  var DRAFT = "tk_speakers_draft_v1", KEY = "tk_speakers_idem_v1", MAXB = 3 * 1024 * 1024, photo = null, busy = false;
  var TEXTS = ["name", "org", "phone", "email", "title", "bio", "notes", "invites"];
  var AR = "٠١٢٣٤٥٦٧٨٩", FA = "۰۱۲۳۴۵۶۷۸۹";
  function norm(s) { return String(s || "").replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); }); }
  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id).value || "").replace(/\s+/g, " ").trim(); }
  function setErr(name, msg) { var p = f.querySelector('.err[data-for="' + name + '"]'); if (p) { p.textContent = msg || ""; } var i = el(name); if (i && i.classList) { i.classList.toggle("bad", !!msg); i.setAttribute("aria-invalid", msg ? "true" : "false"); } }
  function showBanner(msg) { banner.textContent = msg; banner.hidden = !msg; if (msg) { banner.scrollIntoView({ behavior: "smooth", block: "center" }); } }
  // draft (text fields only — never the photo, never the honeypot)
  try { var d = JSON.parse(localStorage.getItem(DRAFT) || "{}"); TEXTS.forEach(function (k) { if (d[k]) { el(k).value = d[k]; } }); } catch (e) { }
  function saveDraft() { try { var o = {}; TEXTS.forEach(function (k) { o[k] = el(k).value; }); localStorage.setItem(DRAFT, JSON.stringify(o)); } catch (e) { } }
  f.addEventListener("input", function (ev) { saveDraft(); if (ev.target.name) { setErr(ev.target.name, ""); } });
  // photo mode
  function mode() { return f.querySelector('input[name="photoMode"]:checked').value; }
  function syncMode() { var up = mode() === "upload"; el("uploadBox").hidden = !up; el("defaultBox").hidden = up; setErr("photo", ""); }
  Array.prototype.forEach.call(f.querySelectorAll('input[name="photoMode"]'), function (r) { r.addEventListener("change", syncMode); });
  function fmt(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " م.ب" : Math.round(b / 1024) + " ك.ب"; }
  function readImage(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader(); fr.onerror = function () { rej(new Error("read")); };
      fr.onload = function () { var im = new Image(); im.onerror = function () { rej(new Error("img")); }; im.onload = function () { res({ dataUrl: fr.result, w: im.naturalWidth, h: im.naturalHeight, im: im }); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  function toBlobPromise(c, type, q) { return new Promise(function (res) { c.toBlob(res, type, q); }); }
  async function prepare(file) {
    var info = await readImage(file), type = file.type === "image/png" ? "image/png" : "image/jpeg", max = 2400, s = Math.min(1, max / Math.max(info.w, info.h));
    if (file.size <= MAXB && s === 1) { return { blob: file, type: type, w: info.w, h: info.h }; }
    var c = document.createElement("canvas"); c.width = Math.round(info.w * s); c.height = Math.round(info.h * s); var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(info.im, 0, 0, c.width, c.height);
    var b = await toBlobPromise(c, "image/jpeg", 0.92), q = 0.92;
    while (b && b.size > MAXB && q > 0.5) { q -= 0.1; b = await toBlobPromise(c, "image/jpeg", q); }
    if (!b || b.size > MAXB) { throw new Error("big"); }
    return { blob: b, type: "image/jpeg", w: c.width, h: c.height };
  }
  el("photo").addEventListener("change", async function () {
    var file = this.files && this.files[0]; photo = null; el("preview").hidden = true; setErr("photo", "");
    if (!file) { return; }
    if (!/^image\/(jpeg|png)$/.test(file.type)) { setErr("photo", "الصيغة غير مدعومة. يُرجى اختيار صورة JPG أو PNG."); this.value = ""; return; }
    try {
      var p = await prepare(file); p.name = file.name; photo = p;
      el("prevImg").src = URL.createObjectURL(p.blob); el("prevName").textContent = file.name; el("prevInfo").textContent = p.w + "×" + p.h + " · " + fmt(p.blob.size); el("preview").hidden = false;
    } catch (e) { setErr("photo", e.message === "big" ? "حجم الصورة كبير جدًا. يُرجى اختيار صورة أصغر." : "تعذّرت قراءة الصورة. جرّب صورة أخرى."); this.value = ""; }
  });
  el("rmPhoto").addEventListener("click", function () { photo = null; el("photo").value = ""; el("preview").hidden = true; });
  function validate() {
    var bad = [], m;
    function need(k, msg) { if (!val(k)) { setErr(k, msg || "هذا الحقل مطلوب."); bad.push(k); return false; } return true; }
    need("name"); need("org"); need("title"); need("bio");
    if (need("phone")) { var ph = norm(val("phone")).replace(/[\s\-()]/g, ""); if (!/^\+?\d{8,15}$/.test(ph)) { setErr("phone", "يُرجى إدخال رقم جوال صحيح (أرقام فقط)."); bad.push("phone"); } }
    if (need("email")) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) { setErr("email", "يُرجى إدخال بريد إلكتروني صحيح."); bad.push("email"); } }
    if (mode() === "upload" && !photo) { setErr("photo", "الصورة الشخصية مطلوبة، أو اختر عدم إظهارها."); bad.push("photo"); }
    if (!f.querySelector('input[name="consent"]:checked')) { setErr("consent", "يُرجى اختيار أحد الخيارين."); bad.push("consent"); }
    return bad;
  }
  function idem() { var k = sessionStorage.getItem(KEY); if (!k) { k = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); sessionStorage.setItem(KEY, k); } return k; }
  function blobToB64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(",")[1]); }; r.onerror = rej; r.readAsDataURL(b); }); }
  function setBusy(v) { busy = v; btn.disabled = v; btn.classList.toggle("loading", v); btn.querySelector(".lbl").textContent = v ? "جارٍ الإرسال…" : "تأكيد المشاركة"; }
  f.addEventListener("submit", async function (ev) {
    ev.preventDefault(); if (busy) { return; } showBanner("");
    var bad = validate(); if (bad.length) { var t = el(bad[0]) || f.querySelector('[name="' + bad[0] + '"]'); if (t && t.focus) { t.focus(); } showBanner("يُرجى مراجعة الحقول المُعلَّمة قبل الإرسال."); return; }
    setBusy(true);
    try {
      var body = { idem: idem(), website: f.elements.website.value, name: val("name"), org: val("org"), phone: norm(val("phone")).replace(/[\s\-()]/g, ""), email: val("email"), title: val("title"), bio: el("bio").value.trim(), consent: f.querySelector('input[name="consent"]:checked').value, notes: el("notes").value.trim(), invites: el("invites").value.trim(), photoMode: mode() };
      if (body.photoMode === "upload") { body.photo = { name: photo.name, type: photo.type, data: await blobToB64(photo.blob) }; }
      var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 40000), res;
      try { if (DEMO) { await new Promise(function (r) { setTimeout(r, 900); }); onDemo(); return; }
      res = await fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), signal: ctl.signal }); } finally { clearTimeout(to); }
      var j = null; try { j = await res.json(); } catch (e) { }
      if (res.ok && j && j.ok === true && j.ref) { onSuccess(j.ref); return; }
      var msg = (j && j.message) || "تعذّر حفظ تأكيد المشاركة. لم يُسجَّل شيء، وبياناتك محفوظة في الصفحة. يُرجى المحاولة مرة أخرى.";
      if (j && j.fields) { (Array.isArray(j.fields) ? j.fields : Object.keys(j.fields)).forEach(function (k) { setErr(k, "يُرجى مراجعة هذا الحقل."); }); msg = "يُرجى مراجعة الحقول المُعلَّمة."; }
      if (j && j.code === "CLOSED") { msg = "استقبال التأكيدات متوقف حاليًا. للاستفسار: info@wifada.sa"; }
      showBanner(msg);
    } catch (e) {
      showBanner(e && e.name === "AbortError" ? "استغرق الإرسال وقتًا طويلًا. لم نتأكد من الحفظ؛ يُرجى المحاولة مرة أخرى (لن يتكرر التسجيل)." : "تعذّر الاتصال بالشبكة. لم يُسجَّل شيء، وبياناتك محفوظة في الصفحة. تحقق من الاتصال وأعد المحاولة.");
    } finally { setBusy(false); }
  });
  function onSuccess(ref) {
    try { localStorage.removeItem(DRAFT); sessionStorage.removeItem(KEY); } catch (e) { }
    el("refNo").textContent = ref; f.hidden = true; okEl.hidden = false; showOk();
  }
  function onDemo() {
    el("okTitle").textContent = "تم فحص البيانات"; el("okText").textContent = "هذه نسخة تجريبية للمعاينة: لم يُرسل أي شيء ولم يُحفظ تأكيد المشاركة."; el("refLine").hidden = true;
    f.hidden = true; okEl.hidden = false; showOk();
  }
  function showOk() { document.body.classList.add("done"); okEl.focus({ preventScroll: true }); okEl.scrollIntoView({ behavior: "smooth", block: "center" }); }
  if (DEMO) { el("demo").hidden = false; }
  syncMode();
})();
