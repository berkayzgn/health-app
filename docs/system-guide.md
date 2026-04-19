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

### Frontend Dizin Yapısı (`src/`)

Tüm uygulama kaynağı `src/` altında toplanır; kök dizin Expo, Docker ve ortak dosyalar için kalır.

| Dizin | Açıklama |
|---|---|
| `src/app/` | Ekranlar ve route dosyaları (Expo Router) |
| `src/app/(main)/` | Ana uygulama ekranları (index, profile, settings, scan, scan-history, vb.) |
| `src/components/` | Paylaşılan React Native bileşenleri |
| `src/components/scanner/` | ⚠️ Şu an **boş** — kamera yardımcıları `utils/mediaImagePick.ts` içinde |
| `src/components/ui/` | ⚠️ Şu an **boş** — UI primitive'leri için ayrılmış |
| `src/services/` | API ve servis katmanı (`api.ts`, `authService.ts`, `labelScanService.ts`, …) |
| `src/store/` | Zustand store (`useStore.ts`) |
| `src/utils/` | Yardımcı fonksiyonlar (medya seçimi, profil yükü, etiket metni, mock tarama) |
| `src/theme/` | Tasarım token'ları ve `palettes.json` |
| `src/locales/` | i18n JSON dosyaları (TR / EN) |
| `hooks/` (kök) | ⚠️ Şu an **boş** — özel React hook'ları için ayrılmış |
| `types/` (kök) | ⚠️ Şu an **boş** — global TypeScript tipleri için ayrılmış |
| `constants/` (kök) | ⚠️ Şu an **boş** — paylaşılan sabitler için ayrılmış |
| `providers/` (kök) | ⚠️ Şu an **boş** — React context provider'ları için ayrılmış |
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
- `users`: Kullanıcı profili ve hastalık / alerji ilişkileri
- `catalog`: Tıbbi koşul listesi (seed ile `abc.json`’dan)
- `label-scan`: Etiket görüntüsü analizi (OCR / analiz), tarama geçmişi

### Ana Endpoint Grupları

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/auth/register` | Yok |
| POST | `/auth/login` | Yok |
| GET | `/users/me` | Bearer token |
| PATCH | `/users/me` | Bearer token |
| DELETE | `/users/me` | Bearer token |
| GET | `/catalog/medical-conditions` | Yok |
| POST | `/label-scan` | Bearer token |
| GET | `/label-scan/history` | Bearer token |
| GET | `/label-scan/history/:id` | Bearer token |
| GET | `/health` | Yok |

---

## API Bağlantı Mimarisi

### Dosyalar

| Dosya | Görev |
|---|---|
| `src/services/api.ts` | Base URL çözümü, token yönetimi, auth header, 401 interceptor |
| `src/services/authService.ts` | Register, login, logout, getMe, updateProfile |
| `src/services/labelScanService.ts` | Etiket tarama API’si ve geçmiş detayı |
| `src/app/_layout.tsx` | `registerUnauthorizedCallback` → `clearAuth` kaydı |

### 401 Otomatik Logout

`src/services/api.ts` → 401 alınca:
1. Token AsyncStorage'dan silinir
2. `registerUnauthorizedCallback` ile kayıtlı `clearAuth()` çağrılır
3. Mevcut auth navigation flow /auth'a yönlendirir

---

## Environment Yönetimi

### Env Dosyaları (git'e commit edilmez)

| Dosya | Ne zaman okunur | Kullanım |
|---|---|---|
| `.env` | Her zaman (base) | Uzak sunucu URL |
| `.env.development` | `expo start` (dev mode) | Uzak sunucu URL |
| `.env.production` | `eas build` / `expo start --no-dev` | Uzak sunucu URL |

### URL Çözümü (`src/services/api.ts`)

`EXPO_PUBLIC_API_URL` env değişkeni doğrudan kullanılır. Lokal sunucu fallback'i yoktur.

```
EXPO_PUBLIC_API_URL=http://165.245.209.17
```

> **Not:** Tüm ortamlarda (simülatör, emülatör, fiziksel cihaz, production) uzak sunucuya bağlanır.

---

## Nerede Çalışırken Nasıl Çalışmalısın?

### 1. 📱 Geliştirme (Simülatör / Emülatör / Fiziksel Cihaz)

```bash
# Metro başlat
npx expo start -c
```

`.env.development` dosyasındaki `EXPO_PUBLIC_API_URL` uzak sunucuyu gösterir.

---

### 2. 🚀 Production Build (EAS)

```bash
# .env.production dosyası otomatik okunur:
# EXPO_PUBLIC_API_URL=http://165.245.209.17

eas build --platform ios --profile production
# veya
eas build --platform android --profile production
```

Manuel URL değişikliğine gerek yok — `.env.production` otomatik kullanılır.

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

- `postgres` — iç hostname: `postgres`; yayınlanan port `POSTGRES_PUBLISH_PORT` (varsayılan `5433`, çakışmada `.env` ile değiştir)
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
| Etiket tarama | `src/app/(main)/scan.tsx` | `POST /label-scan` (sunucuda Gemini Vision); simülatörde `__DEV__` mock akışı |
| Bildirimler | `src/services/notifications.ts` | Expo setup var, içerik yok |

---

## Kod Kalitesi Kuralları

- TypeScript zorunlu kullanım
- i18n anahtarları tüm yeni UI metinlerinde zorunlu
- Tema token'ları merkezi `src/theme/` üzerinden
- Yeni storage key'leri → `constants/` (şu an boş, düzenlenecek)
- Tüm API çağrıları → `src/services/api.ts` üzerinden

---

## Teknik Borç

| Konu | Detay |
|---|---|
| `TOKEN_KEY` çift tanım | `src/services/api.ts` ve `src/store/useStore.ts`'de ayrı; `constants/` dosyasına taşınmalı |
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
