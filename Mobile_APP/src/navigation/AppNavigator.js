import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Keyboard, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
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
  const { isAuthenticated, isLoading } = useAuth();
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
});

