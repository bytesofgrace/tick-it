import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }: any) {
  const { currentUser, logout, userName, weeklyGoal, monthlyGoal } = useAuth();
  const { showNotification } = useNotification();
  const { fontScale, isOnline, isConnected, offlineMode, toggleOfflineMode } = useAccessibility();
  const deleteTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Dynamic styles based on font scale
  const dynamicStyles = {
    headerTitle: { fontSize: 28 * fontScale },
    profileIconText: { fontSize: 20 * fontScale },
    profileGreeting: { fontSize: 18 * fontScale },
    profileSubtext: { fontSize: 14 * fontScale },
    sectionTitle: { fontSize: 20 * fontScale },
    statTitle: { fontSize: 18 * fontScale },
    pieChartText: { fontSize: 16 * fontScale },
    statDetails: { fontSize: 16 * fontScale },
    settingLabel: { fontSize: 16 * fontScale },
    settingSubtext: { fontSize: 13 * fontScale },
    logoutButtonText: { fontSize: 16 * fontScale },
    chevron: { fontSize: 18 * fontScale },
    trendTitle: { fontSize: 18 * fontScale },
    trendLabel: { fontSize: 16 * fontScale },
    trendValue: { fontSize: 16 * fontScale },
    trendVs: { fontSize: 14 * fontScale },
    trendPercentage: { fontSize: 14 * fontScale },
    trendPeriod: { fontSize: 12 * fontScale },
    monthLabel: { fontSize: 12 * fontScale },
    monthValue: { fontSize: 16 * fontScale },
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyRemindersEnabled, setDailyRemindersEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'once'>('none');
  const [todos, setTodos] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);

  // Calculate expense analytics
  const getWeeklySpending = () => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const thisWeekExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt);
      return expenseDate >= currentWeekStart && expenseDate <= now;
    }).reduce((sum, expense) => sum + expense.totalAmount, 0);
    
    const lastWeekExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt);
      return expenseDate >= lastWeekStart && expenseDate < currentWeekStart;
    }).reduce((sum, expense) => sum + expense.totalAmount, 0);
    
    return { thisWeek: thisWeekExpenses, lastWeek: lastWeekExpenses };
  };

  const getMonthlyPattern = () => {
    const now = new Date();
    const months = [];
    
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.createdAt);
        return expenseDate >= monthDate && expenseDate < nextMonth;
      }).reduce((sum, expense) => sum + expense.totalAmount, 0);
      
      months.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        amount: monthExpenses
      });
    }
    
    return months;
  };

  const getSeasonalComparison = () => {
    const now = new Date();
    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt);
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, expense) => sum + expense.totalAmount, 0);
    
    const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    
    const lastYearSameMonth = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt);
      return expenseDate >= lastYearStart && expenseDate < lastYearEnd;
    }).reduce((sum, expense) => sum + expense.totalAmount, 0);
    
    return { thisYear: thisMonthExpenses, lastYear: lastYearSameMonth };
  };

  const weeklyTrend = getWeeklySpending();
  const monthlyPattern = getMonthlyPattern();
  const seasonalComparison = getSeasonalComparison();

  // Load notification preferences from AsyncStorage first (faster and works offline)
  const loadNotificationPreferences = async () => {
    if (!currentUser) return;

    try {
      // Check if there are pending changes
      const hasPending = await AsyncStorage.getItem('@notification_settings_pending');
      
      // Always load from AsyncStorage first (most up-to-date when offline)
      const cachedSettings = await AsyncStorage.getItem('@notification_settings');
      if (cachedSettings) {
        const settings = JSON.parse(cachedSettings);
        setFrequency(settings.frequency || 'none');
        setNotificationsEnabled(settings.notificationsEnabled ?? false);
        console.log('📱 [SettingsScreen] Loaded notification settings from cache');
      }

      // Only load from Firestore if no pending changes (to avoid showing old data)
      if (hasPending !== 'true') {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setNotificationsEnabled(data.notificationsEnabled ?? false);
            setDailyRemindersEnabled(data.dailyRemindersEnabled ?? false);
            setFrequency(data.notificationFrequency ?? 'none');
            console.log('☁️ [SettingsScreen] Updated from Firestore');
          }
        } catch (firestoreError) {
          console.log('📴 [SettingsScreen] Using cached notification settings (offline or error)');
        }
      } else {
        console.log('⏳ [SettingsScreen] Using local changes - will sync when online');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  // Reload notification settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadNotificationPreferences();
    }, [currentUser])
  );

  useEffect(() => {
    if (!currentUser) return;

    loadNotificationPreferences();

    // Load todos
    const todosQuery = query(collection(db, 'todos'), where('userId', '==', currentUser.uid));
    const unsubscribeTodos = onSnapshot(todosQuery, (snapshot) => {
      const todosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodos(todosData);
    });

    // Load expenses
    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesData);
    });

    return () => {
      unsubscribeTodos();
      unsubscribeExpenses();
    };
  }, [currentUser]);

  const handleAccountSettings = () => {
    navigation.navigate('AccountSettings');
  };

  const handleAccessibilitySettings = () => {
    navigation.navigate('AccessibilitySettings');
  };

  const handleDeleteAccount = () => {
    setDeleteAccountConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteAccountConfirm(false);
    showNotification('Delete Account', 'Account deletion feature coming soon!', 'info');
  };

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirm(false);
    try {
      await logout();
      showNotification('Goodbye!', 'You have been logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Logout Failed', 'There was an error logging you out. Please try again.', 'error');
    }
  };

  const handleAboutApp = () => {
    showNotification(
      'About Tick-It', 
      'Version 1.0.0 - Your Complete Productivity Companion with task management, expense tracking, smart notifications, offline support, and accessibility features!',
      'info'
    );
  };

  const handleHelpSupport = () => {
    showNotification('Help & Support', 'Need help? Contact us at support@tickit.com', 'info');
  };

  // Calculate task completion rates
  const completedTodos = todos.filter(todo => todo.completed).length;
  const completionRate = todos.length > 0 ? Math.round((completedTodos / todos.length) * 100) : 0;

  // Calculate weekly completion rate
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weeklyTodos = todos.filter(todo => {
    const todoDate = new Date(todo.createdAt?.seconds * 1000 || todo.createdAt);
    return todoDate >= weekStart;
  });
  const weeklyCompleted = weeklyTodos.filter(todo => todo.completed).length;
  const weeklyCompletionRate = weeklyTodos.length > 0 ? Math.round((weeklyCompleted / weeklyTodos.length) * 100) : 0;

  // Calculate monthly completion rate
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthlyTodos = todos.filter(todo => {
    const todoDate = new Date(todo.createdAt?.seconds * 1000 || todo.createdAt);
    return todoDate >= monthStart;
  });
  const monthlyCompleted = monthlyTodos.filter(todo => todo.completed).length;
  const monthlyCompletionRate = monthlyTodos.length > 0 ? Math.round((monthlyCompleted / monthlyTodos.length) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Settings</Text>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>📴 Offline</Text>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              You're offline. Settings will sync when you reconnect.
            </Text>
          </View>
        )}

        {/* Profile Section */}
        <TouchableOpacity style={styles.profileSection} onPress={handleAccountSettings}>
          <View style={styles.profileBubble}>
            <View style={styles.profileIcon}>
              <Text style={[styles.profileIconText, dynamicStyles.profileIconText]}>
                {userName ? userName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileGreeting, dynamicStyles.profileGreeting]}>
                Hello {userName || 'User'}!
              </Text>
              <Text style={[styles.profileSubtext, dynamicStyles.profileSubtext]}>Account Settings</Text>
            </View>
            <Text style={[styles.chevron, dynamicStyles.chevron]}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Connection Status Card */}
        <View style={styles.connectionCard}>
          <Text style={styles.connectionCardTitle}>Sync Status</Text>
          <View style={styles.connectionHeader}>
            <View style={styles.connectionStatusContainer}>
              <View style={[
                styles.connectionDot,
                !isConnected ? styles.connectionDotRed : (offlineMode ? styles.connectionDotOrange : styles.connectionDotGreen)
              ]} />
              <Text style={styles.connectionStatusText}>
                {!isConnected ? 'No Connection' : (offlineMode ? 'Offline Mode' : 'Online')}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.offlineToggle,
                !isConnected && styles.offlineToggleDisabled
              ]}
              onPress={() => {
                toggleOfflineMode();
                // Show notification when going back online
                if (offlineMode && isConnected) {
                  setTimeout(() => {
                    showNotification(
                      'Back Online',
                      'Your changes are now syncing',
                      'success',
                      2000
                    );
                  }, 300);
                }
              }}
              disabled={!isConnected}
            >
              <View style={[
                styles.toggleTrack,
                offlineMode && styles.toggleTrackActive,
                !offlineMode && styles.toggleTrackInactive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  offlineMode && styles.toggleThumbActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.connectionDescription}>
            {!isConnected 
              ? 'No internet connection detected'
              : (offlineMode 
                ? 'Working offline - changes will sync when you go back online'
                : 'Connected - all changes sync automatically'
              )
            }
          </Text>
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Statistics</Text>
          
          {/* Overall Task Completion Rate */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Overall Completion Rate</Text>
            <View style={styles.pieChartContainer}>
              <View style={styles.pieChartBackground}>
                {completionRate > 0 && (
                  <View 
                    style={[
                      styles.pieChartSegment,
                      {
                        transform: [{ rotate: '-90deg' }],
                      }
                    ]}
                  >
                    <View 
                      style={[
                        styles.pieChartFill,
                        {
                          transform: [{ rotate: `${(completionRate / 100) * 360}deg` }],
                          backgroundColor: '#6C55BE',
                        }
                      ]}
                    />
                  </View>
                )}
                <View style={styles.pieChartCenter}>
                  <Text style={styles.pieChartText}>{completionRate}%</Text>
                </View>
              </View>
            </View>
            <Text style={styles.statDetails}>
              <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{completedTodos}</Text> of <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{todos.length}</Text> tasks completed
            </Text>
          </View>

          {/* Weekly Goal Progress */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Weekly Goal Progress</Text>
            <View style={styles.pieChartContainer}>
              <View style={styles.pieChartBackground}>
                {weeklyCompletionRate > 0 && (
                  <View 
                    style={[
                      styles.pieChartSegment,
                      {
                        transform: [{ rotate: '-90deg' }],
                      }
                    ]}
                  >
                    <View 
                      style={[
                        styles.pieChartFill,
                        {
                          transform: [{ rotate: `${(weeklyCompletionRate / 100) * 360}deg` }],
                          backgroundColor: weeklyCompletionRate >= weeklyGoal ? '#6C55BE' : '#EF4444',
                        }
                      ]}
                    />
                  </View>
                )}
                <View style={styles.pieChartCenter}>
                  <Text style={styles.pieChartText}>{weeklyCompletionRate}%</Text>
                </View>
              </View>
            </View>
            <Text style={styles.statDetails}>
              Goal: <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{weeklyGoal}%</Text> | Current: <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{weeklyCompletionRate}%</Text>
            </Text>
          </View>

          {/* Monthly Goal Progress */}
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Monthly Goal Progress</Text>
            <View style={styles.pieChartContainer}>
              <View style={styles.pieChartBackground}>
                {monthlyCompletionRate > 0 && (
                  <View 
                    style={[
                      styles.pieChartSegment,
                      {
                        transform: [{ rotate: '-90deg' }],
                      }
                    ]}
                  >
                    <View 
                      style={[
                        styles.pieChartFill,
                        {
                          transform: [{ rotate: `${(monthlyCompletionRate / 100) * 360}deg` }],
                          backgroundColor: monthlyCompletionRate >= monthlyGoal ? '#6C55BE' : '#EF4444',
                        }
                      ]}
                    />
                  </View>
                )}
                <View style={styles.pieChartCenter}>
                  <Text style={styles.pieChartText}>{monthlyCompletionRate}%</Text>
                </View>
              </View>
            </View>
            <Text style={styles.statDetails}>
              Goal: <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{monthlyGoal}%</Text> | Current: <Text style={{ color: '#6C55BE', fontWeight: 'bold' }}>{monthlyCompletionRate}%</Text>
            </Text>
          </View>

          {/* Expense Analytics */}
          <View style={styles.expenseAnalyticsContainer}>
            <Text style={[styles.trendTitle, dynamicStyles.trendTitle]}>💰 Spending Analytics</Text>
            
            {/* Weekly Trend */}
            <View style={styles.trendItem}>
              <Text style={[styles.trendLabel, dynamicStyles.trendLabel]}>This Week vs Last Week</Text>
              <View style={styles.trendComparison}>
                <Text style={[styles.trendValue, dynamicStyles.trendValue]}>${Math.round(weeklyTrend.thisWeek)}</Text>
                <Text style={[styles.trendVs, dynamicStyles.trendVs]}>vs</Text>
                <Text style={[styles.trendValue, dynamicStyles.trendValue]}>${Math.round(weeklyTrend.lastWeek)}</Text>
                {weeklyTrend.thisWeek !== 0 && weeklyTrend.lastWeek !== 0 && (
                  <Text style={[
                    styles.trendPercentage, 
                    dynamicStyles.trendPercentage,
                    weeklyTrend.thisWeek > weeklyTrend.lastWeek ? styles.trendUp : styles.trendDown
                  ]}>
                    {weeklyTrend.lastWeek > 0 ? 
                      `${Math.round(((weeklyTrend.thisWeek - weeklyTrend.lastWeek) / weeklyTrend.lastWeek) * 100)}%` : 
                      'New spending'}
                  </Text>
                )}
              </View>
            </View>

            {/* Monthly Pattern */}
            <View style={styles.trendItem}>
              <Text style={[styles.trendLabel, dynamicStyles.trendLabel]}>3-Month Pattern</Text>
              <View style={styles.monthlyPattern}>
                {monthlyPattern.map((month, index) => (
                  <View key={index} style={styles.monthItem}>
                    <Text style={[styles.monthLabel, dynamicStyles.monthLabel]}>{month.month}</Text>
                    <Text style={[styles.monthValue, dynamicStyles.monthValue]}>${Math.round(month.amount)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Seasonal Comparison */}
            {seasonalComparison.lastYear > 0 && (
              <View style={styles.trendItem}>
                <Text style={[styles.trendLabel, dynamicStyles.trendLabel]}>Year-over-Year</Text>
                <View style={styles.trendComparison}>
                  <Text style={[styles.trendValue, dynamicStyles.trendValue]}>${Math.round(seasonalComparison.thisYear)}</Text>
                  <Text style={[styles.trendVs, dynamicStyles.trendVs]}>vs</Text>
                  <Text style={[styles.trendValue, dynamicStyles.trendValue]}>${Math.round(seasonalComparison.lastYear)}</Text>
                  <Text style={[styles.trendPeriod, dynamicStyles.trendPeriod]}>(same month last year)</Text>
                  {seasonalComparison.thisYear !== 0 && seasonalComparison.lastYear !== 0 && (
                    <Text style={[
                      styles.trendPercentage, 
                      dynamicStyles.trendPercentage,
                      seasonalComparison.thisYear > seasonalComparison.lastYear ? styles.trendUp : styles.trendDown
                    ]}>
                      {Math.round(((seasonalComparison.thisYear - seasonalComparison.lastYear) / seasonalComparison.lastYear) * 100)}%
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {/* Demo Notification Button */}
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: '#9b59b6' }]} 
            onPress={() => {
              showNotification(
                '🎉 Demo Notification',
                'This is how in-app notifications work in Tick-It!',
                'success'
              );
            }}
          >
            <View>
              <Text style={[styles.settingLabel, { color: '#fff' }]}>Test Notification</Text>
              <Text style={[styles.settingSubtext, { color: '#fff', opacity: 0.9 }]}>
                Tap to see a demo notification
              </Text>
            </View>
            <Text style={[styles.chevron, { color: '#fff' }]}>🔔</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <View>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingSubtext}>
                {frequency === 'none' && 'Off'}
                {frequency === 'daily' && 'Daily reminders'}
                {frequency === 'weekly' && 'Weekly reminders'}
                {frequency === 'once' && 'One-time reminder'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => navigation.navigate('DataManagement')}
          >
            <View>
              <Text style={styles.settingLabel}>Data Management</Text>
              <Text style={styles.settingSubtext}>Auto-cleanup & bulk actions</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleAccessibilitySettings}>
            <Text style={styles.settingLabel}>Font Size</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleAboutApp}>
            <Text style={styles.settingLabel}>About App</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleHelpSupport}>
            <Text style={styles.settingLabel}>Help & Support</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Tick-it v.1</Text>
      </ScrollView>
      
      {/* Logout confirmation popup */}
      {logoutConfirm && (
        <View style={styles.deleteOverlay}>
          <View style={styles.deletePopup}>
            <Text style={styles.deleteTitle}>Sign Out</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setLogoutConfirm(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmDeleteText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Delete account confirmation popup */}
      {deleteAccountConfirm && (
        <View style={styles.deleteOverlay}>
          <View style={styles.deletePopup}>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setDeleteAccountConfirm(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.confirmDeleteText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CEE476',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginBottom: 30,
  },
  profileBubble: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#CEE476',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  profileInfo: {
    flex: 1,
  },
  profileGreeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 4,
  },
  profileSubtext: {
    fontSize: 14,
    color: '#8B7BA8',
  },
  chevron: {
    fontSize: 20,
    color: '#8B7BA8',
    fontWeight: 'bold',
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
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 12,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pieChartBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CEE476',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartSegment: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
  },
  pieChartFill: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: '50%',
    height: '50%',
    transformOrigin: 'left bottom',
    borderTopRightRadius: 40,
  },
  pieChartCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pieChartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  statDetails: {
    fontSize: 12,
    color: '#6C55BE',
  },
  settingItem: {
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
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
  },
  settingSubtext: {
    fontSize: 13,
    color: '#8B7BA8',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#CEE476',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#CEE476',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#8B7BA8',
    marginBottom: 40,
  },
  offlineBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  offlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  connectionCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  connectionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connectionDotGreen: {
    backgroundColor: '#4CAF50',
  },
  connectionDotOrange: {
    backgroundColor: '#FF9800',
  },
  connectionDotRed: {
    backgroundColor: '#F44336',
  },
  connectionStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
  },
  connectionDescription: {
    fontSize: 13,
    color: '#8B7BA8',
    marginTop: 4,
  },
  offlineToggle: {
    padding: 4,
  },
  offlineToggleDisabled: {
    opacity: 0.5,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackInactive: {
    backgroundColor: '#4CAF50',
  },
  toggleTrackActive: {
    backgroundColor: '#FF9800',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  // Expense analytics styles
  expenseAnalyticsContainer: {
    marginTop: 20,
  },
  trendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 15,
    textAlign: 'center',
  },
  trendItem: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trendLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 10,
    textAlign: 'center',
  },
  trendComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CEE476',
    marginHorizontal: 5,
  },
  trendVs: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  trendPercentage: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendUp: {
    color: '#ff6b6b',
    backgroundColor: '#ffe6e6',
  },
  trendDown: {
    color: '#28a745',
    backgroundColor: '#e6f4ea',
  },
  trendPeriod: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 5,
  },
  monthlyPattern: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthItem: {
    alignItems: 'center',
    flex: 1,
  },
  monthLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
  monthValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CEE476',
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  deletePopup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 30,
    minWidth: 280,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9b59b6',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelDeleteText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});