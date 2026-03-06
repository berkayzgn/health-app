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
