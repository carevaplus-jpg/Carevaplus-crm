import { useAsk } from './askStore';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export function AskDialog() {
  const s = useAsk();
  const close = (v: string | boolean | null) => { s.resolve?.(v); useAsk.setState({ open: false, resolve: undefined }); };
  const ok = () => close(s.input ? s.value : true);
  return (
    <Dialog open={s.open} onClose={() => close(null)} label={s.title} className="!w-[min(420px,calc(100vw-24px))]">
      <form className="flex flex-col gap-3.5 p-5" onSubmit={(e) => { e.preventDefault(); ok(); }}>
        <h2 className="m-0 font-serif text-[22px] font-medium">{s.title}</h2>
        {s.text && <p className="m-0 text-ink-2">{s.text}</p>}
        {s.input && <input data-autofocus value={s.value} maxLength={120} onChange={(e) => useAsk.setState({ value: e.target.value })} onFocus={(e) => e.target.select()}
          className="rounded-[10px] border border-line bg-raised px-3 py-2.5 text-[15px] outline-none focus:border-line-strong" />}
        <div className="flex justify-end gap-2">
          <Button onClick={() => close(null)}>Cancel</Button>
          <Button type="submit" variant={s.danger ? 'danger' : 'primary'} data-autofocus={!s.input || undefined}>{s.ok}</Button>
        </div>
      </form>
    </Dialog>
  );
}
