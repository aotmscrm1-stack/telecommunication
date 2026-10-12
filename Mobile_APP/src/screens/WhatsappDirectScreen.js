import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { contactsApi } from '../api/contactsApi';
import Header from '../components/Header';

export default function WhatsappDirectScreen({ onNavigate }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sendingCloud, setSendingCloud] = useState(false);

  const templates = [
    {
      title: 'Greetings & Introduction',
      text: 'Hello! Greetings from AOTMS Telecommunication CRM. Thank you for connecting with us.',
    },
    {
      title: 'Course Consultation',
      text: 'Hi! Our education counselor is ready to discuss the curriculum and placement opportunities. Would you prefer a call now?',
    },
    {
      title: 'Fee Structure & Discount',
      text: 'Hello! As discussed, please find our special discounted pricing available for registrations completed this week.',
    },
    {
      title: 'Office Location & Timing',
      text: 'Greetings! Our office is open Mon-Sat 9:30 AM to 6:30 PM. Feel free to visit our campus or request an online counseling session.',
    },
  ];

  const handleLaunchWhatsApp = () => {
    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter a valid mobile number.');
      return;
    }

    let p = phone.replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p;

    const encoded = encodeURIComponent(message.trim() || 'Hello from AOTMS CRM!');
    const url = `https://wa.me/${p}?text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('App Not Found', 'Could not launch WhatsApp. Please check if WhatsApp is installed.');
    });
  };

  const handleSendViaCloud = async () => {
    if (!phone.trim() || !message.trim()) {
      Alert.alert('Required', 'Phone and message are required for Cloud API delivery.');
      return;
    }

    try {
      setSendingCloud(true);
      await contactsApi.sendSingleWhatsapp({
        phone: phone.trim(),
        message: message.trim(),
      });
      Alert.alert('Success', 'Message delivered via CRM WhatsApp Gateway!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message via cloud gateway');
    } finally {
      setSendingCloud(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="WhatsApp Direct"
        subtitle="One-on-one instant messenger"
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>RECIPIENT PHONE NUMBER *</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.prefixBadge}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Message Text */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MESSAGE</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type message to client..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.openAppBtn}
              onPress={handleLaunchWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.openAppBtnText}>Open Chat in WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cloudBtn, sendingCloud && styles.disabledBtn]}
              onPress={handleSendViaCloud}
              disabled={sendingCloud}
              activeOpacity={0.8}
            >
              {sendingCloud ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.cloudBtnText}>Send via CRM Cloud Gateway</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Message Templates */}
        <View style={styles.templatesSection}>
          <Text style={styles.sectionTitle}>QUICK REPLY TEMPLATES</Text>
          {templates.map((tpl, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.templateCard}
              onPress={() => setMessage(tpl.text)}
              activeOpacity={0.7}
            >
              <View style={styles.templateHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.whatsapp} />
                <Text style={styles.templateTitle}>{tpl.title}</Text>
              </View>
              <Text style={styles.templateSnippet} numberOfLines={2}>{tpl.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixBadge: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  prefixText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  actionsColumn: {
    gap: 10,
    marginTop: 6,
  },
  openAppBtn: {
    backgroundColor: colors.whatsapp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  openAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cloudBtn: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  cloudBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  templatesSection: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  templateTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  templateSnippet: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
