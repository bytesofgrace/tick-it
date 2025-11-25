import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function SettingsScreen({ navigation }: any) {
  const { currentUser, logout, userName, weeklyGoal, monthlyGoal } = useAuth();
  const { showNotification } = useNotification();
  const { fontScale, isOnline } = useAccessibility();

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
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyRemindersEnabled, setDailyRemindersEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'once'>('none');
  const [todos, setTodos] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (!currentUser) return;

    // Load notification preferences
    const loadNotificationPreferences = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNotificationsEnabled(data.notificationsEnabled ?? false);
          setDailyRemindersEnabled(data.dailyRemindersEnabled ?? false);
          setFrequency(data.notificationFrequency ?? 'none');
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

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
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete Account', 'Account deletion feature coming soon!') },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleAboutApp = () => {
    Alert.alert('About Tick-It', 'Version 1.0.0\n\nYour productivity companion for tasks and expenses.');
  };

  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Need help? Contact us at support@tickit.com');
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Tick-it v.1</Text>
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
});