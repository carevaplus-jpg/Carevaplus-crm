import { create } from 'zustand';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmState {
  open: boolean;
  title: string;
  body: string;
  danger: boolean;
  confirmLabel: string;
  resolve?: (v: boolean) => void;
}

const useConfirmStore = create<ConfirmState>(() => ({ open: false, title: '', body: '', danger: false, confirmLabel: 'Confirm' }));

export function confirm(opts: { title: string; body: string; danger?: boolean; confirmLabel?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({ open: true, title: opts.title, body: opts.body, danger: !!opts.danger, confirmLabel: opts.confirmLabel ?? 'Confirm', resolve });
  });
}

export function ConfirmHost() {
  const s = useConfirmStore();
  const close = (v: boolean) => {
    s.resolve?.(v);
    useConfirmStore.setState({ open: false });
  };
  return (
    <Modal open={s.open} onClose={() => close(false)} title={s.title} width={380} footer={
      <>
        <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
        <Button variant={s.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{s.confirmLabel}</Button>
      </>
    }>
      <p className="text-sm text-ink-600">{s.body}</p>
    </Modal>
  );
}
