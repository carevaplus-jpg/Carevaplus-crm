import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { useOrgId } from '@/store/selectors';
import type { Product } from '@/types';
import { uid, nowIso } from '@/lib/id';
import { Button, Drawer, Input, Textarea } from '@/ui';

export function ProductFormDrawer({ open, onClose, product }: { open: boolean; onClose: () => void; product?: Product }) {
  const upsert = useStore((s) => s.upsert);
  const notify = useStore((s) => s.notify);
  const orgId = useOrgId();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setPrice(product ? String(product.price) : '');
    setUnit(product?.unit ?? '');
    setDescription(product?.description ?? '');
  }, [open, product]);

  const save = () => {
    if (!name.trim()) return;
    upsert('products', {
      id: product?.id ?? uid('prod_'),
      orgId,
      name: name.trim(),
      sku: sku.trim() || undefined,
      price: Number(price) || 0,
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
      active: product?.active ?? true,
      createdAt: product?.createdAt ?? nowIso(),
    });
    notify({ kind: 'success', title: product ? 'Product updated' : 'Product added', subtitle: name });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'New product'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>{product ? 'Save changes' : 'Add product'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Product / service name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="/mo, one-time…" />
        </div>
        <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Drawer>
  );
}
