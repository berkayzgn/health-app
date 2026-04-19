# Health AI App — Backend Kılavuzu

## Genel Bakış

Backend, **NestJS** (Node.js) framework'ü ve **PostgreSQL** veritabanı üzerine inşa edilmiştir (**Prisma ORM**). JWT tabanlı kimlik doğrulama ile kullanıcıya özel yemek takibi ve beslenme hedefleri yönetimi sağlar.

---

## Mimari

```
backend/
├── prisma/
│   ├── schema.prisma              # Prisma modelleri (User, Meal)
│   └── migrations/                # SQL migrasyonlar
├── src/
│   ├── main.ts                    # Uygulama giriş noktası
│   ├── app.module.ts              # Root modül (Config, Prisma, tüm modüller)
│   │
│   ├── auth/                      # 🔐 Kimlik Doğrulama
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # POST /auth/register, /auth/login
│   │   ├── auth.service.ts        # bcrypt hashing, JWT signing
│   │   ├── jwt.strategy.ts        # Passport JWT Strategy
│   │   ├── jwt-auth.guard.ts      # Route koruma guard'ı
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── prisma/                    # PrismaModule + PrismaService (global)
│   │
│   ├── users/                     # 👤 Kullanıcı Yönetimi
│   │   ├── users.module.ts
│   │   ├── users.controller.ts    # GET/PATCH /users/me
│   │   └── users.service.ts
│   │
│   └── meals/                     # 🍽️ Yemek Takibi
│       ├── meals.module.ts
│       ├── meals.controller.ts    # CRUD + /meals/today
│       ├── meals.service.ts
│       └── dto/
│           ├── create-meal.dto.ts
│           └── update-meal.dto.ts
```

### Akış Diyagramı

```
[Mobile App]  ──HTTP──▶  [NestJS Backend :3000]  ──Prisma──▶  [PostgreSQL Docker: host :5433]
                              │
                         ┌────┴────┐
                     Auth Module  Meals Module
                     Users Module
```

---

## Kurulum

### Gereksinimler

- **Node.js** ≥ 18
- **PostgreSQL** (Docker `docker-compose`: Mac’te `localhost:5433` → konteyner `5432`)
- **npm**

### Adımlar

```bash
# 1. Bağımlılıkları yükle
cd backend
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env: DATABASE_URL, JWT_SECRET vb.

# 3. Şemayı veritabanına uygula (PostgreSQL ayakta olmalı)
npx prisma migrate dev

# 4. Geliştirme modunda başlat
npm run start:dev

# 4. Üretim build
npm run build
npm run start:prod
```

### Ortam Değişkenleri (`.env`)

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | PostgreSQL bağlantı URI'si (Prisma) | `postgresql://healthai:healthai@localhost:5433/healthai?schema=public` |
| `JWT_SECRET` | JWT imzalama anahtarı | — (üretimde güçlü bir key kullanın) |
| `JWT_EXPIRATION` | Token geçerlilik süresi | `7d` |
| `PORT` | Sunucu portu | `3000` |

---

## API Referansı

### 🔐 Auth

#### Kayıt
```http
POST /auth/register
Content-Type: application/json

{
  "email": "kullanici@email.com",
  "password": "sifre123",
  "name": "Kullanıcı Adı"
}
```

**Yanıt (201):**
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "64a...",
    "email": "kullanici@email.com",
    "name": "Kullanıcı Adı"
  }
}
```

#### Giriş
```http
POST /auth/login
Content-Type: application/json

{
  "email": "kullanici@email.com",
  "password": "sifre123"
}
```

**Yanıt (201):** _Kayıt ile aynı format_

---

### 👤 Users (JWT Gerekli)

> Tüm isteklerde header: `Authorization: Bearer <token>`

#### Profil Getir
```http
GET /users/me
```

**Yanıt (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "kullanici@email.com",
  "name": "Kullanıcı Adı",
  "conditionTypes": ["diabetes_type_2", "peanut_allergy"],
  "createdAt": "2026-03-06T13:48:26.664Z",
  "updatedAt": "2026-03-06T13:48:26.664Z"
}
```

#### Profil Güncelle
```http
PATCH /users/me
Content-Type: application/json

{
  "name": "Yeni İsim",
  "conditionTypes": ["diabetes_type_2"]
}
```

---

## Veritabanı Şemaları

### User
Hesap bilgisi; hastalık/alerji seçimleri `user_medical_conditions` ile katalogya bağlanır.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID (PK) | Kullanıcı kimliği |
| `email` | String (unique) | E-posta |
| `password` | String | bcrypt hash |
| `name` | String | Görünen ad |
| `createdAt / updatedAt` | Date | Zaman damgaları |

**Katalog:** `medical_conditions` (`kind`: disease | allergy; `triggerFoods` etiket eşlemesi için).

**İlişkiler:** `user_medical_conditions` (çok-çok), `scan_history` (tarama geçmişi).

**API:** `GET/PATCH /users/me` gövde/yanıtta `conditionTypes[]` yalnızca katalog `code` değerlerini içerir (`other:…` artık desteklenmez).

### ScanHistory
Etiket tarama kayıtları: `rawIngredients`, `matchedTriggers`, `safetyLabel`, isteğe bağlı `resultSnapshot` (JSON).

---

## Güvenlik

- **Şifreler** `bcrypt` ile 10 round salt kullanılarak hashlenir
- **JWT tokenları** 7 gün geçerlidir (`.env` ile ayarlanabilir)
- **Route koruma**: `JwtAuthGuard` ile korunan endpoint'ler, geçerli token olmadan `401 Unauthorized` döner
- **Validation**: `class-validator` ile tüm girdiler doğrulanır, geçersiz veri `400 Bad Request` döner
- **CORS**: Tüm origin'lere açık (geliştirme için), üretimde kısıtlanmalıdır

---

## Sık Kullanılan Komutlar

```bash
npm run start:dev     # Geliştirme (hot-reload)
npm run start:prod    # Üretim
npm run build         # TypeScript derleme
npm run test          # Unit testler
npm run test:e2e      # E2E testler
```
