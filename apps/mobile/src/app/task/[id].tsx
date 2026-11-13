import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { localDateKey } from '../../domain/dates';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

function dateFromOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useOrbitStore((state) => state.tasks.find((item) => item.id === id));
  const updateTask = useOrbitStore((state) => state.updateTask);
  const deleteTask = useOrbitStore((state) => state.deleteTask);
  const busy = useOrbitStore((state) => state.busy);
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? localDateKey());
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes ?? 30);
  const { t } = useI18n();
  const { colors, spacing, radius } = useAppTheme();

  const dateOptions = useMemo(
    () => [
      { label: t('todayOption'), value: dateFromOffset(0) },
      { label: t('tomorrowOption'), value: dateFromOffset(1) },
      { label: t('nextWeekOption'), value: dateFromOffset(7) },
    ],
    [t],
  );

  if (!task) {
    router.back();
    return null;
  }

  const save = async () => {
    await updateTask(task.id, { title, dueDate, estimatedMinutes });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert(t('deleteTaskTitle'), t('deleteTaskBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          void deleteTask(task.id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => router.back()} style={styles.iconButton}>
          <SymbolView name="chevron.left" size={21} tintColor={colors.text} />
        </Pressable>
        <AppText variant="heading">{t('editTask')}</AppText>
        <View style={styles.iconButton} />
      </View>

      <View style={[styles.content, { padding: spacing.lg }]}>
        <TextInput
          accessibilityLabel={t('taskTitle')}
          maxLength={160}
          value={title}
          onChangeText={setTitle}
          style={[styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
        />

        <AppText variant="label">{t('reschedule')}</AppText>
        <View style={styles.pills}>
          {dateOptions.map((option) => {
            const selected = dueDate === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDueDate(option.value)}
                style={[styles.pill, { backgroundColor: selected ? colors.text : colors.surfaceMuted, borderRadius: radius.pill }]}
              >
                <AppText variant="caption" style={{ color: selected ? colors.background : colors.text }}>{option.label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ marginTop: spacing.sm }}>{t('estimatedTime')}</AppText>
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

        <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteButton}>
          <SymbolView name="trash" size={18} tintColor={colors.destructive} />
          <AppText variant="label" style={{ color: colors.destructive }}>{t('deleteTask')}</AppText>
        </Pressable>
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
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 16 },
  titleInput: { minHeight: 68, borderWidth: 1, paddingHorizontal: 18, fontSize: 20, fontWeight: '600' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18 },
});

