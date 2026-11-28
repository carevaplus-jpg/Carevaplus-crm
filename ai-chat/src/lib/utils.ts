export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const lineCount = (s: string) => (s.match(/\n/g) || []).length + 1;
export const isMobileQuery = '(max-width: 820px)';
export const isWideQuery = '(min-width: 1100px)';
export const matches = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    return true;
  }
}

export function download(name: string, text: string, type = 'text/plain') {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downscaleImage(file: File, max = 1568): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
