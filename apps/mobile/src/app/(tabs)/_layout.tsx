import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { useI18n } from '../../i18n/use-i18n';
import { useAppTheme } from '../../theme/theme';

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  return <SymbolView name={name as never} size={23} tintColor={color} />;
}

export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="today" options={{ title: t('today'), tabBarIcon: ({ color }) => <TabIcon name="sun.max.fill" color={color} /> }} />
      <Tabs.Screen name="goals" options={{ title: t('goals'), tabBarIcon: ({ color }) => <TabIcon name="scope" color={color} /> }} />
      <Tabs.Screen name="habits" options={{ title: t('habits'), tabBarIcon: ({ color }) => <TabIcon name="repeat" color={color} /> }} />
      <Tabs.Screen name="reflect" options={{ title: t('reflect'), tabBarIcon: ({ color }) => <TabIcon name="text.book.closed.fill" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color }) => <TabIcon name="person.crop.circle.fill" color={color} /> }} />
    </Tabs>
  );
}

