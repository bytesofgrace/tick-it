# Notification Feature Documentation

## Overview
The Tick-It app now includes a fully functional, iOS-style notification system that allows users to receive flexible reminders about their tasks.

## Features Implemented

### 1. **Notification Permissions**
- The app requests notification permissions when users enable notifications
- Permissions are handled gracefully on both iOS and Android
- Users are prompted to enable notifications in device settings if permissions are denied

### 2. **Flexible Reminder Options**
Users can choose from multiple reminder frequencies:
- **None**: No reminders
- **Daily**: Receive reminders every day at a custom time
- **Weekly**: Select specific days of the week and time
- **Once**: Schedule a one-time reminder for a specific date and time

### 3. **Custom Time Selection**
- iOS-style time picker for selecting reminder times
- Date/time picker for one-time reminders
- All times are displayed in 12-hour format with AM/PM

### 4. **Weekly Day Selection**
- Visual day selector (Sun-Sat)
- Multiple days can be selected
- Reminders are scheduled for each selected day
- Days are highlighted when selected

### 5. **Notification Settings Screen**
- Dedicated settings screen with iOS-inspired design
- Settings are stored in Firestore under the user's document
- Settings persist across sessions and devices
- Real-time updates when changing preferences

### 4. **Notification Service**
A comprehensive `NotificationService` class provides:
- Permission requests and checks
- Daily reminder scheduling and cancellation
- Task-specific reminders (infrastructure ready for future use)
- Immediate notifications
- Full notification management (view, cancel all, etc.)

## How to Use

### For Users:
1. Open the **Settings** screen
2. Tap on **Notifications**
3. Select your preferred reminder frequency:
   - **None**: Turn off all reminders
   - **Daily**: Set a time for daily reminders
   - **Weekly**: Choose specific days and time
   - **Once**: Schedule a one-time reminder
4. Customize the time using the time picker
5. For weekly reminders, select which days you want to be reminded
6. You'll receive a confirmation when reminders are set

### For Developers:

#### Notification Service Usage:
```typescript
import { NotificationService } from '../services/NotificationService';

// Request permissions
const granted = await NotificationService.requestPermissions();

// Schedule daily reminder at custom time
await NotificationService.scheduleDailyReminder(9, 30); // 9:30 AM

// Schedule weekly reminders (Monday, Wednesday, Friday at 2 PM)
await NotificationService.scheduleWeeklyReminders(14, 0, [2, 4, 6]);

// Schedule one-time reminder
const reminderDate = new Date(2025, 11, 23, 14, 0); // Dec 23, 2025 at 2 PM
await NotificationService.scheduleOneTimeReminder(reminderDate);

// Cancel all reminders
await NotificationService.cancelAllReminders();

// Send immediate notification
await NotificationService.sendImmediateNotification(
  'Task Complete!',
  'Great job finishing your task!'
);

// Schedule task reminder (for future feature)
await NotificationService.scheduleTaskReminder(
  'task-123',
  'Finish project report',
  new Date(2025, 11, 23, 14, 0) // Dec 23, 2025 at 2 PM
);
```

## Technical Details

### Dependencies:
- `expo-notifications`: Handles all notification functionality
- `@react-native-async-storage/async-storage`: Stores notification IDs locally

### Files Modified/Created:
1. **`services/NotificationService.ts`**: Core notification logic with support for daily, weekly, and one-time reminders
2. **`screens/NotificationSettingsScreen.tsx`**: Dedicated notification settings screen with iOS-style UI
3. **`screens/SettingsScreen.tsx`**: Updated to navigate to notification settings
4. **`App.tsx`**: Added NotificationSettings screen to navigation stack
5. **`app.json`**: Android/iOS notification permissions configured
6. **Firestore**: User documents now store:
   - `notificationFrequency`: 'none', 'daily', 'weekly', or 'once'
   - `reminderHour`: Hour for the reminder (0-23)
   - `reminderMinute`: Minute for the reminder (0-59)
   - `selectedDays`: Array of selected weekdays (for weekly reminders)
   - `oneTimeDate`: ISO string of the one-time reminder date

### Platform Support:
- ✅ **Android**: Full support with notification channels
- ✅ **iOS**: Full support with proper permissions
- ✅ **Web**: Basic support (browser notifications)

## Future Enhancements
- [x] Customizable reminder times ✅ Implemented
- [x] Weekly reminders with day selection ✅ Implemented
- [x] One-time reminders ✅ Implemented
- [ ] Task-specific reminders (due date notifications)
- [ ] Weekly/monthly summary notifications
- [ ] Notification history
- [ ] Different notification sounds/vibration patterns
- [ ] Snooze functionality

## Testing

To test notifications:
1. Navigate to Settings → Notifications
2. Select a frequency (Daily, Weekly, or Once)
3. Set a time (you can set it to 1-2 minutes from now for quick testing)
4. For weekly, select specific days
5. For one-time, select a date/time in the near future
6. You should receive a notification at the scheduled time

For immediate testing during development:
```typescript
import { NotificationService } from './services/NotificationService';

// Send a test notification immediately
await NotificationService.sendImmediateNotification(
  'Test Notification',
  'This is a test!'
);
```

## Troubleshooting

**Notifications not appearing?**
- Check device notification settings for the app
- Ensure the app has notification permissions
- On Android, verify the notification channel is created
- Check that Do Not Disturb is not enabled

**Daily reminders not working?**
- Ensure "Notifications" toggle is ON first
- Check that the scheduled notification exists using `getAllScheduledNotifications()`
- On Android, ensure "SCHEDULE_EXACT_ALARM" permission is granted

## Security Notes
- Notification preferences are stored per-user in Firestore
- Only the authenticated user can modify their own notification settings
- No sensitive task data is included in notification payloads (task IDs only)
