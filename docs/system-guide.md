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
| `components/scanner/` | ⚠️ Şu an **boş** — gerçek kamera bileşeni henüz yok (bkz. Taslak Özellikler) |
| `components/ui/` | ⚠️ Şu an **boş** — UI primitive'leri için ayrılmış, henüz doldurulmadı |
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

- `POST /auth/register` — kayıt
- `POST /auth/login` — giriş
- `GET  /users/me` — profil getir
- `PATCH /users/me` — profil güncelle
- `GET  /meals/today` — bugünkü öğünler
- `POST /meals` — öğün ekle
- `GET  /meals` — tüm öğünler (dateFrom / dateTo filtresi)
- `PATCH /meals/:id` — öğün güncelle
- `DELETE /meals/:id` — öğün sil

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

Root seviyede `docker-compose.yml` ile tek ağ (`healthai`):

- `postgres` — iç hostname: `postgres`, konteyner içi `5432`; Mac'te `localhost:5433`
- `pgadmin` — `http://localhost:5050` (DB bağlantısında host: `postgres`)
- `backend` — `DATABASE_URL` içinde host `postgres`

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
```

---

## Konfigürasyon

### Backend `.env`

```env
DATABASE_URL=postgresql://healthai:healthai@localhost:5433/healthai?schema=public
JWT_SECRET=...
JWT_EXPIRATION=7d
PORT=3000
```

### Frontend API URL Stratejisi

`services/api.ts` şu sırayla API adresini belirler:

1. `EXPO_PUBLIC_API_URL` ortam değişkeni (varsa)
2. Expo `hostUri` veya Metro LAN IP (geliştirme, fiziksel cihaz)
3. Platform loopback: iOS → `localhost`, Android → `10.0.2.2`
4. Fallback placeholder (üretim için hata fırlatır)

---

## Taslak / Mock Özellikler

Aşağıdaki özellikler henüz gerçek API'ye bağlanmamıştır:

| Özellik | Dosya | Durum |
|---|---|---|
| Etiket tarama (Label Scan) | `app/(main)/scan.tsx` | Mock veri (`utils/labelScanMock.ts`) |
| AI Meal Chat | `app/(main)/meal-description.tsx` | Frontend-only, AI yanıtı yok |
| Abonelik (Subscription) | `app/(main)/subscription.tsx` | "Coming soon" placeholder |
| Bildirimler | `services/notifications.ts` | Expo notifications kurulumu var, içerik yok |

---

## Kod Kalitesi Kuralları

- TypeScript zorunlu kullanım
- DTO tabanlı validation backend'de aktif
- i18n anahtarları tüm yeni UI metinlerinde zorunlu
- Tema (light/dark) değişkenleri merkezi `theme/` üzerinden
- Yeni string sabitleri `constants/` altında tanımlanmalı (örn. storage key'leri)
- Backend hata mesajları şu an hardcoded Türkçe; frontend override eder

---

## Teknik Borç

| Konu | Detay |
|---|---|
| `TOKEN_KEY` çift tanım | `services/api.ts` ve `store/useStore.ts`'de ayrı; ileride `constants/` dosyasına taşınmalı |
| Font yükleme tekrarı | `useFonts` çağrısı 8+ ekranda tekrar ediyor; `hooks/useAppFonts.ts` hook'u oluşturulmalı |
| Boş stub dizinler | `components/ui/`, `hooks/`, `types/`, `constants/`, `providers/` henüz boş |
| Scanner bileşeni | `components/scanner/` boş; gerçek kamera tabanlı bileşen yazılmalı |

---

## Gelecek İyileştirmeler

- CI pipeline (lint + test + build)
- Ortamlara göre `.env` ayrımı (`dev`, `staging`, `prod`)
- Backend centralized logging (Winston / Pino)
- Frontend error tracking (Sentry)
- API health-check ve readiness endpoint
- `TOKEN_KEY` ve diğer storage key'leri `constants/` altında topla
- `hooks/useAppFonts.ts` ile ekran başına font yükleme tekrarını kaldır
