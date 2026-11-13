import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';
import { useAppTheme } from '../theme/theme';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, radius, spacing } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          borderWidth: 1,
          padding: spacing.lg,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

