import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../components/app-text';
import { Button } from '../components/button';
import { useI18n } from '../i18n/use-i18n';
import { useOrbitStore } from '../store/orbit-store';
import { useAppTheme } from '../theme/theme';

export default function QuickAddScreen() {
  const [title, setTitle] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [goalId, setGoalId] = useState<string | null>(null);
  const { t } = useI18n();
  const goals = useOrbitStore((state) => state.goals);
  const addTask = useOrbitStore((state) => state.addTask);
  const busy = useOrbitStore((state) => state.busy);
  const { colors, spacing, radius } = useAppTheme();

  const save = async () => {
    if (title.trim().length < 2) return;
    await addTask({ title, goalId, estimatedMinutes });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} style={styles.close}>
          <SymbolView name="xmark" size={20} tintColor={colors.text} />
        </Pressable>
        <AppText variant="heading">{t('addTask')}</AppText>
        <View style={styles.close} />
      </View>

      <View style={[styles.content, { padding: spacing.lg }]}>
        <AppText variant="title">{t('taskTitle')}</AppText>
        <TextInput
          accessibilityLabel={t('taskTitle')}
          autoFocus
          maxLength={160}
          placeholder={t('taskPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
        />

        <AppText variant="label" style={{ marginTop: spacing.md }}>{t('estimatedTime')}</AppText>
        <View style={styles.pills}>
          {[
            [15, t('minutes15')],
            [30, t('minutes30')],
            [60, t('minutes60')],
          ].map(([value, label]) => {
            const selected = estimatedMinutes === value;
            return (
              <Pressable
                key={value}
                onPress={() => setEstimatedMinutes(value as number)}
                style={[styles.pill, { backgroundColor: selected ? colors.text : colors.surfaceMuted, borderRadius: radius.pill }]}
              >
                <AppText variant="caption" style={{ color: selected ? colors.background : colors.text }}>{label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ marginTop: spacing.md }}>{t('linkGoal')}</AppText>
        <View style={styles.goalList}>
          <Pressable
            onPress={() => setGoalId(null)}
            style={[styles.goalOption, { backgroundColor: goalId == null ? colors.sageSoft : colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
          >
            <AppText variant="label">{t('notLinked')}</AppText>
            {goalId == null ? <SymbolView name="checkmark" size={17} tintColor={colors.sage} /> : null}
          </Pressable>
          {goals.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => setGoalId(goal.id)}
              style={[styles.goalOption, { backgroundColor: goalId === goal.id ? colors.sageSoft : colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
            >
              <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>{goal.title}</AppText>
              {goalId === goal.id ? <SymbolView name="checkmark" size={17} tintColor={colors.sage} /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <Button onPress={() => void save()} loading={busy} disabled={title.trim().length < 2}>{t('saveTask')}</Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 14 },
  input: { minHeight: 62, borderWidth: 1, paddingHorizontal: 18, fontSize: 17 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  goalList: { gap: 8 },
  goalOption: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
});

