# Tick-It 📋

A modern, beautiful todo list web app built with Expo and Firebase. Manage your tasks with style!

## Features 🌟

- **User Authentication**: Secure login and registration with Firebase Auth
- **Real-time Sync**: Your todos sync instantly across all devices
- **Beautiful UI**: Modern, clean design with smooth animations
- **CRUD Operations**: Create, read, update, and delete todos
- **Task Management**: Mark todos as complete/incomplete
- **Smart Notifications**: Flexible reminders (daily, weekly, or one-time) with custom times
- **Statistics**: View total, active, and completed task counts
- **Responsive**: Works great on web, iOS, and Android

## Setup Instructions 🚀

### 1. Prerequisites

- Node.js (18.17.1 or higher recommended)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`

### 2. Clone and Install Dependencies

```bash
cd tick-it
npm install
```

### 3. Firebase Setup

1. **Create a Firebase Project**:

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Authentication**:

   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider

3. **Create Firestore Database**:

   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (for development)

4. **Get Firebase Configuration**:

   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click "Web" icon to add a web app
   - Copy the configuration object

5. **Update Firebase Config**:
   - Open `firebaseConfig.ts`
   - Replace the placeholder values with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
```

### 4. Set Up Firestore Security Rules

In your Firebase console, go to Firestore Database > Rules and update them:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own todos
    match /todos/{document} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 5. Run the App

```bash
# For web development
npm run web

# For iOS (requires Mac with Xcode)
npm run ios

# For Android (requires Android Studio/emulator)
npm run android

# Start the development server
npm start
```

## Notifications 🔔

Tick-It includes a fully functional notification system! Enable daily reminders in the Settings screen to get notified at 9 AM every day to check your tasks. See [NOTIFICATIONS.md](NOTIFICATIONS.md) for detailed documentation.

Enjoy using Tick-It! 🎉
