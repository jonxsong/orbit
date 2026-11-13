import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { useAppTheme } from '../theme/theme';

type Props = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel?: string;
}>;

export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityLabel,
}: Props) {
  const { colors } = useAppTheme();
  const backgroundColor =
    variant === 'primary' ? colors.text : variant === 'secondary' ? colors.surfaceMuted : 'transparent';
  const textColor = variant === 'primary' ? colors.background : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} /> : null}
        <AppText variant="label" style={{ color: textColor }}>
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
});

