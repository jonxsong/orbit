import { StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { useAppTheme } from '../theme/theme';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { spacing } = useAppTheme();
  return (
    <View style={[styles.row, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
      <AppText variant="heading">{title}</AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});

