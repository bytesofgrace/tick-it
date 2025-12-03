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

  return (
    <Modal
      visible={!!currentNotification}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.container,
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999999,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 999999,
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
