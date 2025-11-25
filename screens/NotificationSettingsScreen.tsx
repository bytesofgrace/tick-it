import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
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
  const [frequency, setFrequency] = useState<NotificationFrequency>('none');
  const [reminderTime, setReminderTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 3, 4, 5, 6]); // Mon-Fri default
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [oneTimeDate, setOneTimeDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, [currentUser]);

  const loadNotificationSettings = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        
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
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleFrequencyChange = async (newFrequency: NotificationFrequency) => {
    setFrequency(newFrequency);

    // If turning off notifications, cancel all
    if (newFrequency === 'none') {
      await NotificationService.cancelAllReminders();
      await saveSettings(newFrequency);
      return;
    }

    // Request permissions if not already granted
    const granted = await NotificationService.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings.',
        [{ text: 'OK' }]
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
            Alert.alert('Daily Reminder Set', `You'll receive a reminder every day at ${formatTime(reminderTime)}`);
          }
          break;

        case 'weekly':
          if (selectedDays.length === 0) {
            Alert.alert('Select Days', 'Please select at least one day for weekly reminders.');
            return;
          }
          const weeklyIds = await NotificationService.scheduleWeeklyReminders(hour, minute, selectedDays);
          if (weeklyIds.length > 0) {
            const days = selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ');
            Alert.alert('Weekly Reminders Set', `You'll receive reminders on ${days} at ${formatTime(reminderTime)}`);
          }
          break;

        case 'once':
          const onceId = await NotificationService.scheduleOneTimeReminder(oneTimeDate);
          if (onceId) {
            Alert.alert('One-Time Reminder Set', `You'll receive a reminder on ${formatDateTime(oneTimeDate)}`);
          } else {
            Alert.alert('Invalid Date', 'The selected date/time has already passed. Please choose a future date.');
            return;
          }
          break;
      }

      await saveSettings(currentFreq);
    } catch (error) {
      console.error('Error applying notification schedule:', error);
      Alert.alert('Error', 'Failed to schedule notifications');
    }
  };

  const saveSettings = async (freq?: NotificationFrequency) => {
    if (!currentUser) return;

    const currentFreq = freq || frequency;

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
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedTime) {
      setReminderTime(selectedTime);
      
      // Reapply schedule if frequency is already set
      if (frequency === 'daily' || frequency === 'weekly') {
        setTimeout(() => applyNotificationSchedule(), 500);
      }
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setOneTimeDate(selectedDate);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort();
      
      // Reapply schedule if weekly is selected
      if (frequency === 'weekly' && newDays.length > 0) {
        setTimeout(() => applyNotificationSchedule(), 500);
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
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
        )}

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
              <DateTimePicker
                value={oneTimeDate}
                mode="datetime"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
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
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    minWidth: '13%',
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
});
