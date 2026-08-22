# OpenCode Zen — Free Models with Vision/Multimodal Support

**Date of verification:** 2026-08-07  
**Source:** Official OpenCode Zen documentation ([opencode.ai/docs/zen](https://opencode.ai/docs/zen)), official model cards, provider documentation (DeepSeek, Xiaomi, NVIDIA, Cohere, Meituan), and model registries (models.dev, Mastra, Hugging Face).

---

## Summary

The official pricing table lists **8 free models**, while the live Zen model endpoint currently exposes a ninth free-suffixed ID, `ling-3.0-flash-free`. Across the models with confirmed metadata/cards, only **MiMo-V2.5 Free** natively supports image/vision input.

| Model ID | Free Status | Vision / Multimodal | Evidence |
|----------|-------------|---------------------|----------|
| `mimo-v2.5-free` | Free (limited-time) | ✅ **Yes** — native omnimodal (text, image, video, audio) | [OpenCode model registry](https://models.opencode.ai/api.json) / [Xiaomi MiMo](https://mimo.xiaomi.com) |
| `deepseek-v4-flash-free` | Free (limited-time) | ❌ Text-only | [OpenCode model registry](https://models.opencode.ai/api.json) |
| `laguna-s-2.1-free` | Free (limited-time) | ❌ Text-only | [OpenCode Zen docs](https://opencode.ai/docs/zen/) / model card |
| `ling-3.0-flash-free` | Exposed by live API; omitted from current pricing table | ❌ Text-only | [Ling-3.0 Flash card](https://huggingface.co/inclusionAI/Ling-3.0-flash) |
| `ling-3.0-tiny-free` | Free (limited-time) | ❌ Text-only | model card/provider metadata |
| `longcat-2.0-free` | Free (limited-time) | ❌ Text-only (LongCat-Next is multimodal, not 2.0) | [LongCat-2.0 card](https://huggingface.co/meituan-longcat/LongCat-2.0) |
| `north-mini-code-free` | Free (limited-time) | ❌ Text-only | [OpenCode model registry](https://models.opencode.ai/api.json) |
| `nemotron-3-ultra-free` | Free (limited-time) | ❌ Text-only (Nano Omni is multimodal, not Ultra) | [OpenCode model registry](https://models.opencode.ai/api.json) |
| `big-pickle` | Free (limited-time) | ❌ Text-only | [OpenCode Zen docs](https://opencode.ai/docs/zen/) / provider metadata |

---

## Detailed Findings

### ✅ MiMo-V2.5 Free (`mimo-v2.5-free`)
- **Vision support:** **Yes** — native omnimodal architecture with a 729M-parameter Vision Transformer (ViT) using hybrid window attention.
- **Modalities:** Text, **image**, video, audio.
- **Input methods:** Direct image URLs, Base64-encoded image data.
- **Free status on OpenCode Zen:** Listed as "MiMo-V2.5 Free" in the pricing table with $0.00 input/output/cached. OpenCode Zen docs note: *"MiMo-V2.5 Free is available on OpenCode for a limited time. The team is using this time to collect feedback and improve the model."*
- **Source:** [Xiaomi official](https://www.mi.com), [Hugging Face](https://huggingface.co), [DeepInfra](https://deepinfra.com).

---

### ❌ DeepSeek V4 Flash Free (`deepseek-v4-flash-free`)
- **Vision support:** **No** — text-only. The official DeepSeek API for `deepseek-v4-flash` and `deepseek-v4-pro` explicitly lists text-based capabilities only. Sending an image payload returns a deserialization error (schema does not accept `image_url`).
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"DeepSeek V4 Flash Free is available on OpenCode for a limited time."*
- **Source:** [DeepSeek API docs](https://api.deepseek.com), [DeepSeek V4 Pro site](https://deepseekv4pro.com).

---

### ❌ Laguna S 2.1 Free (`laguna-s-2.1-free`)
- **Vision support:** **No** — text-only MoE (118B params) designed for agentic coding. No native vision encoder. Uses headless Chromium for visual verification programmatically, not direct image input.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"Laguna S 2.1 Free is available on OpenCode for a limited time."*
- **Source:** [Hugging Face](https://huggingface.co), [Medium](https://medium.com), [Airstreet](https://airstreet.com).

---

### ❌ Ling-3.0 Flash Free (`ling-3.0-flash-free`)
- **Vision support:** **No confirmed support** — the official card is a text-generation model and documents agentic text/tool workflows, not image input.
- **Live Zen status:** The live `/zen/v1/models` endpoint exposes this ID, but the current Zen pricing table does not list it; treat its free status as subject to change.
- **Source:** [OpenCode Zen Models API](https://opencode.ai/zen/v1/models), [Ling-3.0 Flash card](https://huggingface.co/inclusionAI/Ling-3.0-flash).

---


### ❌ Ling-3.0-tiny Free (`ling-3.0-tiny-free`)
- **Vision support:** **No** — strictly text-in, text-out MoE (7.9B total, 1.3B active). No native vision capabilities.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"Ling-3.0-tiny Free is available on OpenCode for a limited time."*
- **Source:** [OpenRouter](https://openrouter.ai), [OrcaRouter](https://orcarouter.ai), [Novita](https://novita.ai).

---

### ❌ LongCat-2.0 Free (`longcat-2.0-free`)
- **Vision support:** **No** — 1.6T MoE language model for agentic coding. The multimodal variant in the family is **LongCat-Next**, not LongCat-2.0.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"LongCat-2.0 Free is available on OpenCode for a limited time."*
- **Source:** [LongCat.ai](https://longcat.ai), [LongCat.org](https://longcatai.org), [GitHub](https://github.com).

---

### ❌ North Mini Code Free (`north-mini-code-free`)
- **Vision support:** **No** — Cohere's text-only agentic coding MoE (30B total, 3B active). Apache 2.0 license.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"North Mini Code Free is available on OpenCode for a limited time."*
- **Source:** [Cohere](https://cohere.com), [OpenRouter](https://openrouter.ai), [Hugging Face](https://huggingface.co).

---

### ❌ Nemotron 3 Ultra Free (`nemotron-3-ultra-free`)
- **Vision support:** **No** — NVIDIA's flagship text-based reasoning model (550B total, 55B active). The multimodal variant is **Nemotron 3 Nano Omni**, not Ultra.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"Nemotron 3 Ultra Free (NVIDIA free endpoints): Trial use only — do not submit personal or confidential data."*
- **Source:** [NVIDIA](https://www.nvidia.com), [OpenRouter](https://openrouter.ai).

---

### ❌ Big Pickle (`big-pickle`)
- **Vision support:** **No** — stealth coding-focused text-only reasoning model (200k context). Model registry data (Mastra, models.dev) confirms text-only.
- **Free status on OpenCode Zen:** Listed as free with $0.00 pricing. Docs: *"Big Pickle is a stealth model that's free on OpenCode for a limited time."*
| Official pricing-table models (8) | **Free routing (limited-time promotional)** | $0.00 per 1M tokens for input/output/cached read. OpenCode Zen explicitly says each is "available for a limited time" to collect feedback. Not a permanent free tier. |
| `ling-3.0-flash-free` | **Live API exposure; pricing status unclear** | The live model list includes this free-suffixed ID, but the current pricing table omits it. Recheck before relying on it. |

---

## Free Routing vs. Free Limit

| Model | Free Type on OpenCode Zen | Notes |
|-------|---------------------------|-------|
| All 8 models | **Free routing (limited-time promotional)** | $0.00 per 1M tokens for input/output/cached read. OpenCode Zen explicitly states each is "available for a limited time" to collect feedback. Not a permanent free tier. |
| Nemotron 3 Ultra Free | **Free routing + NVIDIA trial terms** | Additional restriction: *"Trial use only — do not submit personal or confidential data. Your use is logged for security purposes and to improve NVIDIA products."* |
| North Mini Code Free | **Free routing + Apache 2.0 weights** | Model weights are open-source (self-hostable free). OpenCode Zen provides free *hosted* access for a limited time. |

**Key distinction:** OpenCode Zen's "free" models are **promotional free routing** through their gateway — you pay $0 per token while the promotion lasts. This is different from a permanent free tier or free self-hosted weights (though some, like North Mini Code, also have open weights).

---

## How to Use the Vision-Capable Free Model

If you need vision/multimodal input on OpenCode Zen for free (as of 2026-08-07):

```bash
# In OpenCode TUI
/connect          # select OpenCode Zen, paste API key
/models           # verify mimo-v2.5-free is listed
```

Then use model ID `opencode/mimo-v2.5-free` in your config or select it in the TUI.

**API endpoint:** `https://opencode.ai/zen/v1/chat/completions` (OpenAI-compatible)

**Image input format (OpenAI-compatible):**
```json
{
  "model": "opencode/mimo-v2.5-free",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe this image" },
        { "type": "image_url", "image_url": { "url": "https://example.com/image.png" } }
      ]
    }
  ]
}
```

---

## Uncertainties / Open Questions

1. **Promotion expiry dates** — OpenCode Zen states each free model is available "for a limited time" but does not publish exact expiry dates. The free status may change without notice.
2. **MiMo-V2.5 Free rate limits** — The free tier may have undocumented rate limits or token caps not visible in the pricing table.
3. **Model rotation** — OpenCode Zen docs note: *"The availability of specific free models can rotate."* New free models with vision may be added; existing ones may be removed.
4. **Privacy caveats** — Several free models (Nemotron 3 Ultra, North Mini Code, DeepSeek V4 Flash, MiMo-V2.5, Laguna, Ling, LongCat) have data-retention or logging clauses during the free period. See the [Privacy section](https://opencode.ai/docs/zen#privacy) of the Zen docs.
5. **API schema stability** — The Zen models endpoint (`/zen/v1/models`) currently returns only `id`, `object`, `created`, `owned_by` — no modality metadata. Vision support must be verified via provider docs.

---

## References

- [OpenCode Zen Documentation](https://opencode.ai/docs/zen) — official model list, pricing, endpoints, privacy notes.
- [OpenCode Zen Models API](https://opencode.ai/zen/v1/models) — live model list (JSON).
- [DeepSeek API Documentation](https://api.deepseek.com) — confirms text-only for V4 Flash/Pro.
- [Xiaomi MiMo-V2.5](https://www.mi.com) — native omnimodal architecture with ViT.
- [NVIDIA Nemotron 3](https://www.nvidia.com) — Ultra (text) vs Nano Omni (multimodal).
- [Cohere North Mini Code](https://cohere.com) — text-only agentic coding MoE.
- [LongCat](https://longcat.ai) — 2.0 (text) vs Next (multimodal).
- [Laguna S 2.1](https://huggingface.co) — text-only MoE for agentic coding.
- [Ling 3.0 Tiny](https://openrouter.ai) — text-only MoE.
- [Big Pickle](https://mastra.ai) — stealth text-only reasoning model.