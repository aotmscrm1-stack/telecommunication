import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle, showBack = false, onBack, rightAction }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title || 'AOTMS CRM'}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction || (
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {(user?.name || 'User').charAt(0).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={logout}
              title="Logout"
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 14,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitleText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
