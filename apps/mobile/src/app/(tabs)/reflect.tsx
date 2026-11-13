import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { Screen } from '../../components/screen';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

export default function ReflectScreen() {
  const reflection = useOrbitStore((state) => state.todayReflection);
  const saveReflection = useOrbitStore((state) => state.saveReflection);
  const busy = useOrbitStore((state) => state.busy);
  const [body, setBody] = useState(reflection?.body ?? '');
  const [saved, setSaved] = useState(false);
  const { t } = useI18n();
  const { colors, spacing, radius } = useAppTheme();

  const save = async () => {
    await saveReflection(body);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <Screen
      header={
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">{t('reflectionTitle')}</AppText>
          <AppText muted>{t('reflectionBody')}</AppText>
        </View>
      }
    >
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[styles.prompt, { backgroundColor: colors.accentSoft, padding: spacing.lg }]}>
          <SymbolView name="quote.opening" size={24} tintColor={colors.accent} />
          <AppText variant="heading" style={{ flex: 1 }}>{t('reflectionPrompt')}</AppText>
        </View>
        <TextInput
          accessibilityLabel={t('reflectionPrompt')}
          maxLength={4000}
          multiline
          placeholder={t('reflectionPlaceholder')}
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
          value={body}
          onChangeText={(value) => {
            setBody(value);
            setSaved(false);
          }}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderBottomLeftRadius: radius.lg,
              borderBottomRightRadius: radius.lg,
            },
          ]}
        />
      </Card>
      <View style={{ marginTop: spacing.lg }}>
        <Button onPress={() => void save()} loading={busy} disabled={body.trim().length === 0}>{t('saveReflection')}</Button>
      </View>
      {saved ? (
        <View style={[styles.saved, { marginTop: spacing.md }]}>
          <SymbolView name="lock.fill" size={14} tintColor={colors.sage} />
          <AppText variant="caption" style={{ color: colors.sage }}>{t('reflectionSaved')}</AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  input: { minHeight: 260, fontSize: 17, lineHeight: 26 },
  saved: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
});

