/* Nhari — local build: replaces the Claude artifact runtime.
   - data: stays in this device's storage (the app's Store falls back to localStorage)
   - AI: calls Gemini (Google AI Studio free tier) or the Claude API directly,
     with the user's own key (kept only on this device, never in backups) */
(function () {
  "use strict";
  window.NHARI_LOCAL = true;
  const PROV = "nhari:provider";
  const KEYS = { anthropic: "nhari:apikey", gemini: "nhari:gemkey" };
  const MODEL_KEYS = { anthropic: "nhari:model", gemini: "nhari:gemmodel" };
  const MODELS = { quick: "claude-haiku-5-5", default: "claude-sonnet-5-5", complex: "claude-opus-5-5" };
  // Free-tier Gemini models, best first. Each model has its own free quota,
  // so when one is used up (429) or unavailable (404) the next one is tried.
  const GEMINI = {
    default: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"],
    quick: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-2.5-flash-lite"]
  };
  const GEM_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
  const ls = { get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }, set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  const fail = (code, message, text) => ({ code, message, text });

  function provider() {
    const p = ls.get(PROV);
    if (KEYS[p]) return p; // the user's explicit choice, even before a key is saved
    if (ls.get(KEYS.gemini)) return "gemini";
    if (ls.get(KEYS.anthropic)) return "anthropic";
    return p || "gemini";
  }
  const hasKey = () => !!ls.get(KEYS[provider()]);

  async function toJpeg(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const scale = Math.min(1, Math.sqrt(1200000 / (bmp.width * bmp.height)));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85).split(",")[1];
    } catch (e) { throw fail("image_rejected", "image could not be read"); }
  }

  function toMessages(input) {
    const list = typeof input === "string" ? [{ role: "user", content: input }] : (input || []).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") }));
    const out = [];
    for (const m of list) { if (!m.content) continue; const last = out[out.length - 1]; if (last && last.role === m.role) last.content += "\n\n" + m.content; else out.push({ ...m }); }
    while (out.length && out[0].role !== "user") out.shift();
    if (!out.length || out[out.length - 1].role !== "user") throw fail("invalid_request", "conversation must end on a user turn");
    return out;
  }

  async function images(opts) {
    if (!opts.images) return [];
    const arr = opts.images instanceof Blob ? [opts.images] : Array.from(opts.images);
    return Promise.all(arr.slice(0, 5).map(toJpeg));
  }

  // Reads a server-sent-events body and calls onEvent(json) for each "data:" line.
  async function readSSE(res, onEvent) {
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "";
    const flush = (chunk) => {
      const data = chunk.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
      if (!data || data === "[DONE]") return;
      let ev; try { ev = JSON.parse(data); } catch (e) { return; }
      onEvent(ev);
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) { flush(buf.slice(0, i)); buf = buf.slice(i + 2); }
    }
    if (buf.trim()) flush(buf);
  }

  /* ---------------- Claude API ---------------- */
  async function sampleClaude(input, opts, tier) {
    const key = ls.get(KEYS.anthropic);
    const messages = toMessages(input);
    const imgs = await images(opts), docs = (opts.files || []).filter(f => f && f.data);
    if (imgs.length || docs.length) { const last = messages[messages.length - 1]; last.content = [...docs.map(f => ({ type: "document", source: { type: "base64", media_type: f.type || "application/pdf", data: f.data } })), ...imgs.map(data => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })), { type: "text", text: last.content }]; }
    const model = tier === "default" ? (ls.get(MODEL_KEYS.anthropic) || MODELS.default) : MODELS[tier];
    const body = { model, max_tokens: tier === "quick" ? 4000 : 16000, messages, stream: true };
    if (opts._system) body.system = opts._system;
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: opts.signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify(body)
      });
    } catch (e) { if (e && e.name === "AbortError") throw fail("cancelled", "aborted"); throw fail("no_network", String(e)); }
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      const code = res.status === 401 || res.status === 403 ? "invalid_key" : (res.status === 429 || res.status === 529) ? "rate_limited" : res.status === 400 && /credit|billing/i.test(t) ? "invalid_key" : res.status === 400 ? "invalid_request" : "upstream_error";
      throw fail(code, t.slice(0, 400));
    }
    let text = "", stop = "";
    try {
      await readSSE(res, (ev) => {
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta" && ev.delta.text) {
          text += ev.delta.text;
          if (opts.onText) { try { opts.onText({ text, delta: ev.delta.text }); } catch (e) { console.error(e); } }
        } else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === "error") throw fail(ev.error && ev.error.type === "overloaded_error" ? "rate_limited" : "upstream_error", JSON.stringify(ev.error || {}), text);
      });
    } catch (e) {
      if (e && e.code) throw e;
      if (e && e.name === "AbortError") throw fail("cancelled", "aborted", text || undefined);
      throw fail("upstream_error", String(e), text || undefined);
    }
    if (stop === "refusal") throw fail("refused", "refused");
    if (!text.trim()) throw fail("empty_completion", "empty");
    return { text, truncated: stop === "max_tokens", modelTierApplied: tier };
  }

  /* ---------------- Gemini API (free tier) ---------------- */
  let gemWorking = {}; // tier -> model that last answered, tried first next time

  function gemChain(tier) {
    const pick = ls.get(MODEL_KEYS.gemini);
    const base = GEMINI[tier === "quick" ? "quick" : "default"];
    const chain = [];
    if (pick && tier !== "quick") chain.push(pick);
    if (gemWorking[tier]) chain.push(gemWorking[tier]);
    base.forEach(m => chain.push(m));
    return [...new Set(chain)];
  }

  function gemErrorCode(status, t) {
    if (/API_KEY_INVALID|API key not valid|API_KEY_/i.test(t)) return "invalid_key";
    if (/location is not supported|not available in your country|User location/i.test(t)) return "region";
    if (status === 401 || status === 403) return "invalid_key";
    if (status === 429) return "quota";
    if (status === 404 || (status === 400 && /is not found|not supported for generateContent|unknown model|model .* not/i.test(t))) return "model_missing";
    if (status === 400 && /thinking/i.test(t)) return "thinking_unsupported";
    if (status >= 500) return "rate_limited";
    if (status === 400) return "invalid_request";
    return "upstream_error";
  }

  async function gemOnce(model, payload, opts, tier) {
    const key = ls.get(KEYS.gemini);
    let res;
    try {
      res = await fetch(GEM_URL + encodeURIComponent(model) + ":streamGenerateContent?alt=sse", {
        method: "POST", signal: opts.signal,
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) { if (e && e.name === "AbortError") throw fail("cancelled", "aborted"); throw fail("no_network", String(e)); }
    if (!res.ok) { const t = await res.text().catch(() => ""); throw fail(gemErrorCode(res.status, t), t.slice(0, 400)); }
    let text = "", finish = "", blocked = "";
    try {
      await readSSE(res, (ev) => {
        if (ev.error) throw fail(gemErrorCode(ev.error.code || 500, JSON.stringify(ev.error)), JSON.stringify(ev.error).slice(0, 400), text);
        if (ev.promptFeedback && ev.promptFeedback.blockReason) blocked = ev.promptFeedback.blockReason;
        const c = ev.candidates && ev.candidates[0];
        if (!c) return;
        if (c.finishReason) finish = c.finishReason;
        const parts = (c.content && c.content.parts) || [];
        for (const p of parts) {
          if (p.thought || typeof p.text !== "string" || !p.text) continue;
          text += p.text;
          if (opts.onText) { try { opts.onText({ text, delta: p.text }); } catch (e) { console.error(e); } }
        }
      });
    } catch (e) {
      if (e && e.code) throw e;
      if (e && e.name === "AbortError") throw fail("cancelled", "aborted", text || undefined);
      throw fail("upstream_error", String(e), text || undefined);
    }
    if (!text.trim()) {
      if (blocked || /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/i.test(finish)) throw fail("refused", blocked || finish);
      throw fail("empty_completion", finish || "empty");
    }
    return { text, truncated: finish === "MAX_TOKENS", modelTierApplied: tier, model };
  }

  async function sampleGemini(input, opts, tier) {
    const messages = toMessages(input);
    const imgs = await images(opts);
    const contents = messages.map((m, i) => {
      const parts = [{ text: m.content }];
      if (i === messages.length - 1 && imgs.length) parts.unshift(...imgs.map(data => ({ inlineData: { mimeType: "image/jpeg", data } })));
      if (i === messages.length - 1 && opts.files) parts.unshift(...opts.files.filter(f => f && f.data).map(f => ({ inlineData: { mimeType: f.type || "application/pdf", data: f.data } })));
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });
    let lastErr = null, sawQuota = false;
    for (const model of gemChain(tier)) {
      const gen = { maxOutputTokens: tier === "quick" ? 8192 : 32768 };
      if (opts._json) gen.responseMimeType = "application/json";
      // light thinking keeps answers fast (first words in a few seconds); "complex" keeps the model default
      if (tier !== "complex" && /^gemini-3/.test(model)) gen.thinkingConfig = { thinkingLevel: "low" };
      const payload = { contents, generationConfig: gen };
      if (opts._system) payload.systemInstruction = { parts: [{ text: opts._system }] };
      try {
        let r;
        try { r = await gemOnce(model, payload, opts, tier); }
        catch (e) {
          if (e && e.code === "thinking_unsupported" && gen.thinkingConfig) { delete gen.thinkingConfig; r = await gemOnce(model, payload, opts, tier); }
          else throw e;
        }
        gemWorking[tier] = model;
        return r;
      } catch (e) {
        lastErr = e;
        // nothing streamed yet and another model may still answer → try the next one
        const retry = (e.code === "quota" || e.code === "model_missing" || e.code === "rate_limited") && !e.text;
        if (e.code === "quota") sawQuota = true;
        if (gemWorking[tier] === model) delete gemWorking[tier];
        if (!retry) throw e;
      }
    }
    if (sawQuota) throw fail("quota", lastErr ? lastErr.message : "quota");
    throw lastErr || fail("upstream_error", "no model answered");
  }

  /* ---------------- shared entry point (same contract as the artifact runtime) ---------------- */
  let lastInfo = null; // model, seconds and result of the last request (shown in Réglages)
  async function sample(input, opts = {}) {
    const prov = provider();
    if (!ls.get(KEYS[prov])) throw fail("not_granted", "no API key");
    if (navigator.onLine === false) throw fail("no_network", "offline");
    const tier = MODELS[opts.modelTier] ? opts.modelTier : "default";
    const t0 = Date.now();
    try {
      const r = await (prov === "gemini" ? sampleGemini(input, opts, tier) : sampleClaude(input, opts, tier));
      lastInfo = { ok: true, model: r.model || (tier === "default" ? (ls.get(MODEL_KEYS.anthropic) || MODELS.default) : MODELS[tier]), s: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString() };
      return r;
    } catch (e) {
      lastInfo = { ok: false, code: e && e.code, s: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString() };
      throw e;
    } finally { try { localStorage.setItem("nhari:ailast", JSON.stringify(lastInfo)); } catch (e) { /* ignore */ } }
  }
  function parseJSON(t) {
    const s = String(t || "").trim();
    try { return JSON.parse(s); } catch (e) { /* next */ }
    const f = s.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch (e) { /* next */ } }
    const a = Math.min(...["{", "["].map(c => s.indexOf(c)).filter(x => x >= 0)), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (isFinite(a) && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { /* none */ } }
    return undefined;
  }
  sample.json = async (input, opts = {}) => {
    const r = await sample(input, { ...opts, _json: true, _system: "Your reply will be parsed by a program: answer with only the requested JSON value, without any text before or after it." });
    if (r.truncated) throw fail("invalid_json", "truncated", r.text);
    const v = parseJSON(r.text);
    if (v === undefined) throw fail("invalid_json", "no JSON found", r.text);
    return v;
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 20000000, mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] }, modelTiers: ["quick", "default", "complex"] });

  window.claude = { use: async (name) => (name === "sample" && hasKey() ? sample : null) };
  window.NhariLocal = {
    sample, MODELS, GEMINI,
    provider, hasKey,
    hasKeyFor: (p) => !!ls.get(KEYS[p]),
    setProvider(p) { if (KEYS[p]) ls.set(PROV, p); gemWorking = {}; if (window.App && App.setAI) App.setAI(hasKey() ? sample : null); },
    model: (p) => ls.get(MODEL_KEYS[p || provider()]) || (((p || provider()) === "gemini") ? "" : MODELS.default),
    setKey(k, p) { p = p || provider(); ls.set(KEYS[p], (k || "").trim()); ls.set(PROV, p); gemWorking = {}; if (window.App && App.setAI) App.setAI(hasKey() ? sample : null); },
    setModel(m, p) { ls.set(MODEL_KEYS[p || provider()], m); },
    lastModel: () => gemWorking.quick || gemWorking.default || "",
    async test() { const r = await sample("Reply with exactly: ok", { modelTier: "quick" }); return r.text.trim() + (r.model ? " · " + r.model : ""); }
  };
})();
