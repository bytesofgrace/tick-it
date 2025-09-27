# Tick-It 📋

A modern, beautiful todo list web app built with Expo and Firebase. Manage your tasks with style!

## Features 🌟

- **User Authentication**: Secure login and registration with Firebase Auth
- **Real-time Sync**: Your todos sync instantly across all devices
- **Beautiful UI**: Modern, clean design with smooth animations
- **CRUD Operations**: Create, read, update, and delete todos
- **Task Management**: Mark todos as complete/incomplete
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

## Project Structure 📁

```
tick-it/
├── contexts/
│   └── AuthContext.tsx      # Authentication context and hooks
├── screens/
│   ├── LoginScreen.tsx      # Login interface
│   ├── RegisterScreen.tsx   # Registration interface
│   └── TodoScreen.tsx       # Main todo list interface
├── types/
│   └── index.ts            # TypeScript type definitions
├── firebaseConfig.ts       # Firebase configuration
└── App.tsx                 # Main app component with navigation
```

## Key Technologies 🛠️

- **Expo**: Cross-platform development framework
- **React Native**: Mobile app development
- **TypeScript**: Type-safe JavaScript
- **Firebase Auth**: User authentication
- **Firestore**: Real-time NoSQL database
- **React Navigation**: App navigation
- **React Native Async Storage**: Local storage

## App Screens 📱

### Authentication Flow

- **Login Screen**: Email/password authentication with validation
- **Register Screen**: New user registration with confirm password

### Main App

- **Todo Screen**:
  - View all todos with real-time updates
  - Add new todos with title and description
  - Edit existing todos
  - Mark todos as complete/incomplete
  - Delete todos with confirmation
  - View statistics (total, active, completed)
  - Logout functionality

## Security Features 🔒

- Email/password authentication with Firebase
- Firestore security rules prevent unauthorized access
- User can only see and modify their own todos
- Input validation on all forms
- Secure token-based authentication

## Development 👨‍💻

### Adding New Features

1. **New Screens**: Add to `screens/` directory and update navigation
2. **New Components**: Create reusable components in `components/` directory
3. **State Management**: Use React hooks or add context providers
4. **Firebase Integration**: Use existing Firestore configuration

### Testing

```bash
# Run the app in development mode
npm start

# Test on different platforms
npm run web    # Browser testing
npm run ios    # iOS simulator (Mac only)
npm run android # Android emulator
```

## Troubleshooting 🔧

### Common Issues

1. **Node version warnings**: The app works despite Node.js version warnings
2. **Firebase connection**: Ensure your firebaseConfig.ts has correct values
3. **Authentication issues**: Check Firebase console for auth provider settings
4. **Firestore permissions**: Verify security rules are properly configured

### Firebase Debugging

- Check Firebase console for authentication and Firestore activity
- Enable debug logging in development
- Verify network connectivity

## Future Enhancements 🚀

Potential features to add:

- Categories and tags for todos
- Due dates and reminders
- File attachments
- Collaboration features
- Dark mode theme
- Offline support
- Push notifications

## Support 💬

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify your Firebase configuration
3. Check the Expo documentation
4. Review Firebase console for errors

---

Enjoy using Tick-It! 🎉
