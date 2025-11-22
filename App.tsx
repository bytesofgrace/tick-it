import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import TodoScreen from './screens/TodoScreen';
import ExpenseScreen from './screens/ExpenseScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#6C55BE',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#CEE476',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="TodoTab"
        component={TodoScreen}
        options={{
          tabBarLabel: 'To Do List',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>✓</Text>,
        }}
      />
      <Tab.Screen
        name="ExpenseTab"
        component={ExpenseScreen}
        options={{
          tabBarLabel: 'Expense',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6C55BE' }}>
        <ActivityIndicator size="large" color="#CEE476" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {currentUser ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
