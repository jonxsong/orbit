import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../../components/app-text';
import { Card } from '../../components/card';
import { CheckControl } from '../../components/check-control';
import { Screen } from '../../components/screen';
import { SectionHeader } from '../../components/section-header';
import { formatLongDate, localDateKey } from '../../domain/dates';
import { recommend } from '../../domain/recommendations';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

function greetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
}

export default function TodayScreen() {
  const snapshot = useOrbitStore((state) => state);
  const toggleTask = useOrbitStore((state) => state.toggleTask);
  const toggleHabit = useOrbitStore((state) => state.toggleHabit);
  const { language, t } = useI18n();
  const { colors, spacing, radius } = useAppTheme();
  const today = localDateKey();
  const tasks = snapshot.tasks.filter(
    (task) => task.status !== 'cancelled' && (task.dueDate === today || task.dueDate == null),
  );
  const activeGoal = snapshot.goals.find((goal) => goal.status === 'active');
  const insight = recommend(snapshot);

  const handleTask = async (taskId: string) => {
    await Haptics.selectionAsync();
    await toggleTask(taskId);
  };

  const handleHabit = async (habitId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleHabit(habitId);
  };

  return (
    <Screen
      header={
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppText variant="eyebrow" style={{ color: colors.sage }}>
              {formatLongDate(new Date(), language).toUpperCase()}
            </AppText>
            <AppText variant="title">{t(greetingKey())}</AppText>
          </View>
          <Link href="/quick-add" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('addTask')}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.text, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <SymbolView name="plus" size={22} tintColor={colors.background} />
            </Pressable>
          </Link>
        </View>
      }
    >
      {activeGoal ? (
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: 'transparent' }}>
          <View style={styles.cardTopline}>
            <AppText variant="eyebrow" style={{ color: colors.accent }}>{t('activeGoal').toUpperCase()}</AppText>
            {activeGoal.progress != null ? <AppText variant="label">{activeGoal.progress}%</AppText> : null}
          </View>
          <AppText variant="heading" style={{ marginTop: spacing.sm }}>{activeGoal.title}</AppText>
          {activeGoal.progress != null ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: activeGoal.progress }}
              style={[styles.progressTrack, { backgroundColor: `${colors.text}18`, marginTop: spacing.lg }]}
            >
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${activeGoal.progress}%` }]} />
            </View>
          ) : null}
          <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>
            {activeGoal.totalMilestones > 0
              ? t('milestonesComplete', {
                  done: activeGoal.completedMilestones,
                  total: activeGoal.totalMilestones,
                })
              : t('progressIndeterminate')}
          </AppText>
        </Card>
      ) : null}

      <SectionHeader title={t('priorities')} />
      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        {tasks.length === 0 ? (
          <View style={{ padding: spacing.lg, gap: spacing.xs }}>
            <AppText variant="label">{t('noTasks')}</AppText>
            <AppText variant="caption" muted>{t('noTasksBody')}</AppText>
          </View>
        ) : (
          tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.item,
                { borderBottomColor: colors.border },
                index === tasks.length - 1 && styles.lastItem,
              ]}
            >
              <CheckControl checked={task.status === 'completed'} label={task.title} onPress={() => void handleTask(task.id)} />
              <View style={styles.itemCopy}>
                <AppText
                  variant="label"
                  style={task.status === 'completed' ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}
                >
                  {task.title}
                </AppText>
                {task.estimatedMinutes ? <AppText variant="caption" muted>{task.estimatedMinutes} min</AppText> : null}
              </View>
            </View>
          ))
        )}
      </View>

      {snapshot.habits.length > 0 ? (
        <>
          <SectionHeader title={t('dailyRhythms')} />
          <View style={styles.habitGrid}>
            {snapshot.habits.slice(0, 4).map((habit) => (
              <Pressable
                key={habit.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: habit.completedToday }}
                accessibilityLabel={habit.title}
                onPress={() => void handleHabit(habit.id)}
                style={({ pressed }) => [
                  styles.habitCard,
                  {
                    backgroundColor: habit.completedToday ? colors.sageSoft : colors.surface,
                    borderColor: habit.completedToday ? 'transparent' : colors.border,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <SymbolView
                  name={habit.completedToday ? 'checkmark.circle.fill' : 'circle'}
                  size={25}
                  tintColor={habit.completedToday ? colors.sage : colors.textMuted}
                />
                <AppText variant="label" numberOfLines={2}>{habit.title}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title={t('insight')} />
      <Card style={{ backgroundColor: colors.blueSoft, borderColor: 'transparent' }}>
        <View style={styles.insightTitle}>
          <View style={[styles.insightIcon, { backgroundColor: colors.surface }]}>
            <SymbolView name="sparkles" size={20} tintColor={colors.blue} />
          </View>
          <AppText variant="heading" style={{ flex: 1 }}>{t(insight.titleKey)}</AppText>
        </View>
        <AppText muted style={{ marginTop: spacing.md }}>
          {t(insight.bodyKey, { count: insight.evidenceCount })}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { gap: 7, flex: 1 },
  addButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  list: { borderWidth: 1, overflow: 'hidden' },
  item: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  lastItem: { borderBottomWidth: 0 },
  itemCopy: { flex: 1, gap: 4 },
  habitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  habitCard: { width: '48.5%', minHeight: 104, padding: 16, borderWidth: 1, justifyContent: 'space-between', gap: 12 },
  insightTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

