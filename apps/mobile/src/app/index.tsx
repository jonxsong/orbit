import { Redirect } from 'expo-router';
import { useOrbitStore } from '../store/orbit-store';

export default function IndexRoute() {
  const onboardingComplete = useOrbitStore((state) => state.onboardingComplete);
  return onboardingComplete ? <Redirect href="/(tabs)/today" /> : <Redirect href="/onboarding" />;
}

