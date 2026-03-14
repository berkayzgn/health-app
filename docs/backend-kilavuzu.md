# Health AI App — Backend Kılavuzu

## Genel Bakış

Backend, **NestJS** (Node.js) framework'ü ve **MongoDB** veritabanı üzerine inşa edilmiştir. JWT tabanlı kimlik doğrulama ile kullanıcıya özel yemek takibi ve beslenme hedefleri yönetimi sağlar.

---

## Mimari

```
backend/
├── src/
│   ├── main.ts                    # Uygulama giriş noktası
│   ├── app.module.ts              # Root modül (Config, Mongoose, tüm modüller)
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
│   ├── users/                     # 👤 Kullanıcı Yönetimi
│   │   ├── users.module.ts
│   │   ├── users.controller.ts    # GET/PATCH /users/me
│   │   ├── users.service.ts
│   │   └── schemas/
│   │       └── user.schema.ts     # email, password, name, kalori/makro hedefleri
│   │
│   └── meals/                     # 🍽️ Yemek Takibi
│       ├── meals.module.ts
│       ├── meals.controller.ts    # CRUD + /meals/today
│       ├── meals.service.ts
│       ├── schemas/
│       │   └── meal.schema.ts     # name, source, mealType, kalori, makrolar
│       └── dto/
│           ├── create-meal.dto.ts
│           └── update-meal.dto.ts
```

### Akış Diyagramı

```
[Mobile App]  ──HTTP──▶  [NestJS Backend :3000]  ──Mongoose──▶  [MongoDB :27017]
                              │
                         ┌────┴────┐
                     Auth Module  Meals Module
                     Users Module
```

---

## Kurulum

### Gereksinimler

- **Node.js** ≥ 18
- **MongoDB** (local veya Atlas)
- **npm**

### Adımlar

```bash
# 1. Bağımlılıkları yükle
cd backend
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle (MongoDB URI, JWT secret vb.)

# 3. Geliştirme modunda başlat
npm run start:dev

# 4. Üretim build
npm run build
npm run start:prod
```

### Ortam Değişkenleri (`.env`)

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `MONGODB_URI` | MongoDB bağlantı URI'si | `mongodb://localhost:27017/health-ai-app` |
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
  "_id": "64a...",
  "email": "kullanici@email.com",
  "name": "Kullanıcı Adı",
  "dailyCalorieGoal": 2000,
  "macroGoals": { "protein": 120, "carbs": 200, "fat": 65 },
  "createdAt": "2026-03-06T13:48:26.664Z"
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
  "mealType": "lunch",         // "breakfast" | "lunch" | "dinner" | "snack"
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
| Alan | Tip | Açıklama |
|------|-----|----------|
| `email` | String (unique) | Kullanıcı e-postası |
| `password` | String | bcrypt ile hashlenmiş şifre |
| `name` | String | Kullanıcı adı |
| `dailyCalorieGoal` | Number | Günlük kalori hedefi (default: 2000) |
| `macroGoals` | Object | `{ protein, carbs, fat }` gram cinsinden hedefler |
| `createdAt / updatedAt` | Date | Otomatik zaman damgaları |

### Meal
| Alan | Tip | Açıklama |
|------|-----|----------|
| `userId` | ObjectId | Kullanıcı referansı |
| `name` | String | Yemek adı |
| `source` | Enum | `"scan"` veya `"manual"` |
| `mealType` | Enum | `"breakfast"`, `"lunch"`, `"dinner"`, `"snack"` |
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
