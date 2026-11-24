import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Building2, CalendarClock } from 'lucide-react';
import type { Deal } from '@/types';
import { useCompany } from '@/store/selectors';
import { money, fmtDateShort, daysUntil } from '@/lib/format';
import { AvatarOf } from '@/components/record/ActivityTimeline';
import { cn } from '@/ui';

export function DealCard({ deal, onOpen, overlay = false }: { deal: Deal; onOpen?: () => void; overlay?: boolean }) {
  const company = useCompany(deal.companyId);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, data: { deal } });

  const days = deal.expectedCloseDate ? daysUntil(deal.expectedCloseDate) : null;
  const overdue = days !== null && days < 0 && deal.status === 'open';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onOpen?.()}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'bg-white rounded-lg ring-1 ring-surface-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-card transition-shadow touch-none',
        isDragging && !overlay && 'opacity-30',
        overlay && 'shadow-float rotate-2',
      )}
    >
      <p className="text-sm font-medium text-ink-900 leading-snug line-clamp-2">{deal.name}</p>
      <p className="text-sm font-semibold text-ink-800 mt-1.5 tabular-nums">{money(deal.amount, deal.currency)}</p>
      {company && (
        <p className="text-xs text-ink-500 mt-1.5 flex items-center gap-1 truncate">
          <Building2 className="size-3 shrink-0" />
          {company.name}
        </p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        {deal.expectedCloseDate ? (
          <span className={cn('text-[11px] flex items-center gap-1', overdue ? 'text-danger-500 font-medium' : 'text-ink-400')}>
            <CalendarClock className="size-3" />
            {fmtDateShort(deal.expectedCloseDate)}
          </span>
        ) : (
          <span />
        )}
        <AvatarOf id={deal.ownerId} size={22} />
      </div>
    </div>
  );
}
