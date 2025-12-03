import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useNotification } from '../contexts/NotificationContext';

export default function AccountSettingsScreen({ navigation }: any) {
  const { currentUser, userName, updateUserName, changePassword, resetPassword, deleteAccount, weeklyGoal, monthlyGoal, updateGoals } = useAuth();
  const { fontScale } = useAccessibility();
  const { showNotification } = useNotification();
  const deleteTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState(weeklyGoal);
  const [tempMonthlyGoal, setTempMonthlyGoal] = useState(monthlyGoal);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleOpenNameModal = () => {
    setTempName(userName);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    try {
      await updateUserName(tempName);
      setShowNameModal(false);
      showNotification('Success', 'Name updated successfully!', 'success');
    } catch (error) {
      showNotification('Error', 'Failed to update name', 'error');
    }
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      showNotification('Validation Error', 'Please enter your current password', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showNotification('Validation Error', 'Password must be at least 8 characters long', 'error');
      return;
    }

    // Password strength validation with regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      showNotification(
        'Weak Password', 
        'Password must contain: lowercase letter, uppercase letter, and number', 
        'error'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Validation Error', 'Passwords do not match', 'error');
      return;
    }

    try {
      await changePassword(newPassword, currentPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Success', 'Password updated successfully!', 'success');
    } catch (error: any) {
      let errorMessage = 'Failed to update password';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please log out and log back in, then try changing your password again.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      }
      showNotification('Password Change Failed', errorMessage, 'error');
    }
  };

  const handleForgotPassword = async () => {
    if (!currentUser?.email) {
      showNotification('Error', 'No email address found', 'error');
      return;
    }

    showNotification('Reset Password', 'Tap again to send password reset email', 'warning');
    
    const resetKey = 'password_reset';
    const existingTimeout = deleteTimeouts.current[resetKey];
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete deleteTimeouts.current[resetKey];
      
      try {
        await resetPassword(currentUser.email!);
        showNotification(
          'Email Sent',
          'Password reset email sent. Check your email for instructions.',
          'success'
        );
      } catch (error: any) {
        showNotification('Error', 'Failed to send password reset email', 'error');
      }
    } else {
      deleteTimeouts.current[resetKey] = setTimeout(() => {
        delete deleteTimeouts.current[resetKey];
      }, 3000);
    }
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
      showNotification('Success', 'Goals updated successfully!', 'success');
    } catch (error) {
      showNotification('Error', 'Failed to update goals', 'error');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deleteAccountPassword.trim()) {
      showNotification('Password Required', 'Please enter your current password to delete your account', 'error');
      return;
    }

    setDeletingAccount(true);
    
    try {
      await deleteAccount(deleteAccountPassword);
      showNotification('Account Deleted', 'Your account has been permanently deleted', 'success');
      setDeleteAccountConfirm(false);
      setDeleteAccountPassword('');
      // Navigation will be handled automatically by AuthContext state change
    } catch (error: any) {
      let errorMessage = 'Failed to delete account';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please log out and log back in, then try deleting your account again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      showNotification('Delete Failed', errorMessage, 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
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

        {/* Delete Account Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
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
                  placeholder="Current password"
                  placeholderTextColor="#8B7BA8"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoFocus
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="New password"
                  placeholderTextColor="#8B7BA8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
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
                  Must contain: uppercase, lowercase & number{'\n'}(min. 8 characters)
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
      
      {/* Delete account confirmation popup */}
      {deleteAccountConfirm && (
        <View style={styles.deleteOverlay}>
          <View style={styles.deletePopup}>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </Text>
            <Text style={styles.deleteSubMessage}>
              Enter your current password to confirm:
            </Text>
            <TextInput
              style={styles.deletePasswordInput}
              value={deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
              placeholder="Current password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => {
                  setDeleteAccountConfirm(false);
                  setDeleteAccountPassword('');
                }}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, deletingAccount && styles.disabledButton]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                <Text style={styles.confirmDeleteText}>
                  {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
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
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  deleteSubMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  deletePasswordInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
