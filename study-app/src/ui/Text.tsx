import { Text as RNText, type TextProps } from 'react-native';

import { colors, type as typeScale } from '@/theme/tokens';

type Variant = keyof typeof typeScale;

export function T({
  variant = 'body',
  color = colors.text,
  center,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; center?: boolean }) {
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color }, center && { textAlign: 'center' }, variant === 'micro' && { textTransform: 'uppercase' }, style]}
    />
  );
}
