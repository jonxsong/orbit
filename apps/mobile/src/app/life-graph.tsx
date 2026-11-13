import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../components/app-text';
import { Screen } from '../components/screen';
import { useI18n } from '../i18n/use-i18n';
import { useOrbitStore } from '../store/orbit-store';
import { useAppTheme } from '../theme/theme';

export default function LifeGraphScreen() {
  const goals = useOrbitStore((state) => state.goals);
  const milestones = useOrbitStore((state) => state.milestones);
  const tasks = useOrbitStore((state) => state.tasks);
  const habits = useOrbitStore((state) => state.habits);
  const { t } = useI18n();
  const { colors, spacing, radius } = useAppTheme();

  return (
    <Screen
      contentInsetBottom={40}
      header={
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} style={styles.back}>
            <SymbolView name="chevron.left" size={21} tintColor={colors.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="title">{t('lifeGraph')}</AppText>
            <AppText variant="caption" muted>{t('lifeGraphBody')}</AppText>
          </View>
        </View>
      }
    >
      <View style={{ gap: spacing.xl }}>
        {goals.map((goal) => {
          const linkedMilestones = milestones.filter((item) => item.goalId === goal.id);
          const linkedTasks = tasks.filter((item) => item.goalId === goal.id);
          const linkedHabits = habits.filter((item) => item.goalId === goal.id);
          return (
            <View key={goal.id} style={styles.graphGroup}>
              <View
                style={[
                  styles.goalNode,
                  { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderRadius: radius.lg },
                ]}
              >
                <SymbolView name="scope" size={26} tintColor={colors.accent} />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="heading">{goal.title}</AppText>
                  <AppText variant="caption" muted>
                    {goal.progress == null ? t('progressIndeterminate') : `${goal.progress}%`}
                  </AppText>
                </View>
              </View>

              <View style={[styles.trunk, { backgroundColor: colors.border }]} />
              <View style={[styles.branchLine, { backgroundColor: colors.border }]} />

              <View style={styles.nodes}>
                {linkedMilestones.map((milestone) => (
                  <GraphNode
                    key={milestone.id}
                    icon={milestone.status === 'completed' ? 'checkmark.circle.fill' : 'flag.fill'}
                    title={milestone.title}
                    subtitle={t('milestone')}
                    color={colors.sage}
                    background={colors.sageSoft}
                    border={colors.border}
                  />
                ))}
                {linkedHabits.map((habit) => (
                  <GraphNode
                    key={habit.id}
                    icon="repeat"
                    title={habit.title}
                    subtitle={t('habits')}
                    color={colors.blue}
                    background={colors.blueSoft}
                    border={colors.border}
                  />
                ))}
                {linkedTasks.map((task) => (
                  <GraphNode
                    key={task.id}
                    icon={task.status === 'completed' ? 'checkmark' : 'circle'}
                    title={task.title}
                    subtitle={t('today')}
                    color={colors.textMuted}
                    background={colors.surface}
                    border={colors.border}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function GraphNode({
  icon,
  title,
  subtitle,
  color,
  background,
  border,
}: {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  background: string;
  border: string;
}) {
  return (
    <View style={[styles.node, { backgroundColor: background, borderColor: border }]}>
      <SymbolView name={icon as never} size={20} tintColor={color} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" numberOfLines={2}>{title}</AppText>
        <AppText variant="caption" muted>{subtitle}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  graphGroup: { alignItems: 'center' },
  goalNode: { width: '100%', minHeight: 92, borderWidth: 1.5, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  trunk: { width: 2, height: 26 },
  branchLine: { width: '72%', height: 2 },
  nodes: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12 },
  node: { width: '48.5%', minHeight: 84, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});

