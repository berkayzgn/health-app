# Health AI App — System Guide

## Amaç

Bu döküman projenin teknoloji stack'ini, mimari kararlarını ve geliştirme notlarını tek bir referans noktasında toplar.

---

## Genel Mimari

Sistem iki ana bölümden oluşur:

1. **Mobile App (Expo + React Native)** — repo kökünde
2. **Backend API (NestJS + PostgreSQL)** — `backend/` alt dizininde

Mobil uygulama HTTP üzerinden backend'e bağlanır. Backend PostgreSQL ile veri kalıcılığını sağlar (**Prisma ORM**).

---

## Frontend Stack (Mobile)

- **Expo (SDK 55)**: React Native geliştirme ortamı
- **React Native (0.83.2)**: Mobil arayüz
- **Expo Router**: Dosya tabanlı navigasyon
- **TypeScript**: Tip güvenliği
- **NativeWind + TailwindCSS**: Stil sistemi
- **Zustand**: Global state yönetimi (tema, auth, uygulama state'i)
- **TanStack Query**: Server state / API cache yönetimi
- **react-i18next + i18next**: Çoklu dil desteği (TR / EN)
- **AsyncStorage**: Token, dil ve tema gibi yerel kalıcı veriler

### Frontend Dizin Yapısı (repo kökü)

| Dizin | Açıklama |
|---|---|
| `app/` | Ekranlar ve route dosyaları (Expo Router) |
| `app/(main)/` | Ana uygulama ekranları (index, profile, settings, scan, vb.) |
| `components/` | Paylaşılan React Native bileşenleri |
| `components/scanner/` | ⚠️ Şu an **boş** — gerçek kamera bileşeni henüz yok |
| `components/ui/` | ⚠️ Şu an **boş** — UI primitive'leri için ayrılmış |
| `services/` | API ve servis katmanı (`api.ts`, `authService.ts`, `mealsService.ts`) |
| `store/` | Zustand store (`useStore.ts`) |
| `utils/` | Yardımcı fonksiyonlar (nutrition hesaplama, media pick, vb.) |
| `theme/` | Tasarım token'ları ve renk sistemi |
| `locales/` | i18n JSON dosyaları (TR / EN) |
| `hooks/` | ⚠️ Şu an **boş** — özel React hook'ları için ayrılmış |
| `types/` | ⚠️ Şu an **boş** — global TypeScript tipleri için ayrılmış |
| `constants/` | ⚠️ Şu an **boş** — paylaşılan sabitler için ayrılmış |
| `providers/` | ⚠️ Şu an **boş** — React context provider'ları için ayrılmış |
| `docs/` | Proje dökümantasyonu |

---

## Backend Stack

- **NestJS (v11)**: Modüler Node.js backend framework
- **Prisma**: PostgreSQL ORM ve migrasyonlar
- **PostgreSQL**: İlişkisel veritabanı
- **JWT (nestjs/jwt + passport-jwt)**: Kimlik doğrulama
- **bcrypt**: Şifre hashleme
- **class-validator / class-transformer**: DTO validation

### Backend Modülleri

- `auth`: Register / Login ve token üretimi
- `users`: Kullanıcı profili ve sağlık bilgileri
- `meals`: Öğün CRUD ve günlük toplamları

### Ana Endpoint Grupları

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/register` | Yok |
| POST | `/auth/login` | Yok |
| GET | `/users/me` | Bearer token |
| PATCH | `/users/me` | Bearer token |
| GET | `/meals/today` | Bearer token |
| POST | `/meals` | Bearer token |
| GET | `/meals` | Bearer token |
| PATCH | `/meals/:id` | Bearer token |
| DELETE | `/meals/:id` | Bearer token |
| GET | `/health` | Yok |

---

## API Bağlantı Mimarisi

### Dosyalar

| Dosya | Görev |
|---|---|
| `services/api.ts` | Base URL çözümü, token yönetimi, auth header, 401 interceptor |
| `services/authService.ts` | Register, login, logout, getMe, updateProfile |
| `services/mealsService.ts` | Öğün CRUD ve günlük toplamları |
| `app/_layout.tsx` | `registerUnauthorizedCallback` → `clearAuth` kaydı |

### 401 Otomatik Logout

`services/api.ts` → 401 alınca:
1. Token AsyncStorage'dan silinir
2. `registerUnauthorizedCallback` ile kayıtlı `clearAuth()` çağrılır
3. Mevcut auth navigation flow /auth'a yönlendirir

---

## Environment Yönetimi

### Env Dosyaları (git'e commit edilmez)

| Dosya | Ne zaman okunur | Kullanım |
|---|---|---|
| `.env` | Her zaman (base) | Boş — override edilir |
| `.env.development` | `expo start` (dev mode) | Local backend |
| `.env.production` | `eas build` / `expo start --no-dev` | Production server |

### URL Çözüm Sırası (`services/api.ts`)

```
1. EXPO_PUBLIC_API_URL (env dosyasından)
   └── Dolu → doğrudan kullan
   └── Boş → otomatik çözüm:
       ├── Fiziksel cihaz + __DEV__ → Metro LAN IP (otomatik okunur)
       ├── iOS Simülatör → http://localhost:3000
       ├── Android Emülatör → http://10.0.2.2:3000
       └── Production build → hata (URL zorunlu)
```

---

## Nerede Çalışırken Nasıl Çalışmalısın?

### 1. 📱 iOS Simülatör — Local Backend

```bash
# Backend'i başlat (Docker)
npm run docker:up

# .env.development içinde EXPO_PUBLIC_API_URL= (boş bırak)

# Metro başlat
npx expo start -c
# → Sonra [i] tuşu (iOS simülatör)
```
`api.ts` otomatik `http://localhost:3000` kullanır.

---

### 2. 🤖 Android Emülatör — Local Backend

```bash
# Backend'i başlat
npm run docker:up

# .env.development içinde EXPO_PUBLIC_API_URL= (boş bırak)

npx expo start -c
# → Sonra [a] tuşu (Android emülatör)
```
`api.ts` otomatik `http://10.0.2.2:3000` kullanır.

---

### 3. 📲 Fiziksel Cihaz — Local Backend (aynı Wi-Fi)

```bash
# Mac IP'ni öğren
ipconfig getifaddr en0
# Çıktı: örn. 192.168.1.45

# .env.development dosyasına yaz:
# EXPO_PUBLIC_API_URL=http://192.168.1.45:3000

# Metro'yu yeniden başlat
npx expo start -c
```

---

### 4. 🌐 Fiziksel Cihaz — Production Backend

```bash
# .env.development içinde:
# EXPO_PUBLIC_API_URL=http://165.245.209.17:3000

npx expo start -c
```

---

### 5. 🚀 Production Build (EAS)

```bash
# .env.production dosyası otomatik okunur:
# EXPO_PUBLIC_API_URL=http://165.245.209.17:3000

eas build --platform ios --profile production
# veya
eas build --platform android --profile production
```

Manuel URL değişikliğine gerek yok — `.env.production` otomatik kullanılır.

---

### 6. 🍎 production'ı simülatörde test et

```bash
# .env.development geçici olarak:
EXPO_PUBLIC_API_URL=http://165.245.209.17:3000
npx expo start -c
```

---

## Altyapı ve Çalıştırma

### Lokal Geliştirme

```bash
# Frontend (repo kökünde)
npm start

# Backend
cd backend && npm run start:dev
```

### Docker ile Geliştirme

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
```

- `postgres` — iç hostname: `postgres`, Mac'te `localhost:5433`
- `backend` — `http://localhost:3000`
- pgAdmin — **production'da kapalı** (yalnızca local: yorumu kaldır)

---

## Konfigürasyon

### Backend `.env` (backend/.env)

```env
DATABASE_URL=postgresql://healthai:STRONG_PASS@localhost:5433/healthai?schema=public
POSTGRES_USER=healthai
POSTGRES_PASSWORD=STRONG_PASS
POSTGRES_DB=healthai
JWT_SECRET=<openssl rand -hex 64>
JWT_EXPIRATION=7d
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=   # web client varsa ekle
```

---

## Taslak / Mock Özellikler

| Özellik | Dosya | Durum |
|---|---|---|
| Etiket tarama | `app/(main)/scan.tsx` | Mock veri (`utils/labelScanMock.ts`) |
| AI Meal Chat | `app/(main)/meal-description.tsx` | Frontend-only, AI yanıtı yok |
| Abonelik | `app/(main)/subscription.tsx` | "Coming soon" placeholder |
| Bildirimler | `services/notifications.ts` | Expo setup var, içerik yok |

---

## Kod Kalitesi Kuralları

- TypeScript zorunlu kullanım
- i18n anahtarları tüm yeni UI metinlerinde zorunlu
- Tema token'ları merkezi `theme/` üzerinden
- Yeni storage key'leri → `constants/` (şu an boş, düzenlenecek)
- Tüm API çağrıları → `services/api.ts` üzerinden

---

## Teknik Borç

| Konu | Detay |
|---|---|
| `TOKEN_KEY` çift tanım | `services/api.ts` ve `store/useStore.ts`'de ayrı; `constants/` dosyasına taşınmalı |
| Font yükleme tekrarı | `useFonts` 8+ ekranda tekrar ediyor; `hooks/useAppFonts.ts` oluşturulmalı |
| Boş stub dizinler | `components/ui/`, `hooks/`, `types/`, `constants/`, `providers/` boş |
| Scanner bileşeni | `components/scanner/` boş; gerçek kamera bileşeni yazılmalı |

---

## Gelecek İyileştirmeler

- CI pipeline (lint + test + build)
- Ortamlara göre `.env` ayrımı eksiksiz hale getir (staging ortamı)
- Backend centralized logging (Winston / Pino)
- Frontend error tracking (Sentry)
- API health-check ve readiness endpoint (mevcut `/health` endpoint'i genişlet)
- `hooks/useAppFonts.ts` ile ekran başına font yükleme tekrarını kaldır
