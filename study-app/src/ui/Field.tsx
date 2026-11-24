import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, noOutline, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { T } from './Text';

export function Field({ label, icon, big, style, ...rest }: TextInputProps & { label?: string; icon?: string; big?: boolean }) {
    return (
      <View style={{ gap: space.sm }}>
        {label && <T variant="micro" color={colors.textFaint}>{label}</T>}
        <View style={[styles.wrap, rest.multiline && { alignItems: 'flex-start', paddingVertical: space.md }]}>
          {icon && <Icon name={icon} size={18} color={colors.textFaint} />}
          <TextInput
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
            {...rest}
            style={[styles.input, big && { fontSize: 22, fontFamily: fonts.displaySemi }, rest.multiline && { minHeight: 120, textAlignVertical: 'top' }, style]}
          />
        </View>
      </View>
    );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, paddingVertical: 12, ...noOutline },
});
