import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Keyboard, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, isAllowedManagerRole } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DailyActivityScreen from '../screens/DailyActivityScreen';
import AllLeadsScreen from '../screens/AllLeadsScreen';
import AddLeadScreen from '../screens/AddLeadScreen';
import CallRecordingsScreen from '../screens/CallRecordingsScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import MetaCallsScreen from '../screens/MetaCallsScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import WhatsappBlastScreen from '../screens/WhatsappBlastScreen';
import WhatsappDirectScreen from '../screens/WhatsappDirectScreen';

// Components
import BottomNav from '../components/BottomNav';

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  // Default directly to Meta Leads or Daily Activity (Dashboard removed as per specification)
  const [authScreen, setAuthScreen] = useState('meta_calls');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    // ── NOTIFICATION TAP NAVIGATION HANDLER ──
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (!data) return;

      const type = data.type || '';
      console.log('[AppNavigator] Notification tapped, payload:', data);

      if (type.includes('meta')) {
        setAuthScreen('meta_calls');
      } else if (type.includes('lead')) {
        setAuthScreen('all_leads');
      } else if (type.includes('task') || type.includes('followup')) {
        setAuthScreen('daily_activity');
      } else if (type.includes('attendance')) {
        setAuthScreen('attendance');
      } else if (type.includes('recording') || type.includes('call')) {
        setAuthScreen('call_recordings');
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      notifSub.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#174EA6" />
      </View>
    );
  }

  // ── UNAUTHENTICATED FLOW (DIRECT LOGIN ONLY) ──────────────────────
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // ── ROLE RESTRICTION: EXCLUSIVELY FOR MANAGERS ────────────────────
  if (user && !isAllowedManagerRole(user)) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconBox}>
          <Ionicons name="shield-outline" size={54} color="#DC2626" />
        </View>
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedMsg}>
          This Mobile Application is exclusively for Managers. Please sign in with a Manager account.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── AUTHENTICATED CRM FLOW (5 MAIN MODULES + AUXILIARY) ────────────
  const renderAuthScreen = () => {
    switch (authScreen) {
      case 'daily_activity':
      case 'activity':
        return <DailyActivityScreen onNavigate={setAuthScreen} />;
      case 'all_leads':
      case 'leads':
        return <AllLeadsScreen onNavigate={setAuthScreen} />;
      case 'add_lead':
        return <AddLeadScreen onNavigate={setAuthScreen} />;
      case 'recordings':
      case 'records':
        return <CallRecordingsScreen onNavigate={setAuthScreen} />;
      case 'attendance':
        return <AttendanceScreen onNavigate={setAuthScreen} />;
      case 'meta_calls':
      case 'calling':
      case 'meta_leads':
        return <MetaCallsScreen onNavigate={setAuthScreen} />;
      case 'campaigns':
        return <CampaignsScreen onNavigate={setAuthScreen} />;
      case 'contacts':
        return <ContactsScreen onNavigate={setAuthScreen} />;
      case 'whatsapp_blast':
        return <WhatsappBlastScreen onNavigate={setAuthScreen} />;
      case 'whatsapp_direct':
      case 'whatsapp_hub':
        return <WhatsappDirectScreen onNavigate={setAuthScreen} />;
      default:
        return <MetaCallsScreen onNavigate={setAuthScreen} />;
    }
  };

  const isFullScreenForm = authScreen === 'add_lead';
  const shouldShowBottomNav = !isFullScreenForm && !keyboardVisible;

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        {renderAuthScreen()}
      </View>
      {shouldShowBottomNav ? (
        <BottomNav
          currentScreen={authScreen}
          onNavigate={setAuthScreen}
        />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  screenArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  restrictedIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  restrictedMsg: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  logoutBtn: {
    backgroundColor: '#174EA6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

