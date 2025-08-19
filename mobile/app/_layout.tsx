import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="ambassador-signin" options={{ headerShown: false }} />
        <Stack.Screen name="ambassador-tours" options={{ headerShown: false }} />
        <Stack.Screen name="tour-details" options={{ headerShown: false }} />
        <Stack.Screen name="lead-capture" options={{ headerShown: false }} />
        <Stack.Screen name="school-selection" options={{ headerShown: false }} />
        <Stack.Screen name="tour-group-selection" options={{ headerShown: false }} />
        <Stack.Screen name="interest-selection" options={{ headerShown: false }} />
        <Stack.Screen name="tour-confirmation" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="building" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
