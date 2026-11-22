import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Tap } from './Pressable';
import { T } from './Text';

export function IconButton({ icon, onPress, color = colors.text, label, size = 40 }: { icon: string; onPress?: () => void; color?: string; label: string; size?: number }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} style={[styles.iconBtn, { width: size, height: size }]}>
      <Icon name={icon} size={size * 0.5} color={color} />
    </Tap>
  );
}

export function Header({ title, subtitle, right, back = true, onBack }: { title?: string; subtitle?: string; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  return (
    <View style={styles.row}>
      {back ? (
        <IconButton icon="chevron-back" label="Go back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      ) : (
        <View style={{ width: 40 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title && <T variant="h3" numberOfLines={1}>{title}</T>}
        {subtitle && <T variant="small" color={colors.textDim} numberOfLines={1}>{subtitle}</T>}
      </View>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.sectionHead}>
        <T variant="h3">{title}</T>
        {action && (
          <Tap onPress={onAction} feedback="tap">
            <T variant="small" color={colors.primary}>{action}</T>
          </Tap>
        )}
      </View>
      {children}
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.textDim} />
      </View>
      <T variant="h3" center>{title}</T>
      {body && <T variant="small" color={colors.textDim} center style={{ maxWidth: 280 }}>{body}</T>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm, width: '100%', maxWidth: 760, alignSelf: 'center' },
  iconBtn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm },
});
