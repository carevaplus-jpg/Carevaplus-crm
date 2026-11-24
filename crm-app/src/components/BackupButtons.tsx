import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { useStore } from '@/store';
import { exportBackup, parseBackup } from '@/lib/backup';
import { fmtDate } from '@/lib/format';
import { Button, confirm } from '@/ui';

export function BackupButton() {
  const notify = useStore((s) => s.notify);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      notify({ kind: 'danger', title: 'Backup failed', subtitle: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="primary" icon={<Download className="size-4" />} onClick={run} loading={busy}>
      Back up now
    </Button>
  );
}

export function RestoreBackupButton({ variant = 'secondary', className }: { variant?: 'secondary' | 'ghost'; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreBackup = useStore((s) => s.restoreBackup);
  const notify = useStore((s) => s.notify);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (useStore.getState().currentProfileId) {
        const ok = await confirm({
          title: 'Restore this backup?',
          body: `Everything currently on this device will be replaced with the backup of ${backup.orgName || 'your workspace'} from ${fmtDate(backup.exportedAt)}.`,
          danger: true,
          confirmLabel: 'Replace & restore',
        });
        if (!ok) return;
      }
      restoreBackup(backup);
      notify({ kind: 'success', title: 'Backup restored', subtitle: backup.orgName });
    } catch (err) {
      notify({ kind: 'danger', title: 'Could not restore', subtitle: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="application/json,.json,text/plain,application/octet-stream" className="hidden" onChange={onFile} />
      <Button variant={variant} icon={<Upload className="size-4" />} onClick={() => inputRef.current?.click()} className={className}>
        Restore from backup
      </Button>
    </>
  );
}
