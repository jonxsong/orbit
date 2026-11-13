import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { CheckControl } from '../../components/check-control';
import { Screen } from '../../components/screen';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

export default function HabitsScreen() {
  const habits = useOrbitStore((state) => state.habits);
  const toggleHabit = useOrbitStore((state) => state.toggleHabit);
  const addHabit = useOrbitStore((state) => state.addHabit);
  const busy = useOrbitStore((state) => state.busy);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const { t } = useI18n();
  const { colors, spacing } = useAppTheme();

  const toggle = async (habitId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleHabit(habitId);
  };

  const create = async () => {
    if (title.trim().length < 3) return;
    await addHabit(title);
    setTitle('');
    setShowCreate(false);
  };

  return (
    <>
    <Screen
      header={
        <View style={styles.hero}>
          <View style={{ gap: spacing.sm, flex: 1 }}>
            <AppText variant="title">{t('habitListTitle')}</AppText>
            <AppText muted>{t('habitListBody')}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('addHabit')}
            onPress={() => setShowCreate(true)}
            style={[styles.addButton, { backgroundColor: colors.text }]}
          >
            <SymbolView name="plus" size={22} tintColor={colors.background} />
          </Pressable>
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
    <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
      <View style={[styles.modal, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={() => setShowCreate(false)} style={styles.closeButton} accessibilityRole="button">
            <SymbolView name="xmark" size={20} tintColor={colors.text} />
          </Pressable>
          <AppText variant="heading">{t('addHabit')}</AppText>
          <View style={styles.closeButton} />
        </View>
        <TextInput
          autoFocus
          maxLength={120}
          placeholder={t('habitTitlePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <View style={{ marginTop: 'auto' }}>
          <Button onPress={() => void create()} loading={busy} disabled={title.trim().length < 3}>{t('createHabit')}</Button>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  addButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  status: { borderTopWidth: StyleSheet.hairlineWidth },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 64, borderWidth: 1, borderRadius: 18, paddingHorizontal: 18, fontSize: 17 },
});

