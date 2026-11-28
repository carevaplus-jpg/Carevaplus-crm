import { create } from 'zustand';

interface AskState {
  open: boolean; title: string; text?: string; value: string; input: boolean; ok: string; danger: boolean;
  resolve?: (v: string | boolean | null) => void;
}
export const useAsk = create<AskState>()(() => ({ open: false, title: '', value: '', input: false, ok: 'OK', danger: false }));

export function ask(o: { title: string; text?: string; value?: string; input?: boolean; ok?: string; danger?: boolean }) {
  return new Promise<string | boolean | null>((resolve) => {
    useAsk.setState({ open: true, title: o.title, text: o.text, value: o.value ?? '', input: o.input ?? false, ok: o.ok ?? 'OK', danger: o.danger ?? false, resolve });
  });
}
export const confirmDelete = (title: string, text: string, ok = 'Delete') => ask({ title, text, ok, danger: true });
