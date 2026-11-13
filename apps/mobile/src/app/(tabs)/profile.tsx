import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '../../components/app-text';
import { Card } from '../../components/card';
import { Screen } from '../../components/screen';
import type { Language } from '../../domain/types';
import { useI18n } from '../../i18n/use-i18n';
import { useOrbitStore } from '../../store/orbit-store';
import { useAppTheme } from '../../theme/theme';

export default function ProfileScreen() {
  const { language, t } = useI18n();
  const changeLanguage = useOrbitStore((state) => state.changeLanguage);
  const { colors, spacing, radius } = useAppTheme();

  const languageOption = (value: Language, label: string) => {
    const selected = language === value;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={() => void changeLanguage(value)}
        style={({ pressed }) => [
          styles.languageOption,
          {
            backgroundColor: selected ? colors.text : colors.surfaceMuted,
            borderRadius: radius.md,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <AppText variant="label" style={{ color: selected ? colors.background : colors.text }}>{label}</AppText>
        {selected ? <SymbolView name="checkmark" size={17} tintColor={colors.background} /> : null}
      </Pressable>
    );
  };

  return (
    <Screen
      header={
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">{t('settings')}</AppText>
          <AppText muted>{t('version')}</AppText>
        </View>
      }
    >
      <AppText variant="eyebrow" muted style={{ marginBottom: spacing.sm }}>{t('language').toUpperCase()}</AppText>
      <View style={styles.languageRow}>
        {languageOption('en', t('english'))}
        {languageOption('zh-Hans', t('chinese'))}
      </View>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Card>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.sageSoft }]}>
              <SymbolView name="iphone" size={22} tintColor={colors.sage} />
            </View>
            <View style={styles.infoCopy}>
              <AppText variant="heading">{t('localFirst')}</AppText>
              <AppText variant="caption" muted>{t('localFirstBody')}</AppText>
            </View>
          </View>
        </Card>
        <Card>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.blueSoft }]}>
              <SymbolView name="icloud" size={22} tintColor={colors.blue} />
            </View>
            <View style={styles.infoCopy}>
              <AppText variant="heading">{t('cloudSync')}</AppText>
              <AppText variant="caption" muted>{t('comingSoon')}</AppText>
            </View>
          </View>
        </Card>
        <Card>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.accentSoft }]}>
              <SymbolView name="hand.raised.fill" size={22} tintColor={colors.accent} />
            </View>
            <View style={styles.infoCopy}>
              <AppText variant="heading">{t('privacy')}</AppText>
              <AppText variant="caption" muted>{t('privacyBody')}</AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  languageRow: { flexDirection: 'row', gap: 10 },
  languageOption: { flex: 1, minHeight: 54, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
  infoRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, gap: 7 },
});

