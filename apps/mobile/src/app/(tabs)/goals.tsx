import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { Screen } from '../../components/screen';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

export default function GoalsScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [milestoneGoalId, setMilestoneGoalId] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const { t } = useI18n();
  const goals = useOrbitStore((state) => state.goals);
  const addGoal = useOrbitStore((state) => state.addGoal);
  const addMilestone = useOrbitStore((state) => state.addMilestone);
  const milestones = useOrbitStore((state) => state.milestones);
  const toggleMilestone = useOrbitStore((state) => state.toggleMilestone);
  const busy = useOrbitStore((state) => state.busy);
  const { colors, spacing, radius } = useAppTheme();

  const create = async () => {
    if (title.trim().length < 3) return;
    await addGoal(title);
    setTitle('');
    setShowCreate(false);
  };

  const createMilestone = async () => {
    if (!milestoneGoalId || milestoneTitle.trim().length < 3) return;
    await addMilestone(milestoneGoalId, milestoneTitle);
    setMilestoneTitle('');
    setMilestoneGoalId(null);
  };

  return (
    <>
      <Screen
        header={
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <AppText variant="title">{t('goalListTitle')}</AppText>
              <AppText muted>{t('goalListBody')}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('addGoal')}
              onPress={() => setShowCreate(true)}
              style={[styles.iconButton, { backgroundColor: colors.text }]}
            >
              <SymbolView name="plus" size={22} tintColor={colors.background} />
            </Pressable>
          </View>
        }
      >
        <Link href="/life-graph" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.graphLink,
              {
                backgroundColor: colors.sageSoft,
                borderRadius: radius.md,
                opacity: pressed ? 0.72 : 1,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <View style={[styles.goalIcon, { backgroundColor: colors.surface }]}>
              <SymbolView name="point.3.connected.trianglepath.dotted" size={24} tintColor={colors.sage} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">{t('lifeGraph')}</AppText>
              <AppText variant="caption" muted>{t('lifeGraphBody')}</AppText>
            </View>
            <SymbolView name="chevron.right" size={18} tintColor={colors.textMuted} />
          </Pressable>
        </Link>
        <View style={{ gap: spacing.md }}>
          {goals.map((goal, index) => {
            const goalMilestones = milestones.filter((milestone) => milestone.goalId === goal.id);
            return (
            <Card key={goal.id} style={index === 0 ? { backgroundColor: colors.accentSoft, borderColor: 'transparent' } : undefined}>
              <View style={styles.goalTop}>
                <View style={[styles.goalIcon, { backgroundColor: index === 0 ? colors.surface : colors.sageSoft }]}>
                  <SymbolView name={index === 0 ? 'scope' : 'circle.hexagongrid.fill'} size={24} tintColor={index === 0 ? colors.accent : colors.sage} />
                </View>
                <AppText variant="caption" muted>{goal.category.toUpperCase()}</AppText>
              </View>
              <AppText variant="heading" style={{ marginTop: spacing.md }}>{goal.title}</AppText>
              {goal.progress != null ? (
                <>
                  <View style={[styles.progressTrack, { backgroundColor: `${colors.text}18`, marginTop: spacing.lg }]}>
                    <View style={[styles.progressFill, { backgroundColor: index === 0 ? colors.accent : colors.sage, width: `${goal.progress}%` }]} />
                  </View>
                  <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>
                    {t('milestonesComplete', { done: goal.completedMilestones, total: goal.totalMilestones })}
                  </AppText>
                </>
              ) : (
                <AppText variant="caption" muted style={{ marginTop: spacing.md }}>{t('noMilestones')}</AppText>
              )}
              {goalMilestones.length > 0 ? (
                <View style={[styles.milestoneList, { borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md }]}>
                  {goalMilestones.map((milestone) => (
                    <Pressable
                      key={milestone.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: milestone.status === 'completed' }}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        void toggleMilestone(milestone.id);
                      }}
                      style={styles.milestoneRow}
                    >
                      <SymbolView
                        name={milestone.status === 'completed' ? 'checkmark.circle.fill' : 'circle'}
                        size={22}
                        tintColor={milestone.status === 'completed' ? colors.sage : colors.textMuted}
                      />
                      <AppText
                        variant="label"
                        style={milestone.status === 'completed' ? { color: colors.textMuted, textDecorationLine: 'line-through' } : undefined}
                      >
                        {milestone.title}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setMilestoneGoalId(goal.id)}
                style={[styles.addMilestone, { marginTop: spacing.md }]}
              >
                <SymbolView name="plus.circle" size={19} tintColor={colors.textMuted} />
                <AppText variant="caption" muted>{t('addMilestone')}</AppText>
              </Pressable>
            </Card>
          )})}
        </View>
      </Screen>

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreate(false)} style={styles.closeButton} accessibilityRole="button">
              <SymbolView name="xmark" size={20} tintColor={colors.text} />
            </Pressable>
            <AppText variant="heading">{t('addGoal')}</AppText>
            <View style={styles.closeButton} />
          </View>
          <TextInput
            autoFocus
            maxLength={120}
            placeholder={t('goalTitlePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
          />
          <View style={{ marginTop: 'auto' }}>
            <Button onPress={() => void create()} loading={busy} disabled={title.trim().length < 3}>{t('createGoal')}</Button>
          </View>
        </View>
      </Modal>

      <Modal visible={milestoneGoalId != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMilestoneGoalId(null)}>
        <View style={[styles.modal, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setMilestoneGoalId(null)} style={styles.closeButton} accessibilityRole="button">
              <SymbolView name="xmark" size={20} tintColor={colors.text} />
            </Pressable>
            <AppText variant="heading">{t('addMilestone')}</AppText>
            <View style={styles.closeButton} />
          </View>
          <TextInput
            autoFocus
            maxLength={120}
            placeholder={t('newMilestonePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={milestoneTitle}
            onChangeText={setMilestoneTitle}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
          />
          <View style={{ marginTop: 'auto' }}>
            <Button onPress={() => void createMilestone()} loading={busy} disabled={milestoneTitle.trim().length < 3}>{t('saveMilestone')}</Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  heroCopy: { flex: 1, gap: 8 },
  iconButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  graphLink: { minHeight: 86, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  milestoneList: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  milestoneRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addMilestone: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 64, borderWidth: 1, paddingHorizontal: 18, fontSize: 17 },
});

