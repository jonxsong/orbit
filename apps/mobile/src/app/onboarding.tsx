import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../components/app-text';
import { Button } from '../components/button';
import { useI18n } from '../i18n/use-i18n';
import { useOrbitStore } from '../store/orbit-store';
import { useAppTheme } from '../theme/theme';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [goalTitle, setGoalTitle] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [habitTitle, setHabitTitle] = useState('');
  const [validation, setValidation] = useState('');
  const { t } = useI18n();
  const completeOnboarding = useOrbitStore((state) => state.completeOnboarding);
  const busy = useOrbitStore((state) => state.busy);
  const { colors, spacing, radius } = useAppTheme();

  const advance = () => {
    setValidation('');
    if (step === 1 && (goalTitle.trim().length < 3 || milestoneTitle.trim().length < 3)) {
      setValidation(t('requiredField'));
      return;
    }
    setStep((value) => Math.min(2, value + 1));
  };

  const finish = async () => {
    if (habitTitle.trim().length < 3) {
      setValidation(t('requiredField'));
      return;
    }
    await completeOnboarding({ goalTitle, milestoneTitle, habitTitle });
    router.replace('/(tabs)/today');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={() => setStep(step - 1)} style={styles.backButton}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.dots}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === step ? colors.text : colors.border, width: index === step ? 24 : 7 },
              ]}
            />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
        {step === 0 ? (
          <View style={styles.step}>
            <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
              <View style={[styles.orbit, { borderColor: colors.text }]} />
              <View style={[styles.sun, { backgroundColor: colors.accent }]} />
              <View style={[styles.satellite, { backgroundColor: colors.sage }]} />
            </View>
            <AppText variant="eyebrow" style={{ color: colors.sage }}>{t('onboardingEyebrow')}</AppText>
            <AppText variant="display">{t('onboardingTitle')}</AppText>
            <AppText muted>{t('onboardingBody')}</AppText>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.step}>
            <AppText variant="title">{t('firstGoalTitle')}</AppText>
            <AppText muted>{t('firstGoalBody')}</AppText>
            <TextInput
              accessibilityLabel={t('firstGoalTitle')}
              autoFocus
              maxLength={120}
              placeholder={t('goalPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={goalTitle}
              onChangeText={setGoalTitle}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
            />
            <AppText variant="label">{t('milestoneLabel')}</AppText>
            <TextInput
              accessibilityLabel={t('milestoneLabel')}
              maxLength={120}
              placeholder={t('milestonePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.step}>
            <View style={[styles.smallIcon, { backgroundColor: colors.sageSoft }]}>
              <SymbolView name="arrow.trianglehead.2.clockwise.rotate.90" size={28} tintColor={colors.sage} />
            </View>
            <AppText variant="title">{t('habitTitle')}</AppText>
            <AppText muted>{t('habitBody')}</AppText>
            <TextInput
              accessibilityLabel={t('habitTitle')}
              autoFocus
              maxLength={120}
              placeholder={t('habitPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={habitTitle}
              onChangeText={setHabitTitle}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
            />
          </View>
        ) : null}

        {validation ? <AppText variant="caption" style={{ color: colors.destructive }}>{validation}</AppText> : null}
      </View>

      <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
        <Button onPress={step === 2 ? () => void finish() : advance} loading={busy}>
          {step === 2 ? t('getStarted') : t('continue')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 7, borderRadius: 4 },
  content: { flex: 1, justifyContent: 'center' },
  step: { gap: 18 },
  mark: { width: 112, height: 112, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  orbit: { width: 74, height: 42, borderWidth: 4, borderRadius: 40, transform: [{ rotate: '-20deg' }] },
  sun: { width: 25, height: 25, borderRadius: 13, position: 'absolute' },
  satellite: { width: 13, height: 13, borderRadius: 7, position: 'absolute', top: 32, right: 28 },
  smallIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  input: { minHeight: 58, borderWidth: 1, paddingHorizontal: 18, fontSize: 17 },
});

