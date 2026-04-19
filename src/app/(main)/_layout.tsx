import { Stack } from "expo-router";

/** Ana uygulama yığını: `index` (ana sayfa), tarama / geçmiş / profil üzerine push. */
export default function MainLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
