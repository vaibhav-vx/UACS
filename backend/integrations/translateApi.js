// ═══════════════════════════════════════
// UACS Translation Integration
// Uses Gemini API, Google, and MyMemory with fallbacks
// ═══════════════════════════════════════

import axios from 'axios';

// Language code mapping (UACS names → ISO codes)
const LANG_CODES = {
  en:      'en',
  hindi:   'hi',
  marathi: 'mr',
  tamil:   'ta',
  telugu:  'te',
  hi: 'hi', mr: 'mr', ta: 'ta', te: 'te',
};

const LANG_NAMES = {
  hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', en: 'English',
};

/**
 * Translate text using Gemini API via REST if a key is provided
 */
async function translateViaGemini(text, targetLangName) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key present in env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{
        text: `Translate this text from English to ${targetLangName}. Respond only with the translated text, do not add any quotes or extra explanation:\n\n${text}`
      }]
    }]
  };

  const res = await axios.post(url, payload, { timeout: 15000 });
  const translated = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (translated) {
    return translated;
  }
  throw new Error('Empty response from Gemini API');
}

/**
 * Translate text using MyMemory API (free, no key required up to 5000 words/day)
 */
async function translateViaMyMemory(text, sourceLang, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  const res = await axios.get(url, { timeout: 15000 });
  if (res.data?.responseStatus === 200 && res.data?.responseData?.translatedText) {
    const translated = res.data.responseData.translatedText;
    // MyMemory sometimes returns the original text unchanged if it can't translate
    if (translated.toLowerCase() !== text.toLowerCase()) {
      return translated;
    }
  }
  throw new Error('MyMemory could not translate this text');
}

/**
 * Try Google Translate (unofficial endpoint, may rate-limit)
 */
async function translateViaGoogle(text, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (Array.isArray(res.data?.[0])) {
    const parts = res.data[0].map(s => s?.[0] || '').filter(Boolean);
    const joined = parts.join('');
    if (joined && joined.length > 0) return joined;
  }
  throw new Error('Google translate failed');
}

/**
 * Main translate function — tries Gemini API first (if enabled), falls back to Google, then MyMemory
 */
export async function translateText(text, source = 'en', target = 'hi') {
  if (!text?.trim() || target === source || target === 'en') return text;

  const srcCode = LANG_CODES[source] || source;
  const tgtCode = LANG_CODES[target] || target;
  const tgtLangName = LANG_NAMES[tgtCode] || target;

  // 1. Try Gemini API first if API key exists
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const result = await translateViaGemini(text, tgtLangName);
      console.log(`[UACS TRANSLATE] ✅ Gemini API: ${source} → ${target}`);
      return result;
    } catch (e) {
      console.warn(`[UACS TRANSLATE] Gemini failed (${e.message}), falling back...`);
    }
  }

  // 2. Try Google next (faster, more accurate)
  try {
    const result = await translateViaGoogle(text, srcCode, tgtCode);
    console.log(`[UACS TRANSLATE] ✅ Google: ${source} → ${target}`);
    return result;
  } catch (e) {
    console.warn(`[UACS TRANSLATE] Google failed (${e.message}), trying MyMemory...`);
  }

  // 3. Fall back to MyMemory
  try {
    const result = await translateViaMyMemory(text, srcCode, tgtCode);
    console.log(`[UACS TRANSLATE] ✅ MyMemory: ${source} → ${target}`);
    return result;
  } catch (e) {
    console.warn(`[UACS TRANSLATE] MyMemory failed (${e.message}). Using prefixed fallback.`);
  }

  // Last resort: prefix with language name
  return `[${tgtLangName || target}] ${text}`;
}

/**
 * Translate to multiple languages in parallel
 * Returns { hi: '...', ta: '...', en: '...(original)...' }
 */
export async function translateToMultiple(text, targetLangs) {
  const results = await Promise.all(
    targetLangs.map(async (lang) => {
      const code = LANG_CODES[lang.toLowerCase()] || lang;
      if (code === 'en') {
        return { lang, text }; // English stays as-is (master content)
      }
      try {
        const translated = await translateText(text, 'en', code);
        return { lang, text: translated };
      } catch (err) {
        console.error(`[UACS TRANSLATE] ${lang} failed: ${err.message}`);
        return { lang, text: `[${LANG_NAMES[code] || lang}] ${text}` };
      }
    })
  );

  const translations = {};
  results.forEach(r => { translations[r.lang] = r.text; });
  return translations;
}

export default { translateText, translateToMultiple };
