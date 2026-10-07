import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PendingRecordSync } from '@/components/pending-record-sync';
import { VehicleCacheSync } from '@/components/vehicle-cache-sync';
import { SessionProvider, useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <AnimatedSplashOverlay />
      <PendingRecordSync />
      <VehicleCacheSync />
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { isAdmin, isCheckingAdmin, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  // The calculator and history are open to every visitor; signing in is only
  // for admins maintaining vehicle records.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="sign-in" />
      {/* Stay open while the admin check is in flight, so reloading on the
          vehicles screen doesn't bounce an admin to the calculator; the
          database rejects non-admin writes regardless. */}
      <Stack.Protected guard={isAdmin || isCheckingAdmin}>
        <Stack.Screen name="admin-vehicles" />
      </Stack.Protected>
    </Stack>
  );
}
