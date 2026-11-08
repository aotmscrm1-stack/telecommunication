import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Keyboard, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, isAllowedManagerRole } from '../context/AuthContext';
import { colors } from '../theme/colors';
import {
  startZeroTouchCallListener,
  executeZeroTouchCall,
  formatDialablePhone,
} from '../services/autoCallService';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DailyActivityScreen from '../screens/DailyActivityScreen';
import AllLeadsScreen from '../screens/AllLeadsScreen';
import AddLeadScreen from '../screens/AddLeadScreen';
import CallRecordingsScreen from '../screens/CallRecordingsScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import MetaCallsScreen from '../screens/MetaCallsScreen';
import TodoListScreen from '../screens/TodoListScreen';
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
  const [autoCallBanner, setAutoCallBanner] = useState(null);
  const bannerTimerRef = useRef(null);

  const handleAutoCallTriggered = useCallback((callData) => {
    if (!callData) return;
    setAutoCallBanner({
      leadName: callData.leadName || 'Lead',
      leadPhone: callData.leadPhone || '',
      leadId: callData.leadId || '',
      isMetaLead: Boolean(callData.isMetaLead),
    });
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setAutoCallBanner(null);
    }, 8000);
  }, []);

  // ── 100% AUTOMATIC ZERO-TOUCH CALL LISTENER (WHEN MOBILE APP IS OPEN) ──
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    const stopListener = startZeroTouchCallListener({
      user,
      onCallTriggered: handleAutoCallTriggered,
    });
    return () => {
      stopListener();
    };
  }, [isAuthenticated, user?._id, handleAutoCallTriggered]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    // ── FOREGROUND PUSH NOTIFICATION AUTO-CALL HANDLER (ZERO TOUCH) ──
    const fgNotifSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data;
      if (!data || data.localGenerated === 'true') return;
      const type = String(data.type || '');
      if (type === 'call_initiated' || data.autoDial === 'true') {
        executeZeroTouchCall(
          {
            callId: data.callId,
            leadId: data.leadId || data.entityId,
            leadName: data.leadName,
            leadPhone: data.leadPhone,
            isMetaLead: data.isMetaLead === 'true',
          },
          { fromNotification: true, onCallTriggered: handleAutoCallTriggered }
        );
      }
    });

    // ── NOTIFICATION TAP NAVIGATION & AUTO-DIAL HANDLER ──
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (!data) return;

      const type = String(data.type || '');
      console.log('[AppNavigator] Notification tapped, payload:', data);

      if (type === 'call_initiated' || data.autoDial === 'true') {
        const dialNum = formatDialablePhone(data.leadPhone);
        if (dialNum) {
          Linking.openURL(`tel:${dialNum}`).catch(() => {});
        }
        setAuthScreen(data.isMetaLead === 'true' ? 'meta_calls' : 'all_leads');
        return;
      }

      if (type.includes('meta')) {
        setAuthScreen('meta_calls');
      } else if (type.includes('lead')) {
        setAuthScreen('all_leads');
      } else if (type.includes('task') || type.includes('todo') || type.includes('followup')) {
        setAuthScreen('todos');
      } else if (type.includes('attendance')) {
        setAuthScreen('attendance');
      } else if (type.includes('recording') || type.includes('call')) {
        setAuthScreen('call_recordings');
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      fgNotifSub.remove();
      notifSub.remove();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [handleAutoCallTriggered]);

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
      case 'todos':
      case 'todo_list':
      case 'tasks':
        return <TodoListScreen onNavigate={setAuthScreen} />;
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
      {autoCallBanner ? (
        <View style={styles.autoCallBanner}>
          <View style={styles.autoCallIconWrap}>
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoCallTitle} numberOfLines={1}>
              Auto-Calling: {autoCallBanner.leadName}
            </Text>
            <Text style={styles.autoCallSub} numberOfLines={1}>
              {autoCallBanner.leadPhone} • Triggered from Website
            </Text>
          </View>
          <TouchableOpacity
            style={styles.autoCallDialBtn}
            onPress={() => {
              const dial = formatDialablePhone(autoCallBanner.leadPhone);
              if (dial) Linking.openURL(`tel:${dial}`).catch(() => {});
            }}
          >
            <Text style={styles.autoCallDialBtnText}>Dial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAutoCallBanner(null)}
            style={styles.autoCallCloseBtn}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}
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
  autoCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    marginHorizontal: 12,
    marginTop: Platform.OS === 'ios' ? 48 : 36,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 10,
    elevation: 6,
  },
  autoCallIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCallTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  autoCallSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 1,
  },
  autoCallDialBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  autoCallDialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  autoCallCloseBtn: {
    padding: 4,
  },
});

