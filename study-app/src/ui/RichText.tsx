import { Fragment } from 'react';
import { View } from 'react-native';

import { colors, fonts, space } from '@/theme/tokens';

import { T } from './Text';

/** Tiny markdown subset for tutor replies: **bold**, *italic* / _italic_, bullet & numbered lists. */
function inline(text: string, base: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**')) return <T key={i} style={{ fontFamily: fonts.bodyBold, color: colors.text }}>{p.slice(2, -2)}</T>;
    if ((p.startsWith('*') && p.endsWith('*')) || (p.startsWith('_') && p.endsWith('_')))
      return <T key={i} style={{ fontStyle: 'italic', color: base }}>{p.slice(1, -1)}</T>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function RichText({ text, color = colors.text }: { text: string; color?: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: space.xs }} />;
        const bullet = line.match(/^\s*(?:[•\-–]|\d+\.)\s+(.*)$/);
        if (bullet) {
          const marker = line.trim().match(/^\d+\./)?.[0] ?? '•';
          return (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 2 }}>
              <T variant="body" color={colors.primary} style={{ minWidth: 16 }}>{marker}</T>
              <T variant="body" color={color} style={{ flex: 1 }}>{inline(bullet[1], color)}</T>
            </View>
          );
        }
        return (
          <T key={i} variant="body" color={color}>
            {inline(line, color)}
          </T>
        );
      })}
    </View>
  );
}
