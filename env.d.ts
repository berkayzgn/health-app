/** Expo public env’ler; .env içinde EXPO_PUBLIC_* ile tanımlanır. */
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
  }
}
