import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { contactsApi } from '../api/contactsApi';
import Header from '../components/Header';

export default function ContactsScreen({ onNavigate }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Contact Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await contactsApi.getContacts();
      const list = Array.isArray(data) ? data : data.contacts || [];
      setContacts(list);
      setFilteredContacts(list);
    } catch (err) {
      console.warn('[Contacts] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFilteredContacts(contacts);
    } else {
      const q = text.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
        )
      );
    }
  };

  const handleCall = (phoneNum) => {
    if (!phoneNum) return;
    Linking.openURL(`tel:${phoneNum.replace(/[^0-9+]/g, '')}`);
  };

  const handleWhatsApp = (phoneNum, contactName) => {
    if (!phoneNum) return;
    let p = phoneNum.replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p;
    const msg = encodeURIComponent(`Hello ${contactName || ''}, greetings from AOTMS Telecommunication!`);
    Linking.openURL(`https://wa.me/${p}?text=${msg}`);
  };

  const handleCreateContact = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and Phone number are required.');
      return;
    }

    try {
      setAdding(true);
      await contactsApi.createContact({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase() || undefined,
      });
      setModalVisible(false);
      setName('');
      setPhone('');
      setEmail('');
      fetchContacts();
      Alert.alert('Success', 'Contact added successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Contacts"
        subtitle={`${contacts.length} Phonebook entries`}
        showBack
        onBack={() => onNavigate('dashboard')}
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.name || 'C').charAt(0).toUpperCase()}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone || 'No phone'}</Text>
                {item.email ? <Text style={styles.contactEmail} numberOfLines={1}>{item.email}</Text> : null}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => handleCall(item.phone)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.waBtn]}
                  onPress={() => handleWhatsApp(item.phone, item.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No contacts found</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to save a new contact in your phonebook</Text>
            </View>
          }
        />
      )}

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>PHONE NUMBER *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, adding && styles.disabledBtn]}
              onPress={handleCreateContact}
              disabled={adding}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Save Contact</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
  },
  contactName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  contactPhone: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  contactEmail: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: colors.primary,
  },
  waBtn: {
    backgroundColor: colors.whatsapp,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  formGroup: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
