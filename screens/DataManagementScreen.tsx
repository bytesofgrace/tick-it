import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { CleanupService, CleanupSettings, DEFAULT_CLEANUP_SETTINGS } from '../services/CleanupService';

export default function DataManagementScreen({ navigation }: any) {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const deleteTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [settings, setSettings] = useState<CleanupSettings>(DEFAULT_CLEANUP_SETTINGS);
  const [stats, setStats] = useState({ completedTasks: 0, oldExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [expenseDeletionStep, setExpenseDeletionStep] = useState<'select' | 'confirm' | null>(null);
  const [selectedExpenseDays, setSelectedExpenseDays] = useState<number>(30);

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
      showNotification(
        'Auto-Delete Enabled',
        `Completed tasks will be automatically deleted after ${settings.taskRetentionHours} hours.`,
        'success'
      );
    }
  };

  const handleToggleAutoDeleteExpenses = async (value: boolean) => {
    const newSettings = { ...settings, autoDeleteOldExpenses: value };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    
    if (value) {
      showNotification(
        'Auto-Delete Enabled',
        `Expenses will be automatically deleted after ${settings.expenseRetentionDays} days.`,
        'success'
      );
    }
  };

  const handleChangeTaskRetention = () => {
    const options = [12, 24, 48, 168];
    const labels = ['12 hours', '24 hours', '48 hours', '1 week'];
    const currentIndex = options.indexOf(settings.taskRetentionHours);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextHours = options[nextIndex];
    const nextLabel = labels[nextIndex];
    
    showNotification(
      'Task Retention Changed',
      `Tasks will now be deleted after ${nextLabel}. Tap again to cycle options.`,
      'info'
    );
    
    updateTaskRetention(nextHours);
  };

  const updateTaskRetention = async (hours: number) => {
    const newSettings = { ...settings, taskRetentionHours: hours };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    showNotification('Updated', `Tasks will be deleted ${hours} hours after completion.`, 'success');
  };

  const handleChangeExpenseRetention = () => {
    const options = [7, 30, 60, 90];
    const labels = ['7 days', '30 days', '60 days', '90 days'];
    const currentIndex = options.indexOf(settings.expenseRetentionDays);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextDays = options[nextIndex];
    const nextLabel = labels[nextIndex];
    
    showNotification(
      'Expense Retention Changed',
      `Expenses will now be deleted after ${nextLabel}. Tap again to cycle options.`,
      'info'
    );
    
    updateExpenseRetention(nextDays);
  };

  const updateExpenseRetention = async (days: number) => {
    const newSettings = { ...settings, expenseRetentionDays: days };
    setSettings(newSettings);
    await CleanupService.saveCleanupSettings(newSettings);
    showNotification('Updated', `Expenses will be deleted after ${days} days.`, 'success');
  };

  const handleBulkDeleteCompletedTasks = async () => {
    if (stats.completedTasks === 0) {
      showNotification(
        'No Tasks to Delete',
        'There are no completed tasks to be deleted!',
        'info'
      );
      return;
    }

    showNotification('Confirm Delete', 'Tap delete again to permanently remove all completed tasks', 'warning');
    
    const deleteKey = 'delete_completed_tasks';
    const existingTimeout = deleteTimeouts.current[deleteKey];
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete deleteTimeouts.current[deleteKey];
      
      if (!currentUser) return;
      setCleaning(true);
      const count = await CleanupService.bulkDeleteAllCompletedTasks(currentUser.uid);
      setCleaning(false);
      await loadStats();
      showNotification('Success', `Deleted ${count} completed tasks.`, 'success');
    } else {
      deleteTimeouts.current[deleteKey] = setTimeout(() => {
        delete deleteTimeouts.current[deleteKey];
      }, 3000);
    }
  };

  const handleBulkDeleteOldExpenses = () => {
    if (expenseDeletionStep === null) {
      // Step 1: Show options
      setExpenseDeletionStep('select');
      showNotification(
        'Choose Deletion Period',
        'Tap the button again to cycle through: 30, 60, 90 days',
        'info',
        3000
      );
      setSelectedExpenseDays(30);
    } else if (expenseDeletionStep === 'select') {
      // Cycle through options
      const options = [30, 60, 90];
      const currentIndex = options.indexOf(selectedExpenseDays);
      const nextIndex = (currentIndex + 1) % options.length;
      const nextDays = options[nextIndex];
      
      setSelectedExpenseDays(nextDays);
      showNotification(
        `${nextDays} Days Selected`,
        `Will delete expenses older than ${nextDays} days. Tap again to cycle or confirm below.`,
        'info',
        2500
      );
    }
  };

  const confirmDeleteExpenses = async () => {
    if (expenseDeletionStep !== 'select') return;
    
    setExpenseDeletionStep('confirm');
    showNotification(
      'Confirm Deletion',
      `Tap confirm again to permanently remove expenses older than ${selectedExpenseDays} days`,
      'warning'
    );
    
    const deleteKey = `delete_expenses_${selectedExpenseDays}`;
    const existingTimeout = deleteTimeouts.current[deleteKey];
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete deleteTimeouts.current[deleteKey];
      
      if (!currentUser) return;
      setCleaning(true);
      const count = await CleanupService.bulkDeleteOldExpenses(currentUser.uid, selectedExpenseDays);
      setCleaning(false);
      await loadStats();
      showNotification('Success', `Deleted ${count} old expenses.`, 'success');
      
      // Reset state
      setExpenseDeletionStep(null);
      setSelectedExpenseDays(30);
    } else {
      deleteTimeouts.current[deleteKey] = setTimeout(() => {
        delete deleteTimeouts.current[deleteKey];
        setExpenseDeletionStep(null);
        setSelectedExpenseDays(30);
      }, 3000);
    }
  };

  const handleRunCleanupNow = async () => {
    if (!currentUser) return;
    
    setCleaning(true);
    const results = await CleanupService.runAutoCleanup(currentUser.uid);
    setCleaning(false);
    await loadStats();
    
    showNotification(
      'Cleanup Complete',
      `Deleted ${results.tasks} completed tasks and ${results.expenses} old expenses.`,
      'success'
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
            disabled={cleaning}
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
              <Text style={styles.bulkActionSubtext}>
                {expenseDeletionStep === 'select' 
                  ? `Selected: ${selectedExpenseDays} days - tap again to cycle`
                  : 'Choose retention period'
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Expense Deletion Confirmation */}
        {expenseDeletionStep === 'select' && (
          <View style={styles.confirmationSection}>
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationTitle}>
                Delete expenses older than {selectedExpenseDays} days?
              </Text>
              <Text style={styles.confirmationSubtext}>
                This action cannot be undone. All expense data older than {selectedExpenseDays} days will be permanently removed.
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setExpenseDeletionStep(null);
                    setSelectedExpenseDays(30);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmDeleteExpenses}
                  disabled={cleaning}
                >
                  <Text style={styles.confirmButtonText}>
                    Delete Expenses
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
  confirmationSection: {
    marginHorizontal: 20,
    marginTop: 15,
  },
  confirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f44336',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
