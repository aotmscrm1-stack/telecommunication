import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LandingScreen({ onNavigate }) {
  const features = [
    {
      icon: 'people',
      color: colors.primary,
      title: 'Smart Lead Management',
      desc: 'Track and convert leads with instant status updates & history.',
    },
    {
      icon: 'call',
      color: colors.accent,
      title: 'One-Touch Calling & Logs',
      desc: 'Seamless dialer integration with live call recordings.',
    },
    {
      icon: 'logo-whatsapp',
      color: colors.whatsapp,
      title: 'WhatsApp Marketing & Blast',
      desc: 'Send personalized broadcasts and direct chat with clients.',
    },
    {
      icon: 'time',
      color: colors.secondary,
      title: 'Geo-Tagged Attendance',
      desc: 'Effortless punch-in, break tracking, and work-hour analytics.',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTag}>AOTMS ENTERPRISE SUITE</Text>
          <Text style={styles.heroTitle}>
            Telecommunication <Text style={{ color: colors.primary }}>CRM</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Next-generation mobile workspace for telecallers, managers, and executives. Connect seamlessly with your cloud database.
          </Text>

          {/* Backend Connection Badge */}
          <View style={styles.backendBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.backendText}>Connected: Render Cloud API</Text>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionHeader}>CORE CAPABILITIES</Text>
          {features.map((feat, idx) => (
            <View key={idx} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${feat.color}1A`, borderColor: `${feat.color}40` }]}>
                <Ionicons name={feat.icon} size={22} color={feat.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureDesc}>{feat.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onNavigate('login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Sign In to Workspace</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => onNavigate('signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          v1.0.0 • Secured with Enterprise JWT & SSL
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  logoImage: {
    width: 58,
    height: 58,
  },
  brandTag: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  backendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  backendText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  featureDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  actionContainer: {
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
});
