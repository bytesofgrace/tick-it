import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useNotification } from '../contexts/NotificationContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { NotificationService } from '../services/NotificationService';

type NotificationFrequency = 'none' | 'daily' | 'weekly' | 'once';

const DAYS_OF_WEEK = [
  { label: 'Sunday', value: 1 },
  { label: 'Monday', value: 2 },
  { label: 'Tuesday', value: 3 },
  { label: 'Wednesday', value: 4 },
  { label: 'Thursday', value: 5 },
  { label: 'Friday', value: 6 },
  { label: 'Saturday', value: 7 },
];

export default function NotificationSettingsScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const { isOnline } = useAccessibility();
  const { showNotification } = useNotification();
  const [frequency, setFrequency] = useState<NotificationFrequency>('none');
  const [reminderTime, setReminderTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 3, 4, 5, 6]); // Mon-Fri default
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [oneTimeDate, setOneTimeDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, [currentUser]);

  // Sync pending changes when coming back online
  useEffect(() => {
    const syncPendingChanges = async () => {
      // Always check AsyncStorage for pending flag (don't rely on state)
      const hasPending = await AsyncStorage.getItem('@notification_settings_pending');
      console.log(`🔄 Sync check: isOnline=${isOnline}, hasPending=${hasPending}, hasUser=${!!currentUser}`);
      
      if (isOnline && hasPending === 'true' && currentUser) {
        try {
          console.log('🚀 Starting auto-sync of pending changes...');
          const cachedSettings = await AsyncStorage.getItem('@notification_settings');
          if (cachedSettings) {
            const settings = JSON.parse(cachedSettings);
            console.log('📤 Syncing settings to Firestore:', settings);
            await setDoc(
              doc(db, 'users', currentUser.uid),
              {
                notificationFrequency: settings.frequency,
                notificationsEnabled: settings.notificationsEnabled,
                reminderHour: settings.reminderHour,
                reminderMinute: settings.reminderMinute,
                selectedDays: settings.selectedDays,
                oneTimeDate: settings.oneTimeDate,
              },
              { merge: true }
            );
            setPendingSync(false);
            await AsyncStorage.removeItem('@notification_settings_pending');
            console.log('✅ Pending notification settings synced to Firestore successfully!');
          }
        } catch (error) {
          console.error('❌ Error syncing pending notification settings:', error);
        }
      }
    };

    syncPendingChanges();
  }, [isOnline, pendingSync, currentUser]);

  const loadNotificationSettings = async () => {
    if (!currentUser) return;

    try {
      // Check if there are pending changes
      const hasPending = await AsyncStorage.getItem('@notification_settings_pending');
      if (hasPending === 'true') {
        setPendingSync(true);
      }

      // Load from AsyncStorage first (works offline)
      const cachedSettings = await AsyncStorage.getItem('@notification_settings');
      if (cachedSettings) {
        const settings = JSON.parse(cachedSettings);
        setFrequency(settings.frequency || 'none');
        if (settings.reminderHour !== undefined && settings.reminderMinute !== undefined) {
          const time = new Date();
          time.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
          setReminderTime(time);
        }
        if (settings.selectedDays) {
          setSelectedDays(settings.selectedDays);
        }
        if (settings.oneTimeDate) {
          setOneTimeDate(new Date(settings.oneTimeDate));
        }
        console.log('📱 Loaded notification settings from cache');
      }

      // Only load from Firestore if there's no pending sync (to avoid overwriting offline changes)
      if (hasPending !== 'true') {
        console.log('☁️ No pending changes, safe to load from Firestore');
      } else {
        console.log('⏳ SKIPPING Firestore load - pending changes detected, will sync when online');
      }
      
      if (hasPending !== 'true') {
        try {
          console.log('☁️ No pending changes, loading from Firestore...');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            const firestoreSettings = {
              frequency: data.notificationFrequency || 'none',
              reminderHour: data.reminderHour,
              reminderMinute: data.reminderMinute,
              selectedDays: data.selectedDays || [2, 3, 4, 5, 6],
              oneTimeDate: data.oneTimeDate,
            };

            // Load frequency
            if (data.notificationFrequency) {
              setFrequency(data.notificationFrequency);
            }

            // Load time
            if (data.reminderHour !== undefined && data.reminderMinute !== undefined) {
              const time = new Date();
              time.setHours(data.reminderHour, data.reminderMinute, 0, 0);
              setReminderTime(time);
            }

            // Load selected days for weekly
            if (data.selectedDays) {
              setSelectedDays(data.selectedDays);
            }

            // Load one-time date
            if (data.oneTimeDate) {
              setOneTimeDate(new Date(data.oneTimeDate));
            }

            // Update AsyncStorage cache
            await AsyncStorage.setItem('@notification_settings', JSON.stringify(firestoreSettings));
            console.log('✓ Notification settings synced from Firestore');
          }
        } catch (firestoreError) {
          console.log('📴 Using cached notification settings (offline)');
        }
      } else {
        console.log('⏳ Skipping Firestore load - pending changes will sync first');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleFrequencyChange = async (newFrequency: NotificationFrequency) => {
    setFrequency(newFrequency);

    // Show immediate feedback for frequency selection
    const frequencyMessages = {
      'none': 'Notifications turned off',
      'daily': 'Daily reminders selected - set your time below',
      'weekly': 'Weekly reminders selected - choose days and time below', 
      'once': 'One-time reminder selected - set date and time below'
    };
    
    showNotification('Reminder Type', frequencyMessages[newFrequency], 'info', 1800);

    // If turning off notifications, cancel all
    if (newFrequency === 'none') {
      await NotificationService.cancelAllReminders();
      await saveSettings(newFrequency);
      return;
    }

    // Request permissions if not already granted
    const granted = await NotificationService.requestPermissions();
    if (!granted) {
      showNotification(
        'Permission Denied',
        'Please enable notifications in your device settings.',
        'error',
        3000
      );
      setFrequency('none');
      return;
    }

    // Apply the selected frequency
    await applyNotificationSchedule(newFrequency);
  };

  const applyNotificationSchedule = async (freq?: NotificationFrequency) => {
    const currentFreq = freq || frequency;
    const hour = reminderTime.getHours();
    const minute = reminderTime.getMinutes();

    try {
      switch (currentFreq) {
        case 'daily':
          const dailyId = await NotificationService.scheduleDailyReminder(hour, minute);
          if (dailyId) {
            showNotification('Daily Reminder Set', `You'll receive a reminder every day at ${formatTime(reminderTime)}`, 'success', 2000);
          }
          break;

        case 'weekly':
          if (selectedDays.length === 0) {
            showNotification('Select Days', 'Please select at least one day for weekly reminders.', 'error', 2000);
            return;
          }
          const weeklyIds = await NotificationService.scheduleWeeklyReminders(hour, minute, selectedDays);
          if (weeklyIds.length > 0) {
            const days = selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ');
            showNotification('Weekly Reminders Set', `You'll receive reminders on ${days} at ${formatTime(reminderTime)}`, 'success', 2000);
          }
          break;

        case 'once':
          const onceId = await NotificationService.scheduleOneTimeReminder(oneTimeDate);
          if (onceId) {
            showNotification('One-Time Reminder Set', `You'll receive a reminder on ${formatDateTime(oneTimeDate)}`, 'success', 2000);
          } else {
            showNotification('Invalid Date', 'The selected date/time has already passed. Please choose a future date.', 'error', 2500);
            return;
          }
          break;
      }

      await saveSettings(currentFreq);
    } catch (error) {
      console.error('Error applying notification schedule:', error);
      showNotification('Error', 'Failed to schedule notifications', 'error', 2500);
    }
  };

  const saveSettings = async (freq?: NotificationFrequency) => {
    if (!currentUser) return;

    const currentFreq = freq || frequency;

    const settings = {
      frequency: currentFreq,
      notificationsEnabled: currentFreq !== 'none',
      reminderHour: reminderTime.getHours(),
      reminderMinute: reminderTime.getMinutes(),
      selectedDays: selectedDays,
      oneTimeDate: oneTimeDate.toISOString(),
      timestamp: Date.now(), // Add timestamp to track which is newer
    };

    // Always save to AsyncStorage first (works offline)
    try {
      await AsyncStorage.setItem('@notification_settings', JSON.stringify(settings));
      console.log('💾 Notification settings saved locally');
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }

    // Try to sync to Firestore if online
    if (isOnline) {
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            notificationFrequency: currentFreq,
            notificationsEnabled: currentFreq !== 'none',
            reminderHour: reminderTime.getHours(),
            reminderMinute: reminderTime.getMinutes(),
            selectedDays: selectedDays,
            oneTimeDate: oneTimeDate.toISOString(),
          },
          { merge: true }
        );
        console.log('✓ Notification settings synced to Firestore');
        setPendingSync(false);
        await AsyncStorage.removeItem('@notification_settings_pending'); // Clear pending flag
      } catch (error) {
        console.error('Error syncing notification settings:', error);
        setPendingSync(true);
        await AsyncStorage.setItem('@notification_settings_pending', 'true'); // Mark as pending
        console.log('⏳ Will sync notification settings when online');
      }
    } else {
      setPendingSync(true);
      await AsyncStorage.setItem('@notification_settings_pending', 'true'); // Mark as pending
      console.log('📴 Offline - will sync notification settings when online');
      console.log('📴 Settings marked as pending:', settings);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedTime) {
      setReminderTime(selectedTime);
      
      // Show immediate feedback
      showNotification('Time Updated', `Reminder time set to ${formatTime(selectedTime)}`, 'success', 1800);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setOneTimeDate(selectedDate);
      
      // Show immediate feedback
      showNotification('Date & Time Updated', `Reminder set for ${formatDateTime(selectedDate)}`, 'success', 2000);
    }
  };

  const toggleDay = (day: number) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort();
      
      // Show immediate feedback
      const dayName = dayNames[day - 1];
      if (prev.includes(day)) {
        showNotification('Day Removed', `${dayName} removed from weekly reminders`, 'info', 1500);
      } else {
        showNotification('Day Added', `${dayName} added to weekly reminders`, 'success', 1500);
      }
      
      return newDays;
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {/* Frequency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Frequency</Text>
          
          {[
            { value: 'none', label: 'None', subtitle: 'No reminders' },
            { value: 'daily', label: 'Daily', subtitle: 'Every day at the same time' },
            { value: 'weekly', label: 'Weekly', subtitle: 'Selected days of the week' },
            { value: 'once', label: 'Once', subtitle: 'One-time reminder' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyOption,
                frequency === option.value && styles.frequencyOptionSelected,
              ]}
              onPress={() => handleFrequencyChange(option.value as NotificationFrequency)}
            >
              <View style={styles.frequencyContent}>
                <Text style={[
                  styles.frequencyLabel,
                  frequency === option.value && styles.frequencyLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.frequencySubtitle}>{option.subtitle}</Text>
              </View>
              {frequency === option.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Day Selection for Weekly */}
        {frequency === 'weekly' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repeat On</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.value) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.value) && styles.dayButtonTextSelected,
                  ]}>
                    {day.label.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Time Picker for Daily/Weekly */}
        {(frequency === 'daily' || frequency === 'weekly') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeLabel}>Time</Text>
              <Text style={styles.timeValue}>{formatTime(reminderTime)}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  textColor="#6C55BE"
                  themeVariant="light"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => applyNotificationSchedule()}
            >
              <Text style={styles.applyButtonText}>
                {frequency === 'daily' ? 'Save Daily Reminder' : 'Save Weekly Reminders'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date/Time Picker for Once */}
        {frequency === 'once' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Date & Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.timeLabel}>Date & Time</Text>
              <Text style={styles.timeValue}>{formatDateTime(oneTimeDate)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={oneTimeDate}
                  mode="datetime"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor="#6C55BE"
                  themeVariant="light"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => applyNotificationSchedule()}
            >
              <Text style={styles.applyButtonText}>Set Reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {frequency === 'none' && '💡 Enable reminders to stay on top of your tasks'}
            {frequency === 'daily' && '📅 You\'ll receive a reminder every day at the selected time'}
            {frequency === 'weekly' && '📆 You\'ll receive reminders on the selected days each week'}
            {frequency === 'once' && '⏰ You\'ll receive a one-time reminder at the selected date and time'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6C55BE',
  },
  header: {
    backgroundColor: '#6C55BE',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 28,
    color: '#CEE476',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CEE476',
  },
  placeholder: {
    width: 40,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  frequencyOption: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    borderColor: '#CEE476',
    backgroundColor: '#F0F9FF',
  },
  frequencyContent: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: '#6C55BE',
  },
  frequencySubtitle: {
    fontSize: 13,
    color: '#8B7BA8',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C55BE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
  },
  timeValue: {
    fontSize: 16,
    color: '#8B7BA8',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#6C55BE',
    borderColor: '#6C55BE',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7BA8',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: '#6C55BE',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 14,
    color: '#6C55BE',
    lineHeight: 20,
  },
  datePickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#CEE476',
    alignItems: 'center',
  },
});
