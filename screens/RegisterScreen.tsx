import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useNotification } from '../contexts/NotificationContext';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { fontScale } = useAccessibility();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      showNotification('Missing Information', 'Please fill in all fields', 'error');
      return;
    }

    if (!email.includes('@')) {
      showNotification('Invalid Email', 'Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 8) {
      showNotification('Password Too Short', 'Password must be at least 8 characters', 'error');
      return;
    }

    // Password strength validation with regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      showNotification(
        'Weak Password', 
        'Password must contain: lowercase, uppercase, and number', 
        'error'
      );
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Passwords Mismatch', 'Passwords do not match', 'error');
      return;
    }

    try {
      setLoading(true);
      await register(email, password);
      showNotification('Welcome!', 'Account created successfully. Time to tick-it!', 'success');
    } catch (error: any) {
      console.error(error);
      
      // Handle specific Firebase error codes
      let errorMessage = 'An error occurred during registration';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification('Registration Failed', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Tick-It and start organizing your tasks</Text>
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
              placeholder="Create a password"
              placeholderTextColor="#8B7BA8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />
            <Text style={styles.passwordHint}>
              Must contain: uppercase, lowercase & number{'\n'}(min. 8 characters)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#8B7BA8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
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
    backgroundColor: '#6C55BE', // Purple
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
    color: '#CEE476', // Green
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF', // White
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
    color: '#FFFFFF', // White
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF', // White
    borderWidth: 2,
    borderColor: '#CEE476', // Green
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#6C55BE', // Purple
  },
  passwordHint: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  registerButton: {
    backgroundColor: '#CEE476', // Green
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#8B7BA8', // Light purple when disabled
  },
  registerButtonText: {
    color: '#6C55BE', // Purple
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  loginText: {
    fontSize: 14,
    color: '#FFFFFF', // White
  },
  loginLink: {
    fontSize: 14,
    color: '#CEE476', // Green
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
