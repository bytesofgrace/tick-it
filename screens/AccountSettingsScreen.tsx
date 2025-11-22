import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AccountSettingsScreen({ navigation }: any) {
  const { currentUser, userName, updateUserName, changePassword, resetPassword, weeklyGoal, monthlyGoal, updateGoals } = useAuth();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState(weeklyGoal);
  const [tempMonthlyGoal, setTempMonthlyGoal] = useState(monthlyGoal);

  const handleOpenNameModal = () => {
    setTempName(userName);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    try {
      await updateUserName(tempName);
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const handleChangePassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await changePassword(newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated successfully!');
    } catch (error: any) {
      let errorMessage = 'Failed to update password';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please log out and log back in, then try changing your password again.';
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleForgotPassword = async () => {
    if (!currentUser?.email) {
      Alert.alert('Error', 'No email address found');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset email to ${currentUser.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await resetPassword(currentUser.email!);
              Alert.alert(
                'Email Sent',
                'Password reset email has been sent. Please check your email and follow the instructions.'
              );
            } catch (error: any) {
              Alert.alert('Error', 'Failed to send password reset email');
            }
          }
        }
      ]
    );
  };

  const handleGoalsSettings = () => {
    setTempWeeklyGoal(weeklyGoal);
    setTempMonthlyGoal(monthlyGoal);
    setShowGoalsModal(true);
  };

  const handleSaveGoals = async () => {
    try {
      await updateGoals(tempWeeklyGoal, tempMonthlyGoal);
      setShowGoalsModal(false);
      Alert.alert('Success', 'Goals updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update goals');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {/* Name Setting */}
        <TouchableOpacity style={styles.settingItem} onPress={handleOpenNameModal}>
          <View>
            <Text style={styles.settingLabel}>Name</Text>
            <Text style={styles.settingValue}>{userName || 'Add your name'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Email Setting */}
        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{currentUser?.email}</Text>
          </View>
        </View>

        {/* Goals Setting */}
        <TouchableOpacity style={styles.settingItem} onPress={handleGoalsSettings}>
          <View>
            <Text style={styles.settingLabel}>Weekly & Monthly Goals</Text>
            <Text style={styles.settingValue}>Weekly: {weeklyGoal}% | Monthly: {monthlyGoal}%</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Change Password */}
        <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
          <Text style={styles.settingLabel}>Change Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.settingItem} onPress={handleForgotPassword}>
          <Text style={styles.settingLabel}>Forgot Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Name Modal */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Enter Your Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Your name"
                  placeholderTextColor="#8B7BA8"
                  value={tempName}
                  onChangeText={setTempName}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowNameModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveName}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Change Password</Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="New password"
                  placeholderTextColor="#8B7BA8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoFocus
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#8B7BA8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                
                <Text style={styles.passwordHint}>
                  Password must be at least 6 characters long
                </Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPasswordModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSavePassword}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Goals Modal */}
      <Modal
        visible={showGoalsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Set Your Goals</Text>
                
                <View style={styles.goalContainer}>
                  <Text style={styles.goalLabel}>Weekly Goal: {tempWeeklyGoal}%</Text>
                  <View style={styles.goalControls}>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setTempWeeklyGoal(Math.max(0, tempWeeklyGoal - 5))}
                    >
                      <Text style={styles.goalButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.goalValue}>{tempWeeklyGoal}%</Text>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setTempWeeklyGoal(Math.min(100, tempWeeklyGoal + 5))}
                    >
                      <Text style={styles.goalButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.goalContainer}>
                  <Text style={styles.goalLabel}>Monthly Goal: {tempMonthlyGoal}%</Text>
                  <View style={styles.goalControls}>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setTempMonthlyGoal(Math.max(0, tempMonthlyGoal - 5))}
                    >
                      <Text style={styles.goalButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.goalValue}>{tempMonthlyGoal}%</Text>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setTempMonthlyGoal(Math.min(100, tempMonthlyGoal + 5))}
                    >
                      <Text style={styles.goalButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowGoalsModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveGoals}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#CEE476',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CEE476',
  },
  placeholder: {
    width: 60,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
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
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#8B7BA8',
  },
  chevron: {
    fontSize: 20,
    color: '#8B7BA8',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#CEE476',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#6C55BE',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#8B7BA8',
  },
  cancelButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#CEE476',
  },
  saveButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '700',
  },
  passwordHint: {
    fontSize: 12,
    color: '#8B7BA8',
    marginBottom: 20,
    textAlign: 'center',
  },
  goalContainer: {
    marginBottom: 20,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 12,
    textAlign: 'center',
  },
  goalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButton: {
    backgroundColor: '#CEE476',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  goalButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  goalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C55BE',
    minWidth: 80,
    textAlign: 'center',
  },
});
