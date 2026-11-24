import { Plus, Trash2 } from 'lucide-react';
import type { LineItem } from '@/types';
import { useProducts } from '@/store/selectors';
import { uid } from '@/lib/id';
import { lineItemsTotal } from '@/store/selectors';
import { money } from '@/lib/format';
import { Button, Select } from '@/ui';

export function LineItemsEditor({ items, onChange, taxPct, onTaxChange }: { items: LineItem[]; onChange: (items: LineItem[]) => void; taxPct: number; onTaxChange: (v: number) => void }) {
  const products = useProducts();
  const totals = lineItemsTotal(items, taxPct);

  const update = (id: string, patch: Partial<LineItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const addBlank = () => onChange([...items, { id: uid('li_'), name: '', qty: 1, unitPrice: 0, discountPct: 0 }]);
  const addProduct = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    onChange([...items, { id: uid('li_'), productId: p.id, name: p.name, qty: 1, unitPrice: p.price, discountPct: 0 }]);
  };

  return (
    <div>
      <div className="rounded-xl ring-1 ring-surface-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 text-xs text-ink-500">
              <th className="text-left font-semibold px-3 py-2">Item</th>
              <th className="text-right font-semibold px-2 py-2 w-16">Qty</th>
              <th className="text-right font-semibold px-2 py-2 w-24">Price</th>
              <th className="text-right font-semibold px-2 py-2 w-16">Disc %</th>
              <th className="text-right font-semibold px-3 py-2 w-28">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const lineTotal = item.qty * item.unitPrice * (1 - item.discountPct / 100);
              return (
                <tr key={item.id} className="border-t border-surface-100">
                  <td className="px-3 py-1.5">
                    <input className="w-full bg-transparent outline-none text-sm" value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} placeholder="Item name" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" className="w-full bg-transparent outline-none text-sm text-right" value={item.qty} onChange={(e) => update(item.id, { qty: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" className="w-full bg-transparent outline-none text-sm text-right" value={item.unitPrice} onChange={(e) => update(item.id, { unitPrice: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" className="w-full bg-transparent outline-none text-sm text-right" value={item.discountPct} onChange={(e) => update(item.id, { discountPct: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-ink-800 tabular-nums">{money(lineTotal)}</td>
                  <td>
                    <button onClick={() => remove(item.id)} className="text-ink-300 hover:text-danger-500 flex items-center justify-center w-full">
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-2.5">
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={addBlank}>Add line</Button>
        <Select value="" onChange={(e) => e.target.value && addProduct(e.target.value)} className="h-8 text-xs max-w-[220px]">
          <option value="">+ Add from catalog…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-56 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-ink-500">
            <span>Tax</span>
            <span className="flex items-center gap-1">
              <input type="number" value={taxPct} onChange={(e) => onTaxChange(Number(e.target.value) || 0)} className="w-12 text-right bg-transparent outline-none ring-1 ring-surface-300 rounded px-1" />%
            </span>
          </div>
          <div className="flex justify-between font-semibold text-ink-900 pt-1.5 border-t border-surface-200 tabular-nums">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
