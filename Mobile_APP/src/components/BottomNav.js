import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mandated Enterprise Theme Colors
const THEME = {
  primaryBlue: '#174EA6', // Primary Blue
  navy: '#12305A',        // Deep Navy
  accentOrange: '#F28C28', // Accent Orange
  inactiveGrey: '#64748B', // Secondary Text
  bgWhite: '#FFFFFF',
  borderColor: '#E2E8F0',
  activePillBg: '#E8F0FE', // Soft corporate blue tint
};

export default function BottomNav({ currentScreen, onNavigate }) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'daily_activity', label: 'Activity', icon: 'clipboard-outline', activeIcon: 'clipboard' },
    { id: 'all_leads', label: 'Leads', icon: 'people-outline', activeIcon: 'people' },
    { id: 'recordings', label: 'Records', icon: 'mic-outline', activeIcon: 'mic' },
    { id: 'attendance', label: 'Attendance', icon: 'time-outline', activeIcon: 'time' },
    { id: 'meta_calls', label: 'Meta Leads', icon: 'megaphone-outline', activeIcon: 'megaphone' },
  ];

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.navRow}>
        {tabs.map((tab) => {
          const isActive =
            currentScreen === tab.id ||
            (tab.id === 'all_leads' && currentScreen === 'leads') ||
            (tab.id === 'meta_calls' && (currentScreen === 'calling' || currentScreen === 'meta_leads')) ||
            (tab.id === 'recordings' && currentScreen === 'records') ||
            (tab.id === 'daily_activity' && currentScreen === 'activity');

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => onNavigate(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={20}
                  color={isActive ? THEME.primaryBlue : THEME.inactiveGrey}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? THEME.primaryBlue : THEME.inactiveGrey,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#12305A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iconWrapperActive: {
    backgroundColor: '#E8F0FE',
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});