# Health AI App - System Guide

## Amac

Bu dokuman, projenin teknoloji stack'ini ve sistemin ana bilesenlerini tek bir yerden ozetlemek icin hazirlandi.

---

## Genel Mimari

Sistem iki ana bolumden olusur:

1. **Mobile App (Expo + React Native)**
2. **Backend API (NestJS + PostgreSQL)**

Mobil uygulama HTTP üzerinden backend'e bağlanır. Backend PostgreSQL ile veri kalıcılığını sağlar (**Prisma ORM**).

---

## Frontend Stack (Mobile)

- **Expo (SDK 55)**: React Native gelistirme ortami
- **React Native (0.83.2)**: Mobil arayuz
- **Expo Router**: Dosya tabanli navigasyon
- **TypeScript**: Tip guvenligi
- **NativeWind + TailwindCSS**: Stil sistemi
- **Zustand**: Global state yonetimi (tema, auth, uygulama state'i)
- **TanStack Query**: Server state / API cache yonetimi
- **react-i18next + i18next**: Coklu dil destegi (TR/EN)
- **AsyncStorage**: Token, dil ve tema gibi yerel kalici veriler

### Frontend Dizinleri

- `app/`: Ekranlar ve route dosyalari
- `services/`: API ve servis katmani (`api.ts`, `authService.ts`, `mealService.ts`)
- `store/`: Zustand store'lari
- `locales/`: i18n json dosyalari

---

## Backend Stack

- **NestJS (v11)**: Modüler Node.js backend framework
- **Prisma**: PostgreSQL ORM ve migrasyonlar
- **PostgreSQL**: İlişkisel veritabanı
- **JWT (nestjs/jwt + passport-jwt)**: Kimlik dogrulama
- **bcrypt**: Sifre hashleme
- **class-validator / class-transformer**: DTO validation

### Backend Modulleri

- `auth`: Register/Login ve token uretimi
- `users`: Kullanici profili ve hedefler
- `meals`: Ogun CRUD ve gunluk toplamlari

### Ana Endpoint Gruplari

- `/auth` -> login/register
- `/users` -> kullanici bilgileri
- `/meals` -> ogun kayitlari

---

## Altyapi ve Calistirma

### Lokal Gelistirme

- Frontend: `npm start` veya `npx expo start`
- Backend: `cd backend && npm run start:dev`

### Dockerize Gelistirme

Root seviyede `docker-compose.yml` ile tek ağ (`healthai`):

- `postgres` — iç hostname: `postgres`, dış port `5432`
- `pgadmin` — `http://localhost:5050`; DB’ye bağlanırken Host **`postgres`** (localhost değil)
- `backend` — `DATABASE_URL` içinde host `postgres`

pgAdmin sunucusu otomatik eklenmez; `docker/pgadmin/README.md` ile elle `postgres` host’u tanımlanır.

Komutlar:

- `npm run docker:up`
- `npm run docker:logs`
- `npm run docker:down`

---

## Konfigurasyon

### Backend `.env`

- `DATABASE_URL` (PostgreSQL; örn. `postgresql://healthai:healthai@localhost:5432/healthai?schema=public`)
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `PORT`

### Frontend API URL Stratejisi

`services/api.ts` tarafinda API adresi su sirayla belirlenir:

1. `EXPO_PUBLIC_API_URL` (varsa)
2. Platform/simulator bilgisine gore otomatik host
3. Fallback host

---

## Kalite ve Gelistirme Notlari

- TypeScript zorunlu kullanim hedeflenir
- DTO tabanli validation backend'de aktif
- i18n anahtarlari tum yeni UI metinlerinde zorunlu olmali
- Tema (light/dark) degiskenleri merkezi `theme.ts` uzerinden yonetilmeli

---

## Gelecek Iyilestirmeler

- CI pipeline (lint + test + build)
- Ortamlara gore `.env` ayrimi (`dev`, `staging`, `prod`)
- Centralized logging (backend)
- Error tracking (frontend/backend)
- API health-check endpoint ve readiness check
