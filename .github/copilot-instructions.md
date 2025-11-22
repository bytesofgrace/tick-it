# Copilot Instructions for Tick-It

## Project Overview
- **Tick-It** is a cross-platform todo app built with Expo (React Native) and Firebase.
- Core features: user authentication, real-time Firestore sync, CRUD for todos, and responsive UI for web/mobile.
- Main app entry: `App.tsx`. Authentication and todo logic are separated into `contexts/` and `screens/`.

## Architecture & Patterns
- **Contexts**: App-wide state (e.g., Auth) is managed via React Context in `contexts/` (see `AuthContext.tsx`).
- **Screens**: UI and logic for each view are in `screens/` (e.g., `LoginScreen.tsx`, `TodoScreen.tsx`).
- **Firebase**: All backend data and auth handled via Firebase. Config in `firebaseConfig.ts`.
- **Types**: Shared TypeScript types in `types/`.
- **Assets**: Images and icons in `assets/`.

## Developer Workflows
- **Install dependencies**: `npm install`
- **Run for web**: `npm run web`
- **Run for iOS**: `npm run ios` (Mac only)
- **Run for Android**: `npm run android`
- **Start dev server**: `npm start`
- **Firebase setup**: Update `firebaseConfig.ts` with your Firebase project details.
- **Firestore rules**: Restrict todos to user ownership (see `README.md` for example rules).

## Project Conventions
- **Todos**: Each todo is tied to a user (`userId` field). Only the owner can read/write.
- **Auth**: Uses Firebase Auth (email/password). Auth state is managed in `AuthContext.tsx`.
- **Navigation**: (If present) is handled via React Navigation, typically in `App.tsx`.
- **Styling**: Uses React Native StyleSheet or inline styles. No CSS files.
- **No backend server**: All data is in Firebase; no custom backend.

## Integration Points
- **Firebase**: All data and auth flows go through Firebase SDK. No REST API calls.
- **Expo**: Handles build, run, and platform-specific logic.

## Examples
- To add a new screen: create a file in `screens/`, add to navigation in `App.tsx`.
- To add a new context: create in `contexts/`, wrap in `App.tsx`.
- To use Firebase: import from `firebaseConfig.ts` and use Firebase JS SDK methods.

## Key Files
- `App.tsx`: App entry, navigation, context providers
- `contexts/AuthContext.tsx`: Auth logic/state
- `screens/TodoScreen.tsx`: Main todo UI/logic
- `firebaseConfig.ts`: Firebase setup
- `README.md`: Setup, workflow, and security rules

---
For more details, see the `README.md`.
