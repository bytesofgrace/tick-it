import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // For Android, set up notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6C55BE',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Check if notifications are enabled
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Schedule a daily reminder notification
  static async scheduleDailyReminder(hour: number = 9, minute: number = 0): Promise<string | null> {
    try {
      // Cancel any existing reminders
      await this.cancelAllReminders();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Time to check your tasks!',
          body: 'Don\'t forget to complete your daily todos',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      // Save the notification ID
      await AsyncStorage.setItem('reminderNotificationId', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return null;
    }
  }

  // Schedule weekly reminders on specific days
  static async scheduleWeeklyReminders(
    hour: number,
    minute: number,
    selectedDays: number[] // 1=Sunday, 2=Monday, ..., 7=Saturday
  ): Promise<string[]> {
    try {
      // Cancel any existing reminders
      await this.cancelAllReminders();

      const notificationIds: string[] = [];

      for (const weekday of selectedDays) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Time to check your tasks!',
            body: 'Don\'t forget to complete your todos',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
          },
        });
        notificationIds.push(notificationId);
      }

      // Save all notification IDs
      await AsyncStorage.setItem('reminderNotificationIds', JSON.stringify(notificationIds));
      return notificationIds;
    } catch (error) {
      console.error('Error scheduling weekly reminders:', error);
      return [];
    }
  }

  // Schedule a one-time notification
  static async scheduleOneTimeReminder(date: Date): Promise<string | null> {
    try {
      // Don't schedule if the time has already passed
      if (date <= new Date()) {
        return null;
      }

      // Cancel any existing reminders
      await this.cancelAllReminders();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Time to check your tasks!',
          body: 'Don\'t forget to complete your todos',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });

      // Save the notification ID
      await AsyncStorage.setItem('reminderNotificationId', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling one-time reminder:', error);
      return null;
    }
  }

  // Cancel all reminders (daily, weekly, one-time)
  static async cancelAllReminders(): Promise<void> {
    try {
      // Cancel single reminder
      const notificationId = await AsyncStorage.getItem('reminderNotificationId');
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await AsyncStorage.removeItem('reminderNotificationId');
      }

      // Cancel multiple reminders (weekly)
      const notificationIdsJson = await AsyncStorage.getItem('reminderNotificationIds');
      if (notificationIdsJson) {
        const notificationIds = JSON.parse(notificationIdsJson);
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        await AsyncStorage.removeItem('reminderNotificationIds');
      }
    } catch (error) {
      console.error('Error canceling reminders:', error);
    }
  }

  // Cancel daily reminder (legacy method, kept for compatibility)
  static async cancelDailyReminder(): Promise<void> {
    await this.cancelAllReminders();
  }

  // Send an immediate notification (for testing or specific events)
  static async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  // Schedule a notification for a specific todo due date
  static async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<string | null> {
    try {
      // Schedule notification 1 hour before due time
      const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000);
      
      // Don't schedule if the time has already passed
      if (reminderTime <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task reminder',
          body: `"${taskTitle}" is due in 1 hour`,
          data: { taskId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return null;
    }
  }

  // Cancel a specific scheduled notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Cancel all scheduled notifications (everything)
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('reminderNotificationId');
      await AsyncStorage.removeItem('reminderNotificationIds');
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }
}
