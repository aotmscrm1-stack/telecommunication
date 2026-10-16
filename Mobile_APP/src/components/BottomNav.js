import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function BottomNav({ currentScreen, onNavigate }) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: 'grid', activeIcon: 'grid' },
    { id: 'all_leads', label: 'Leads', icon: 'people-outline', activeIcon: 'people' },
    { id: 'campaigns', label: 'Campaigns', icon: 'megaphone-outline', activeIcon: 'megaphone' },
    { id: 'attendance', label: 'Attendance', icon: 'time-outline', activeIcon: 'time' },
    { id: 'recordings', label: 'Recordings', icon: 'mic-outline', activeIcon: 'mic' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.textMuted, fontWeight: isActive ? '700' : '500' },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
