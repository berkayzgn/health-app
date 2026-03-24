# Health AI App

A React Native health and nutrition app built with Expo, featuring food scanning capabilities.

## Tech Stack

- **Expo** - React Native development platform
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **Zustand** - Global state management
- **TanStack Query** - API state management
- **NativeWind** - Tailwind CSS for React Native

## Project Structure

```
health-ai-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx    # Tab navigation layout
│   │   ├── index.tsx      # Home screen
│   │   ├── scan.tsx       # Scan Food screen
│   │   ├── history.tsx    # History screen
│   │   └── profile.tsx    # Profile screen
│   └── _layout.tsx       # Root layout with providers
├── components/
│   ├── ui/               # Reusable UI components
│   └── scanner/          # Scanner-related components
├── hooks/                # Custom React hooks
├── store/                # Zustand stores
│   └── useStore.ts       # Example global state
├── services/             # API and external services
├── constants/            # App constants
├── types/                # TypeScript type definitions
└── assets/               # Images, fonts, etc.
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies (already done)
npm install

# Start the development server
npm start
```

## Docker (`postgres` + `backend` + `pgadmin`)

Tek ağ (`healthai`): servisler birbirine **compose servis adıyla** bağlanır (`postgres`, `backend` → API).

```bash
npm run docker:up
```

Servisler:

| Servis | Port / URL | Not |
|--------|------------|-----|
| **Backend (Nest)** | `http://localhost:3000` | `DATABASE_URL` → `postgres:5432` |
| **PostgreSQL** | `localhost:5432` | kullanıcı / şifre / DB: `healthai` |
| **pgAdmin** | `http://localhost:5050` | Giriş: `admin@example.com` / `admin123` |

**pgAdmin:** Sunucuyu arayüzden bir kez ekle — **Host `postgres`**, port `5432`, veritabanı / kullanıcı / şifre `healthai`. (`localhost` yazma.) Adımlar: `docker/pgadmin/README.md`.

pgAdmin konteyneri sürekli düşüyorsa bozuk volume veya eski imaj kalıntısı olabilir:

```bash
docker compose down
docker volume rm health-ai-app_pgadmin_data
docker compose pull pgadmin
docker compose up -d
```

(`docker volume ls` ile `_pgadmin_data` sonekli tam ismi doğrula.)

Yardimci komutlar:

```bash
# loglari izle
npm run docker:logs

# containerlari kapat
npm run docker:down
```

Not: React Native iOS/Android simulator yine host makinede calisir. Ancak API artik container icindeki backend'e `localhost:3000` uzerinden ulasir.

### Running the App

- **iOS**: `npm run ios` or press `i` in the terminal
- **Android**: `npm run android` or press `a` in the terminal
- **Web**: `npm run web` or press `w` in the terminal

## Screens

1. **Home** - Welcome screen with scan count from Zustand store
2. **Scan Food** - Camera button placeholder for food scanning
3. **History** - Placeholder for scan history
4. **Profile** - Placeholder for user profile and settings

## Next Steps

- Add `expo-camera` for actual camera integration on the Scan screen
- Implement API services in `services/` for nutrition data
- Create reusable components in `components/ui/`
- Add TanStack Query hooks for data fetching
