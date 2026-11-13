import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useOrbitStore } from '../store/orbit-store';
import { useAppTheme } from '../theme/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const initialize = useOrbitStore((state) => state.initialize);
  const initialized = useOrbitStore((state) => state.initialized);
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="life-graph" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="task/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="quick-add"
            options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetCornerRadius: 28 }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

