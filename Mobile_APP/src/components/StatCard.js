import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function StatCard({ title, value, icon, iconColor = colors.primary, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}1A`, borderColor: `${iconColor}40` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={styles.value}>{value ?? '0'}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flex: 1,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
