import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function SettingsScreen({ navigation }: any) {
  const { currentUser, logout, userName, weeklyGoal, monthlyGoal } = useAuth();
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
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <TouchableOpacity style={styles.profileSection} onPress={handleAccountSettings}>
          <View style={styles.profileBubble}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>
                {userName ? userName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileGreeting}>
                Hello {userName || 'User'}!
              </Text>
              <Text style={styles.profileSubtext}>Account Settings</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
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

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>

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
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#8B7BA8',
    marginBottom: 40,
  },
});