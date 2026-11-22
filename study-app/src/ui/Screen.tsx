import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';

import { Aurora } from './Aurora';

export const TAB_BAR_SPACE = 110;

/** Standard immersive screen: aurora backdrop, safe areas, max content width for tablets/web. */
export function Screen({
  children,
  scroll = true,
  tabs = false,
  palette,
  header,
  contentStyle,
  ...scrollProps
}: {
  children: ReactNode;
  scroll?: boolean;
  tabs?: boolean;
  palette?: string[];
  header?: ReactNode;
  contentStyle?: ScrollViewProps['contentContainerStyle'];
} & Omit<ScrollViewProps, 'children'>) {
  const insets = useSafeAreaInsets();
  const bottom = (tabs ? TAB_BAR_SPACE : space.xxl) + insets.bottom;
  return (
    <View style={styles.root}>
      <Aurora palette={palette} />
      {header && <View style={{ paddingTop: insets.top }}>{header}</View>}
      {scroll ? (
        <ScrollView
          {...scrollProps}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: header ? space.sm : insets.top + space.lg, paddingBottom: bottom },
            contentStyle,
          ]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1, paddingTop: header ? 0 : insets.top, paddingBottom: tabs ? bottom : insets.bottom }, contentStyle]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space.xl, gap: space.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
