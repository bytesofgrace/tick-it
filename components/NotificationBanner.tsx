import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useNotification } from '../contexts/NotificationContext';

const { width } = Dimensions.get('window');

export default function NotificationBanner() {
  const { currentNotification, hideNotification } = useNotification();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentNotification) {
      // Slide down and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide up and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentNotification, slideAnim, opacityAnim]);

  const getBackgroundColor = () => {
    if (!currentNotification) return '#9b59b6';
    switch (currentNotification.type) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9b59b6'; // Purple for info
    }
  };

  const getIcon = () => {
    if (!currentNotification) return '🔔';
    switch (currentNotification.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return '🔔';
    }
  };

  if (!currentNotification) {
    return null;
  }

  // For error notifications, show as popup modal for better UX
  if (currentNotification && currentNotification.type === 'error') {
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
              </View>
              <Text style={styles.popupTitle}>{currentNotification.title}</Text>
            </View>
            <Text style={styles.popupMessage}>{currentNotification.message}</Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={hideNotification}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // For other notification types, show as banner
  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: getBackgroundColor(),
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={hideNotification}
          activeOpacity={0.9}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getIcon()}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentNotification?.title}</Text>
            <Text style={styles.message}>{currentNotification?.message}</Text>
          </View>
          <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    minWidth: 300,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  popupHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIconContainer: {
    backgroundColor: '#f8f4ff',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  errorIcon: {
    fontSize: 36,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9b59b6',
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 25,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999999,
    elevation: 999999999,
  },
  banner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 999999999,
    zIndex: 999999999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    color: '#fff',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.95,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});
