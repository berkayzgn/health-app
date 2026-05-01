import { Redirect } from "expo-router";

/** Profil düzenlemesi doğrudan `profile` sayfasında; eski bağlantılar için yönlendirme. */
export default function EditHealthProfileRedirect() {
  return <Redirect href="/profile" />;
}
