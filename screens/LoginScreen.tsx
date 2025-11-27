import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {   // def login_screen(navigation): \npass & from ... import ...
  const [email, setEmail] = useState('');           // email = ""
  const [password, setPassword] = useState('');     // def set_email(new_value):
  const [loading, setLoading] = useState(false);    //    global email
  const { login } = useAuth();
  const { fontScale } = useAccessibility();
  
  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent! Check your inbox and spam folder.');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'No account found with this email address');
      } else {
        Alert.alert('Error', error.message || 'Failed to send password reset email');
      }
    }
  }

  async function handleLogin() {
    if (!email && !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    } 
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const passwordPattern = /^(?=(?:.*\d){2,})(?=.*[A-Z]).+$/;
    if (!passwordPattern.test(password)) {
      Alert.alert('Error', 'Password must contain at least 2 numbers and 1 uppercase letter');
      return;
    }

    try {
      setLoading(true);              // loading = True
      await login(email, password);  // await login(email, password)
    } catch (error: any) {           // except Exception as error:
      console.error(error);          // print(error)
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {                      // print(f"Login Failed: {str(error) or 'An error occurred during login'}")
      setLoading(false);             // loading = False
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Tick-it!</Text>
          <Text style={styles.subtitle}>Log in to start ticking</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#8B7BA8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#8B7BA8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Logging In...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6C55BE', // Purple from icon
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#CEE476', // Green from icon
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF', // White background for inputs
    borderWidth: 2,
    borderColor: '#CEE476', // Green border
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#6C55BE', // Purple text for better contrast on white
  },
  loginButton: {
    backgroundColor: '#CEE476', // Green button
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#240046', // Dark purple when disabled
  },
  loginButtonText: {
    color: '#6C55BE', // Purple text on green button
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  signupText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  signupLink: {
    fontSize: 14,
    color: '#CEE476', // Green
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#CEE476', // Green
    textDecorationLine: 'underline',
  },
});