import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../../components/app-text';
import { Card } from '../../components/card';
import { CheckControl } from '../../components/check-control';
import { Screen } from '../../components/screen';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

export default function HabitsScreen() {
  const habits = useOrbitStore((state) => state.habits);
  const toggleHabit = useOrbitStore((state) => state.toggleHabit);
  const { t } = useI18n();
  const { colors, spacing } = useAppTheme();

  const toggle = async (habitId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleHabit(habitId);
  };

  return (
    <Screen
      header={
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">{t('habitListTitle')}</AppText>
          <AppText muted>{t('habitListBody')}</AppText>
        </View>
      }
    >
      <View style={{ gap: spacing.md }}>
        {habits.map((habit) => (
          <Card key={habit.id} style={habit.completedToday ? { backgroundColor: colors.sageSoft, borderColor: 'transparent' } : undefined}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.surface }]}>
                <SymbolView name="repeat" size={22} tintColor={colors.sage} />
              </View>
              <View style={styles.copy}>
                <AppText variant="heading">{habit.title}</AppText>
                <AppText variant="caption" muted>{t('weeklyTarget', { count: habit.targetPerWeek })}</AppText>
              </View>
              <CheckControl checked={habit.completedToday} label={habit.title} onPress={() => void toggle(habit.id)} />
            </View>
            <View style={[styles.status, { borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md }]}>
              <AppText variant="caption" style={{ color: habit.completedToday ? colors.success : colors.textMuted }}>
                {habit.completedToday ? t('completedToday') : t('markComplete')}
              </AppText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  status: { borderTopWidth: StyleSheet.hairlineWidth },
});

