import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useStore } from '@/store';
import type { Collections } from '@/types';
import { emptyCollections } from './workspace';
import { isNativeApp } from './pwa';

export interface BackupFile {
  app: 'careva-crm';
  version: 1;
  exportedAt: string;
  orgId: string;
  orgName: string;
  currentProfileId: string | null;
  data: Collections;
}

function buildBackup(): BackupFile {
  const s = useStore.getState();
  return { app: 'careva-crm', version: 1, exportedAt: new Date().toISOString(), orgId: s.orgId, orgName: s.orgName, currentProfileId: s.currentProfileId, data: s.data };
}

/** Saves the whole workspace as one JSON file — shared via the Android share sheet (Drive, WhatsApp, email…) or downloaded on web. */
export async function exportBackup(): Promise<void> {
  const json = JSON.stringify(buildBackup());
  const name = `careva-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (isNativeApp()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: 'Careva+ CRM backup', files: [uri], dialogTitle: 'Save your Careva+ CRM backup' });
    } catch (e) {
      if (!String(e).toLowerCase().includes('cancel')) throw e;
    }
    return;
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackup(text: string): BackupFile {
  let parsed: Partial<BackupFile>;
  try {
    parsed = JSON.parse(text) as Partial<BackupFile>;
  } catch {
    throw new Error('This file is not a Careva+ CRM backup.');
  }
  if (parsed.app !== 'careva-crm' || !parsed.data || typeof parsed.data !== 'object' || !parsed.data.profiles) {
    throw new Error('This file is not a Careva+ CRM backup.');
  }
  return { ...(parsed as BackupFile), data: { ...emptyCollections(), ...parsed.data } };
}
