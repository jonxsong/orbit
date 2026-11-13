import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useAppTheme } from '../theme/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'eyebrow';

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -1.1 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.25 },
  body: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1.2 },
};

type Props = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    muted?: boolean;
  }
>;

export function AppText({ variant = 'body', muted = false, style, children, ...props }: Props) {
  const { colors } = useAppTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[variants[variant], { color: muted ? colors.textMuted : colors.text }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

