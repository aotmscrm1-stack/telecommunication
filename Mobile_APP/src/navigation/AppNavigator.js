import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddLeadScreen from '../screens/AddLeadScreen';
import AllLeadsScreen from '../screens/AllLeadsScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import WhatsappBlastScreen from '../screens/WhatsappBlastScreen';
import WhatsappDirectScreen from '../screens/WhatsappDirectScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import CallRecordingsScreen from '../screens/CallRecordingsScreen';
import MetaCallsScreen from '../screens/MetaCallsScreen';

// Components
import BottomNav from '../components/BottomNav';

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [authScreen, setAuthScreen] = useState('dashboard');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── UNATHENTICATED FLOW ───────────────────────────────────────────
  if (!isAuthenticated) {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={setCurrentScreen} />;
      case 'signup':
        return <SignupScreen onNavigate={setCurrentScreen} />;
      case 'landing':
      default:
        return <LandingScreen onNavigate={setCurrentScreen} />;
    }
  }

  // ── AUTHENTICATED CRM FLOW ─────────────────────────────────────────
  const renderAuthScreen = () => {
    switch (authScreen) {
      case 'add_lead':
        return <AddLeadScreen onNavigate={setAuthScreen} />;
      case 'meta_calls':
      case 'calling':
        return <MetaCallsScreen onNavigate={setAuthScreen} />;
      case 'all_leads':
      case 'leads':
        return <AllLeadsScreen onNavigate={setAuthScreen} />;
      case 'campaigns':
        return <CampaignsScreen onNavigate={setAuthScreen} />;
      case 'contacts':
        return <ContactsScreen onNavigate={setAuthScreen} />;
      case 'whatsapp_blast':
        return <WhatsappBlastScreen onNavigate={setAuthScreen} />;
      case 'whatsapp_direct':
      case 'whatsapp_hub':
        return <WhatsappDirectScreen onNavigate={setAuthScreen} />;
      case 'attendance':
        return <AttendanceScreen onNavigate={setAuthScreen} />;
      case 'recordings':
        return <CallRecordingsScreen onNavigate={setAuthScreen} />;
      case 'dashboard':
      default:
        return <DashboardScreen onNavigate={setAuthScreen} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        {renderAuthScreen()}
      </View>
      <BottomNav
        currentScreen={authScreen}
        onNavigate={setAuthScreen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
