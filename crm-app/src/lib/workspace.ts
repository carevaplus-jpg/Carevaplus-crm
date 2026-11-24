import type { Collections, PipelineStage, Profile } from '@/types';
import { COLLECTIONS } from '@/types';
import { nowIso, uid } from './id';

const DEFAULT_STAGES: Pick<PipelineStage, 'name' | 'probability' | 'color' | 'isWon' | 'isLost'>[] = [
  { name: 'New Lead', probability: 0.1, color: 'var(--color-stage-1)' },
  { name: 'Qualified', probability: 0.3, color: 'var(--color-stage-2)' },
  { name: 'Proposal Sent', probability: 0.5, color: 'var(--color-stage-4)' },
  { name: 'Negotiation', probability: 0.75, color: 'var(--color-stage-5)' },
  { name: 'Won', probability: 1, color: 'var(--color-stage-3)', isWon: true },
  { name: 'Lost', probability: 0, color: 'var(--color-stage-6)', isLost: true },
];

export const emptyCollections = (): Collections =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as unknown as Collections;

export interface WorkspaceInput {
  ownerName: string;
  ownerEmail: string;
  ownerTitle: string;
  companyName: string;
}

/** A brand-new, empty workspace: the owner (admin) and a default sales pipeline — no sample records. */
export function createWorkspace(input: WorkspaceInput) {
  const orgId = uid('org_');
  const createdAt = nowIso();
  const owner: Profile = {
    id: uid('profile_'),
    orgId,
    email: input.ownerEmail.trim(),
    name: input.ownerName.trim(),
    role: 'admin',
    title: input.ownerTitle.trim() || undefined,
    avatarHue: Math.floor(Math.random() * 360),
    createdAt,
  };

  const data = emptyCollections();
  data.profiles[owner.id] = owner;

  const pipelineId = uid('pipe_');
  data.pipelines[pipelineId] = { id: pipelineId, orgId, name: 'Sales Pipeline', isDefault: true };
  DEFAULT_STAGES.forEach((s, order) => {
    const id = uid('stg_');
    data.stages[id] = { id, orgId, pipelineId, order, ...s };
  });

  return { orgId, orgName: input.companyName.trim(), ownerId: owner.id, data };
}
