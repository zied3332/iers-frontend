// Cache local pour ne pas retraduire les mêmes textes
const cache = new Map<string, string>();

export async function translateText(text: string): Promise<string> {
  const trimmed = text.trim();

  // Ignorer textes vides, chiffres, trop courts
  if (!trimmed || trimmed.length < 2 || /^\d+$/.test(trimmed)) return text;
  if (cache.has(trimmed)) return cache.get(trimmed)!;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|fr`
    );
    const data = await res.json();
    const translated = data.responseData.translatedText || text;
    cache.set(trimmed, translated);
    return translated;

  } catch (err) {
    console.error('MyMemory error:', err);
    return text;
  }
}

// Traduire tout le DOM automatiquement
export async function translateDOM(root: HTMLElement = document.body) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
acceptNode(node) {
  const parent = node.parentElement;
  if (!parent) return NodeFilter.FILTER_REJECT;

  const tag = parent.tagName;
  if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE'].includes(tag))
    return NodeFilter.FILTER_REJECT;

  // ← Ajouter cette ligne
  if (parent.closest('[data-notranslate]'))
    return NodeFilter.FILTER_REJECT;

  if (!node.textContent?.trim())
    return NodeFilter.FILTER_REJECT;

  return NodeFilter.FILTER_ACCEPT;
}
    }
  );

  const nodes: Text[] = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node as Text);
  }

  await Promise.all(
    nodes.map(async (n) => {
      const original = n.textContent || '';
      const translated = await translateText(original);
      if (translated !== original) {
        n.textContent = translated;
      }
    })
  );
}