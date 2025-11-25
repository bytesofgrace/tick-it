import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CleanupService, CleanupSettings, DEFAULT_CLEANUP_SETTINGS } from '../services/CleanupService';

export default function DataManagementScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<CleanupSettings>(DEFAULT_CLEANUP_SETTINGS);
  const [stats, setStats] = useState({ completedTasks: 0, oldExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, [currentUser]);

  const loadSettings = async () => {
    const savedSettings = await CleanupService.getCleanupSettings();
    setSettings(savedSettings);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!currentUser) return;
    const cleanupStats = await CleanupService.getCleanupStats(currentUser.uid);
    setStats(cleanupStats);
  };

  const handleToggleAutoDeleteTasks = async (value: boolean) => {
    const newSettings = { ...settings, autoDeleteCompletedTasks: value };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    
    if (value) {
      Alert.alert(
        'Auto-Delete Enabled',
        `Completed tasks will be automatically deleted after ${settings.taskRetentionHours} hours.`
      );
    }
  };

  const handleToggleAutoDeleteExpenses = async (value: boolean) => {
    const newSettings = { ...settings, autoDeleteOldExpenses: value };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    
    if (value) {
      Alert.alert(
        'Auto-Delete Enabled',
        `Expenses will be automatically deleted after ${settings.expenseRetentionDays} days.`
      );
    }
  };

  const handleChangeTaskRetention = () => {
    Alert.alert(
      'Change Task Retention',
      `Delete completed tasks after how many hours?`,
      [
        { text: '12 hours', onPress: () => updateTaskRetention(12) },
        { text: '24 hours', onPress: () => updateTaskRetention(24) },
        { text: '48 hours', onPress: () => updateTaskRetention(48) },
        { text: '1 week', onPress: () => updateTaskRetention(168) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateTaskRetention = async (hours: number) => {
    const newSettings = { ...settings, taskRetentionHours: hours };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    Alert.alert('Updated', `Tasks will be deleted ${hours} hours after completion.`);
  };

  const handleChangeExpenseRetention = () => {
    Alert.alert(
      'Change Expense Retention',
      `Delete expenses after how many days?`,
      [
        { text: '7 days', onPress: () => updateExpenseRetention(7) },
        { text: '30 days', onPress: () => updateExpenseRetention(30) },
        { text: '60 days', onPress: () => updateExpenseRetention(60) },
        { text: '90 days', onPress: () => updateExpenseRetention(90) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateExpenseRetention = async (days: number) => {
    const newSettings = { ...settings, expenseRetentionDays: days };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    Alert.alert('Updated', `Expenses will be deleted after ${days} days.`);
  };

  const handleBulkDeleteCompletedTasks = () => {
    Alert.alert(
      'Delete All Completed Tasks',
      `This will permanently delete all ${stats.completedTasks} completed tasks. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            setCleaning(true);
            const count = await CleanupService.bulkDeleteAllCompletedTasks(currentUser.uid);
            setCleaning(false);
            await loadStats();
            Alert.alert('Success', `Deleted ${count} completed tasks.`);
          },
        },
      ]
    );
  };

  const handleBulkDeleteOldExpenses = () => {
    Alert.alert(
      'Delete Old Expenses',
      `Delete expenses older than how many days?`,
      [
        {
          text: '30 days',
          onPress: () => confirmDeleteExpenses(30),
        },
        {
          text: '60 days',
          onPress: () => confirmDeleteExpenses(60),
        },
        {
          text: '90 days',
          onPress: () => confirmDeleteExpenses(90),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmDeleteExpenses = (days: number) => {
    Alert.alert(
      'Confirm Deletion',
      `This will permanently delete all expenses older than ${days} days. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            setCleaning(true);
            const count = await CleanupService.bulkDeleteOldExpenses(currentUser.uid, days);
            setCleaning(false);
            await loadStats();
            Alert.alert('Success', `Deleted ${count} old expenses.`);
          },
        },
      ]
    );
  };

  const handleRunCleanupNow = async () => {
    if (!currentUser) return;
    
    setCleaning(true);
    const results = await CleanupService.runAutoCleanup(currentUser.uid);
    setCleaning(false);
    await loadStats();
    
    Alert.alert(
      'Cleanup Complete',
      `Deleted ${results.tasks} completed tasks and ${results.expenses} old expenses.`
    );
  };

  const formatRetentionTime = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    if (hours === 24) return '1 day';
    if (hours === 48) return '2 days';
    if (hours === 168) return '1 week';
    return `${Math.round(hours / 24)} days`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#CEE476" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Management</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Data</Text>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed Tasks</Text>
            <Text style={styles.statValue}>{stats.completedTasks}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Old Expenses (30+ days)</Text>
            <Text style={styles.statValue}>{stats.oldExpenses}</Text>
          </View>
        </View>

        {/* Automatic Cleanup Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automatic Cleanup</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-delete completed tasks</Text>
                <Text style={styles.settingSubtext}>
                  After {formatRetentionTime(settings.taskRetentionHours)}
                </Text>
              </View>
              <Switch
                value={settings.autoDeleteCompletedTasks}
                onValueChange={handleToggleAutoDeleteTasks}
                trackColor={{ false: '#8B7BA8', true: '#CEE476' }}
                thumbColor={settings.autoDeleteCompletedTasks ? '#6C55BE' : '#f4f3f4'}
              />
            </View>
            {settings.autoDeleteCompletedTasks && (
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleChangeTaskRetention}
              >
                <Text style={styles.changeButtonText}>Change retention period</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-delete old expenses</Text>
                <Text style={styles.settingSubtext}>
                  After {settings.expenseRetentionDays} days
                </Text>
              </View>
              <Switch
                value={settings.autoDeleteOldExpenses}
                onValueChange={handleToggleAutoDeleteExpenses}
                trackColor={{ false: '#8B7BA8', true: '#CEE476' }}
                thumbColor={settings.autoDeleteOldExpenses ? '#6C55BE' : '#f4f3f4'}
              />
            </View>
            {settings.autoDeleteOldExpenses && (
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleChangeExpenseRetention}
              >
                <Text style={styles.changeButtonText}>Change retention period</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.runCleanupButton}
            onPress={handleRunCleanupNow}
            disabled={cleaning}
          >
            {cleaning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.runCleanupButtonText}>🧹 Run Cleanup Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bulk Cleanup Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bulk Actions</Text>
          
          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={handleBulkDeleteCompletedTasks}
            disabled={stats.completedTasks === 0 || cleaning}
          >
            <Text style={styles.bulkActionIcon}>🗑️</Text>
            <View style={styles.bulkActionInfo}>
              <Text style={styles.bulkActionLabel}>Delete all completed tasks</Text>
              <Text style={styles.bulkActionSubtext}>
                {stats.completedTasks} tasks will be deleted
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkActionButton}
            onPress={handleBulkDeleteOldExpenses}
            disabled={cleaning}
          >
            <Text style={styles.bulkActionIcon}>💰</Text>
            <View style={styles.bulkActionInfo}>
              <Text style={styles.bulkActionLabel}>Delete old expenses</Text>
              <Text style={styles.bulkActionSubtext}>Choose retention period</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            💡 Automatic cleanup runs every 6 hours when the app is active. Deleted items cannot be recovered.
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
  statCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  settingCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 13,
    color: '#8B7BA8',
  },
  changeButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#6C55BE',
    textDecorationLine: 'underline',
  },
  runCleanupButton: {
    backgroundColor: '#6C55BE',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  runCleanupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bulkActionButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkActionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  bulkActionInfo: {
    flex: 1,
  },
  bulkActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  bulkActionSubtext: {
    fontSize: 13,
    color: '#8B7BA8',
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
