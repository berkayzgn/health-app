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
  "dailyCalorieGoal": 2000,
  "macroGoals": { "protein": 120, "carbs": 200, "fat": 65 },
  "heightCm": "",
  "weightKg": "",
  "conditionTypes": [],
  "dietaryPreferences": [],
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
  "dailyCalorieGoal": 1800,
  "macroGoals": { "protein": 100, "carbs": 180, "fat": 60 }
}
```

---

### 🍽️ Meals (JWT Gerekli)

#### Yemek Ekle
```http
POST /meals
Content-Type: application/json

{
  "name": "Tavuk Izgara",
  "source": "manual",          // "scan" | "manual"
  "mealType": "lunch",         // breakfast | lunch | dinner | snack | midSnack
  "portion": "200g",           // opsiyonel
  "calories": 350,
  "protein": 40,
  "carbs": 5,
  "fat": 15
}
```

#### Tüm Yemekler
```http
GET /meals
GET /meals?dateFrom=2026-03-01&dateTo=2026-03-06
```

#### Bugünün Yemekleri + Toplamlar
```http
GET /meals/today
```

**Yanıt (200):**
```json
{
  "meals": [ ... ],
  "totals": {
    "calories": 600,
    "protein": 48,
    "carbs": 50,
    "fat": 20
  }
}
```

#### Yemek Detayı / Güncelle / Sil
```http
GET    /meals/:id
PATCH  /meals/:id    { "calories": 400 }
DELETE /meals/:id
```

---

## Veritabanı Şemaları

### User
Kullanıcıya özel alanlar; hastalık/diyet **katalog tabloları** + **ilişki tabloları** ile tutulur (users üzerinde dizi kolonu yok).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID (PK) | Kullanıcı kimliği |
| `email` | String (unique) | Kullanıcı e-postası |
| `password` | String | bcrypt ile hashlenmiş şifre |
| `name` | String | Kullanıcı adı |
| `dailyCalorieGoal` | Number | Günlük kalori hedefi (default: 2000) |
| `macroGoals` | Object | `{ protein, carbs, fat }` gram cinsinden hedefler |
| `heightCm` / `weightKg` | String | Boy / kilo (metrik giriş) |
| `createdAt / updatedAt` | Date | Otomatik zaman damgaları |

**Katalog:** `medical_conditions` (`code`: diabetes, hypertension, asthma), `diet_types` (`code`: gluten_free, keto, lactose_intolerant, vegan).

**İlişkiler:** `user_medical_conditions`, `user_diet_preferences`, serbest etiketler `user_custom_health_tags` (`label`; mobilde `other:…` ile uyumlu).

**API:** `GET/PATCH /users/me` yanıtında hâlâ `conditionTypes[]` ve `dietaryPreferences[]` (birleştirilmiş string kodlar) döner; PATCH gövdesi aynı formatta kalır.

### Meal
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID (PK) | Öğün kaydı |
| `userId` | UUID (FK) | Kullanıcı referansı |
| `name` | String | Yemek adı |
| `source` | Enum | `"scan"` veya `"manual"` |
| `mealType` | Enum | `breakfast`, `lunch`, `dinner`, `snack`, `midSnack` |
| `portion` | String | Porsiyon (opsiyonel) |
| `calories` | Number | Kalori (kcal) |
| `protein / carbs / fat` | Number | Makro değerleri (gram) |
| `date` | Date | Yemek tarihi |
| `createdAt / updatedAt` | Date | Otomatik zaman damgaları |

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
