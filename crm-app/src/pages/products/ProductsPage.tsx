import { useState } from 'react';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/store';
import { useProducts } from '@/store/selectors';
import type { Product } from '@/types';
import { money } from '@/lib/format';
import { Badge, Button, confirm, DataTable, EmptyState, IconButton, Menu, PageHeader, PageShell, type Column } from '@/ui';
import { ProductFormDrawer } from './ProductFormDrawer';

export function ProductsPage() {
  const products = useProducts();
  const remove = useStore((s) => s.remove);
  const notify = useStore((s) => s.notify);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();

  const edit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const create = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const del = async (p: Product) => {
    const ok = await confirm({ title: 'Delete product?', body: `${p.name} will be removed from your catalog.`, danger: true, confirmLabel: 'Delete' });
    if (ok) {
      remove('products', p.id);
      notify({ kind: 'success', title: 'Product deleted' });
    }
  };

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Name', sortValue: (p) => p.name, render: (p) => (
      <div>
        <p className="font-medium text-ink-900">{p.name}</p>
        {p.description && <p className="text-xs text-ink-500 line-clamp-1">{p.description}</p>}
      </div>
    ) },
    { key: 'sku', header: 'SKU', render: (p) => <span className="text-ink-500 text-xs">{p.sku ?? '—'}</span> },
    { key: 'price', header: 'Price', align: 'right', sortValue: (p) => p.price, render: (p) => <span className="font-medium text-ink-800 tabular-nums">{money(p.price)}{p.unit && <span className="text-ink-400 font-normal"> {p.unit}</span>}</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <Menu
          trigger={<IconButton icon={<Pencil className="size-3.5" />} label="Options" size={28} />}
          items={[
            { label: 'Edit', icon: <Pencil className="size-4" />, onClick: () => edit(p) },
            { label: 'Delete', icon: <Trash2 className="size-4" />, onClick: () => del(p), danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader title="Products" subtitle="Your price list for quotes and invoices" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={create}>New product</Button>} />
      <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card">
        {products.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={create}>Add a product</Button>} />
        ) : (
          <DataTable columns={columns} rows={products} rowKey={(p) => p.id} />
        )}
      </div>
      <ProductFormDrawer open={formOpen} onClose={() => setFormOpen(false)} product={editing} />
    </PageShell>
  );
}
