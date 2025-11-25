import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function AccessibilitySettingsScreen({ navigation }: any) {
  const { fontSize, setFontSize, isOnline } = useAccessibility();

  const handleFontSizeChange = async (size: 'small' | 'medium' | 'large') => {
    try {
      await setFontSize(size);
    } catch (error) {
      Alert.alert('Error', 'Failed to update font size');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accessibility</Text>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>📴</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Offline - Changes will sync when you reconnect
            </Text>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred text size for better readability
          </Text>

          <TouchableOpacity
            style={[
              styles.optionButton,
              fontSize === 'small' && styles.optionButtonActive,
            ]}
            onPress={() => handleFontSizeChange('small')}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, fontSize === 'small' && styles.optionLabelActive]}>
                Small
              </Text>
              <Text style={[styles.previewText, { fontSize: 14 }]}>
                Preview Text
              </Text>
            </View>
            {fontSize === 'small' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              fontSize === 'medium' && styles.optionButtonActive,
            ]}
            onPress={() => handleFontSizeChange('medium')}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, fontSize === 'medium' && styles.optionLabelActive]}>
                Medium (Default)
              </Text>
              <Text style={[styles.previewText, { fontSize: 16 }]}>
                Preview Text
              </Text>
            </View>
            {fontSize === 'medium' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              fontSize === 'large' && styles.optionButtonActive,
            ]}
            onPress={() => handleFontSizeChange('large')}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, fontSize === 'large' && styles.optionLabelActive]}>
                Large
              </Text>
              <Text style={[styles.previewText, { fontSize: 18 }]}>
                Preview Text
              </Text>
            </View>
            {fontSize === 'large' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Changes will apply immediately across the app
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#6C55BE',
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8B7BA8',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionButtonActive: {
    backgroundColor: '#F0EDF7',
    borderColor: '#CEE476',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 4,
  },
  optionLabelActive: {
    color: '#6C55BE',
  },
  previewText: {
    color: '#8B7BA8',
  },
  checkmark: {
    fontSize: 24,
    color: '#6C55BE',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6C55BE',
    textAlign: 'center',
  },
  offlineBadge: {
    position: 'absolute',
    right: 20,
    top: 55,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
