import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LeadCard({ lead, onPress, onStatusChange }) {
  if (!lead) return null;

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'fresh': return colors.fresh;
      case 'contacted': return colors.contacted;
      case 'interested': return colors.interested;
      case 'won':
      case 'closed': return colors.won;
      case 'lost': return colors.lost;
      default: return colors.primary;
    }
  };

  const handleCall = () => {
    if (!lead.phone) {
      Alert.alert('No Phone', 'This lead does not have a valid phone number.');
      return;
    }
    const cleanPhone = lead.phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Call Failed', 'Unable to open phone dialer on this device.');
    });
  };

  const handleWhatsApp = () => {
    if (!lead.phone) {
      Alert.alert('No Phone', 'This lead does not have a valid phone number.');
      return;
    }
    let p = lead.phone.replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p; // default India prefix if 10 digits
    const msg = encodeURIComponent(`Hello ${lead.name || ''}, greetings from AOTMS! How may we assist you today?`);
    const url = `https://wa.me/${p}?text=${msg}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    });
  };

  const statusColor = getStatusColor(lead.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <View style={styles.leadInfo}>
          <Text style={styles.name} numberOfLines={1}>{lead.name || 'Unnamed Lead'}</Text>
          <Text style={styles.phone}>{lead.phone || 'No phone'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}50` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{lead.status || 'Fresh'}</Text>
        </View>
      </View>

      {lead.courseInterest?.name || lead.preferredCourses || lead.email ? (
        <View style={styles.detailRow}>
          <Ionicons name="school-outline" size={14} color={colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {lead.courseInterest?.name || lead.preferredCourses || lead.email || 'General Enquiry'}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recent'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCall} activeOpacity={0.7}>
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.waBtn]} onPress={handleWhatsApp} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leadInfo: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  phone: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callBtn: {
    backgroundColor: colors.primary,
  },
  waBtn: {
    backgroundColor: colors.whatsapp,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
