import type { RefObject } from 'react';
import type { Conversation } from '../../lib/types';
import { Menu, MenuItem, MenuSep } from '../ui/Menu';
import { deleteChat, exportChat, renameChat, toggleStar } from './chatActions';

export function ChatMenu({ conv, open, onClose, anchor, placement }: { conv: Conversation; open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>; placement?: 'auto' | 'right' | 'below' }) {
  return (
    <Menu open={open} onClose={onClose} anchor={anchor} placement={placement}>
      <MenuItem icon="star" label={conv.starred ? 'Unstar' : 'Star'} onSelect={() => toggleStar(conv)} />
      <MenuItem icon="pencil" label="Rename" onSelect={() => renameChat(conv)} />
      <MenuItem icon="download" label="Export as Markdown" onSelect={() => exportChat(conv)} />
      <MenuSep />
      <MenuItem icon="trash" label="Delete" danger onSelect={() => deleteChat(conv)} />
    </Menu>
  );
}
