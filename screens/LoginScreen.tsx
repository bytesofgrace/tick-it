import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useNotification } from '../contexts/NotificationContext';
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
  const { showNotification } = useNotification();
  
  async function handleForgotPassword() {
    if (!email) {
      showNotification('Email Required', 'Please enter your email address first', 'error');
      return;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showNotification('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showNotification('Email Sent', 'Password reset email sent! Check your inbox and spam folder.', 'success');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        showNotification('Account Not Found', 'No account found with this email address', 'error');
      } else {
        showNotification('Reset Failed', error.message || 'Failed to send password reset email', 'error');
      }
    }
  }

  async function handleLogin() {
    console.log('🔑 Login attempt started with email:', email);
    
    if (!email && !password) {
      showNotification('Login Required', 'Please enter email and password', 'error');
      return;
    } 
    if (!email) {
      showNotification('Email Required', 'Please enter your email', 'error');
      return;
    }
    
    // Validate email format FIRST
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showNotification('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }
    
    if (!password) {
      showNotification('Password Required', 'Please enter your password', 'error');
      return;
    }

    console.log('🔑 Validation passed, attempting Firebase login...');
    try {
      setLoading(true);
      await login(email, password);
      console.log('🔑 Login successful!');
      showNotification('Welcome!', 'Login successful!', 'success');
    } catch (error: any) {
      console.error('🔑 Login error:', error);
      
      let title = 'Login Failed';
      let errorMessage = 'An error occurred during login';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        title = 'Wrong Password';
        errorMessage = 'The password you entered is incorrect. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        title = 'Account Not Found';
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/too-many-requests') {
        title = 'Too Many Attempts';
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-email') {
        title = 'Invalid Email';
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('🔑 Showing notification:', errorMessage);
      showNotification(title, errorMessage, 'error');
    } finally {
      console.log('🔑 Login attempt finished, setting loading to false');
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
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
              returnKeyType="next"
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
              returnKeyType="done"
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
    </View>
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