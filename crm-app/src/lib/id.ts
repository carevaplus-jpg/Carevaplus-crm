/** Collision-resistant id, prefixed by record kind for readability in dev tools. */
export function uid(prefix = ''): string {
  const t = Date.now().toString(36);
  let r = '';
  for (let i = 0; i < 10; i++) r += Math.floor(Math.random() * 36).toString(36);
  return `${prefix}${t}${r}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
