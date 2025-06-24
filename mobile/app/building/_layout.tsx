import { Stack } from 'expo-router';

export default function BuildingLayout() {
  // The Stack component is used to define the route layout
  // We hide the header because we're creating our own custom header
  return <Stack screenOptions={{ headerShown: false }} />;
} 