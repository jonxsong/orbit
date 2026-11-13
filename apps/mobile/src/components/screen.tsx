import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/theme';

type Props = PropsWithChildren<{
  header?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentInsetBottom?: number;
}>;

export function Screen({ children, header, refreshing, onRefresh, contentInsetBottom = 118 }: Props) {
  const { colors, spacing } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.text} />
          ) : undefined
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: contentInsetBottom }}
      >
        {header ? <View style={{ paddingTop: spacing.md, paddingBottom: spacing.lg }}>{header}</View> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});

