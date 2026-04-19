# Mimari özeti

Bu repo **tek bir monorepo**: kökte **mobil istemci** (`src/`), altdizinde **API** (`backend/`). Altyapı ve yardımcı dosyalar kökte toplanır; iş mantığı kodu iki net ayrıkta durur.

## Katmanlar

```
health-ai-app/
├── src/                    # Mobil uygulama (Expo / React Native) — tek giriş noktası
│   ├── app/                # Expo Router: ekranlar ve navigasyon
│   ├── components/         # Paylaşılan UI bileşenleri
│   ├── services/           # HTTP API, auth, etiket tarama istemcisi
│   ├── store/              # Zustand (auth, tema, profil)
│   ├── utils/              # Saf yardımcılar (medya, profil, etiket metni)
│   ├── theme/              # Tasarım token’ları + palettes.json (Tailwind ile uyumlu)
│   ├── locales/            # i18n (tr / en)
│   ├── i18n.ts             # i18next kurulumu
│   └── theme.ts            # Light / dark tipi ve renk sabitleri
├── backend/                # NestJS + Prisma + PostgreSQL
├── abc.json                # Hastalık / alerji kataloğu (seed + tarama sözlüğü; backend ile paylaşılır)
├── docker-compose.yml      # Lokal Postgres + API (+ pgAdmin)
├── server-config/          # Üretim sunucusu (nginx, fail2ban) örnekleri
├── docs/                   # Kılavuzlar ve bu dosya
├── global.css              # NativeWind / Tailwind girişi (kökte kalır)
├── app.config.js           # Expo yapılandırması
├── tailwind.config.js      # NativeWind içerik yolları → src/**
└── package.json            # Mobil bağımlılıkları ve script’ler
```

## Veri ve istek akışı

1. Uygulama `src/services/api.ts` üzerinden `EXPO_PUBLIC_API_URL` ile API’ye bağlanır.
2. Kimlik: JWT; token AsyncStorage’da; 401’de oturum temizlenir (`_layout.tsx` içindeki callback).
3. Backend: `auth` → `users` (profil + hastalık ilişkileri), `catalog` (tıbbi koşullar), `label-scan` (görüntü analizi + geçmiş).

## Neden `src/`?

- Kök dizin sadece **proje meta** (Expo, Docker, doküman, ortak `abc.json`) için kullanılır.
- Tüm uygulama kaynağı **tek klasör** altında aranır ve IDE’de daraltılır.
- `backend/` ile çakışma ve “hangi dosya nereye ait?” karmaşası azalır.

## İlgili dokümanlar

- `docs/system-guide.md` — stack ve geliştirme notları (güncel path’ler için tabloya bakın)
- `docs/backend-kilavuzu.md` — API ve Prisma
- `README.md` — kurulum ve Docker özeti
