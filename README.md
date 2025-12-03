# Tick-It 📋

**Your Complete Productivity Companion** - A comprehensive task and expense management app designed to help you stay organized and in control of your daily life.

Built with modern technologies including React Native, Expo, Firebase, and TypeScript, Tick-It offers a seamless experience across all platforms.

## ✨ Core Features

### 📋 Task Management
- **Smart Todo System**: Create, edit, and organize your daily tasks
- **Subtasks Support**: Break down complex projects into manageable subtasks
- **Priority System**: Mark important tasks with priority flags
- **Due Dates & Times**: Set specific deadlines with time reminders
- **Real-time Sync**: Your todos sync instantly across all devices
- **Draft Auto-Save**: Never lose your work with automatic draft saving
- **Bulk Operations**: Delete completed tasks or manage in bulk

### 💰 Expense Tracking
- **Personal & Shared Expenses**: Track individual expenses or split costs with others
- **Flexible Participants**: Add people who owe you money (optional)
- **Payment Tracking**: Mark when people have paid their share
- **Due Dates**: Set payment deadlines with notifications
- **Monthly Statistics**: View spending patterns and totals
- **Auto-Settlement**: Automatic expense settlement tracking

### 🔔 Smart Notifications
- **Multiple Frequencies**: Daily, weekly, or one-time reminders
- **Custom Times**: Set personalized reminder times
- **Weekly Scheduling**: Choose specific days for weekly reminders
- **Cross-Platform**: Works on iOS, Android, and web
- **Offline Support**: Notifications work even when offline

### 👥 User Management
- **Secure Authentication**: Firebase-powered login and registration
- **Password Management**: Change password, reset via email
- **User Profiles**: Customizable display names and preferences
- **Goal Setting**: Set weekly and monthly completion targets

### 🌐 Connectivity & Sync
- **Offline-First**: Full functionality without internet connection
- **Manual Offline Mode**: Toggle offline mode for testing or preference
- **Smart Sync**: Automatic sync when connection is restored
- **Conflict Resolution**: Local changes take precedence during sync
- **Visual Indicators**: Clear online/offline status display

### ♿ Accessibility & Customization
- **Font Scaling**: Adjustable text sizes for better readability
- **High Contrast**: Easy-to-read color scheme
- **Touch-Friendly**: Large tap targets and intuitive gestures
- **Screen Reader Support**: Semantic markup for accessibility tools

### 🧹 Data Management
- **Auto-Cleanup**: Configurable automatic deletion of old data
- **Bulk Actions**: Mass delete completed tasks or old expenses
- **Data Export**: Export your data for backup purposes
- **Privacy Controls**: Full control over your personal information

## 🏗️ Technical Architecture

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build system
- **TypeScript**: Type-safe JavaScript for better code quality
- **React Navigation**: Smooth navigation between screens
- **AsyncStorage**: Local data persistence

### Backend & Services
- **Firebase Firestore**: Real-time NoSQL database
- **Firebase Authentication**: Secure user authentication
- **Expo Notifications**: Cross-platform push notifications
- **Cloud Sync**: Automatic data synchronization

### Development Tools
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Git**: Version control with comprehensive commit history
- **Hot Reload**: Fast development with instant updates

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

## 📁 Project Structure

```
tick-it/
├── components/           # Reusable UI components
│   └── NotificationBanner.tsx
├── contexts/            # React context providers
│   ├── AccessibilityContext.tsx
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── screens/             # Application screens
│   ├── AccessibilitySettingsScreen.tsx
│   ├── AccountSettingsScreen.tsx
│   ├── DataManagementScreen.tsx
│   ├── ExpenseScreen.tsx
│   ├── LoginScreen.tsx
│   ├── NotificationSettingsScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── SettingsScreen.tsx
│   └── TodoScreen.tsx
├── services/            # Business logic services
│   ├── CleanupService.ts
│   └── NotificationService.ts
├── types/               # TypeScript type definitions
│   └── index.ts
├── assets/              # Static assets
├── firebaseConfig.ts    # Firebase configuration
├── App.tsx             # Main application component
└── package.json        # Dependencies and scripts
```

## 🛡️ Security & Privacy

- **Local-First**: All data stored locally first, synced to cloud
- **User Isolation**: Each user's data is completely separate
- **Secure Authentication**: Firebase Auth with email verification
- **Data Encryption**: All network communication encrypted
- **Privacy Controls**: Users control their data retention policies

## 🔄 Development Workflow

### Bug Tracking & Quality Assurance
- Comprehensive bug tracking system (see `BUG_REPORT.md`)
- All 9 critical bugs resolved and documented
- Thorough testing across offline/online scenarios
- Code review process for all changes

### Continuous Improvement
- Regular feature updates and enhancements
- User feedback integration
- Performance monitoring and optimization
- Security updates and patches

## 📱 Platform Support

- **iOS**: Native iOS experience with platform-specific optimizations
- **Android**: Material Design guidelines with native Android features  
- **Web**: Progressive Web App (PWA) capabilities
- **Desktop**: Responsive design works great on larger screens

## 🎯 Future Roadmap

- [ ] Calendar integration for due date visualization
- [ ] Team collaboration features
- [ ] Advanced expense splitting algorithms
- [ ] Data export/import functionality
- [ ] Dark mode theme
- [ ] Widget support for home screen
- [ ] Voice commands and Siri shortcuts
- [ ] Advanced analytics and insights

## 📚 Documentation

- [`NOTIFICATIONS.md`](NOTIFICATIONS.md) - Comprehensive notification system documentation
- [`BUG_REPORT.md`](BUG_REPORT.md) - Detailed bug tracking and resolution log
- [`DATA_MANAGEMENT.md`](DATA_MANAGEMENT.md) - Data cleanup and management features

## 🤝 Contributing

This is a personal productivity app project. For suggestions or feedback, please open an issue or contact the developer.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Enjoy using Tick-It!** 🎉

*Your productivity journey starts here. Tick off your tasks, track your expenses, and take control of your daily life with Tick-It.*
