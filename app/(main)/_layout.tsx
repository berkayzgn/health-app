import { Stack } from "expo-router";

/**
 * Ana uygulama yığını: kök `index` (home); profil / ayarlar üzerine push.
 * Alt sekmede Insight → `router.dismissTo("/")` stack’i ana sayfaya indirir.
 */
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
