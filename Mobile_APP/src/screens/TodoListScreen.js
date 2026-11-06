import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { todosApi } from '../api/todosApi';
import Header from '../components/Header';

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', bg: '#FEE2E2', text: '#DC2626', border: '#FECDD3', icon: 'flame' },
  high: { label: 'High', bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA', icon: 'alert-circle' },
  medium: { label: 'Medium', bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE', icon: 'information-circle' },
  low: { label: 'Low', bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: 'remove' },
};

// Helper: Format today as YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TodoListScreen({ onNavigate }) {
  const { user } = useAuth();

  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'today', 'completed'

  // Quick Add State (at top of screen)
  const [quickText, setQuickText] = useState('1. ');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [quickAdding, setQuickAdding] = useState(false);

  // Full Add Task Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('1. ');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(getTodayStr());
  const [dueTime, setDueTime] = useState('18:30'); // Default to 06:30 PM Logout Time
  const [assignedToId, setAssignedToId] = useState('');
  const [assignedById, setAssignedById] = useState('');

  // User Picker Modal State
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [userPickerMode, setUserPickerMode] = useState('assignedTo'); // 'assignedTo' | 'reportedTo'
  const [userSearchText, setUserSearchText] = useState('');

  // Fetch todos & users
  const loadData = useCallback(async () => {
    try {
      const [todosRes, usersRes] = await Promise.all([
        todosApi.getTodos().catch(() => ({ todos: [] })),
        todosApi.getUsers().catch(() => ({ users: [] })),
      ]);

      const list = todosRes.todos || todosRes.followups || [];
      setTodos(list);

      const uList = usersRes.users || [];
      setUsers(uList);

      // Default assignedTo / assignedBy to current user
      if (user?._id || user?.id) {
        const myId = String(user._id || user.id);
        setAssignedToId(prev => prev || myId);
        setAssignedById(prev => prev || myId);
      }
    } catch (err) {
      console.warn('[TodoListScreen] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Open Add Task Modal (Resets to default "1. ")
  const handleOpenAddModal = () => {
    setDescription('1. ');
    setPriority('medium');
    setDueDate(getTodayStr());
    setDueTime('18:30');
    if (user?._id || user?.id) {
      const myId = String(user._id || user.id);
      setAssignedToId(myId);
      setAssignedById(myId);
    }
    setModalVisible(true);
  };

  // "+ Add Item" helper for multi-line description (1., 2., 3., 4...)
  const handleAddDescriptionItem = () => {
    setDescription((prev) => {
      const current = prev || '';
      const lines = current.split('\n').filter((l) => l.trim().length > 0);
      const nextNum = lines.length + 1;
      if (!current.trim()) {
        return `${nextNum}. `;
      }
      return `${current.trimEnd()}\n${nextNum}. `;
    });
  };

  // Quick Date Helpers
  const setQuickDueDate = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  // Quick Add handler (from the top bar)
  const handleQuickAdd = async () => {
    const trimmed = quickText.trim();
    if (!trimmed || trimmed === '1.') {
      Alert.alert('Validation', 'Please enter a task description.');
      return;
    }

    setQuickAdding(true);
    try {
      const scheduledDateTime = new Date(`${getTodayStr()}T18:30:00`).toISOString();
      const rawLines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
      const checklist = rawLines.map((line) => ({
        title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: false,
      }));

      const myId = user?._id || user?.id;
      const payload = {
        type: 'todo',
        title: rawLines[0] || trimmed,
        note: trimmed,
        description: trimmed,
        priority: quickPriority,
        scheduledAt: scheduledDateTime,
        dueDate: scheduledDateTime,
        assignedTo: myId,
        assignedBy: myId,
        checklist,
      };

      await todosApi.createTodo(payload);
      setQuickText('1. ');
      loadData();
    } catch (err) {
      console.error('[TodoListScreen] Quick add error:', err);
      Alert.alert('Error', 'Failed to quick add todo.');
    } finally {
      setQuickAdding(false);
    }
  };

  // Full Create Todo handler (from Modal)
  const handleCreateTodo = async () => {
    const trimmed = description.trim();
    if (!trimmed || trimmed === '1.') {
      Alert.alert('Validation Error', 'Please enter task description / sub-items.');
      return;
    }

    setSubmitting(true);
    try {
      const datePart = dueDate || getTodayStr();
      const timePart = dueTime || '18:30';
      const scheduledDateTime = new Date(`${datePart}T${timePart}:00`).toISOString();

      const rawLines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
      const checklist = rawLines.map((line) => ({
        title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: false,
      }));

      const myId = user?._id || user?.id;
      const finalAssignedTo = assignedToId || myId;
      const finalAssignedBy = assignedById || myId;

      const payload = {
        type: 'todo',
        title: rawLines[0] || trimmed,
        note: trimmed,
        description: trimmed,
        priority,
        scheduledAt: scheduledDateTime,
        dueDate: scheduledDateTime,
        assignedTo: finalAssignedTo,
        assignedBy: finalAssignedBy,
        checklist,
      };

      await todosApi.createTodo(payload);
      setModalVisible(false);
      setDescription('1. ');
      loadData();
    } catch (err) {
      console.error('[TodoListScreen] Error creating todo:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle main status: 'done' <-> 'pending'
  const handleToggleStatus = async (item) => {
    const isCompleted = item.status === 'done' || item.status === 'completed';
    const nextStatus = isCompleted ? 'pending' : 'done';

    setTodos((prev) =>
      prev.map((t) => (t._id === item._id ? { ...t, status: nextStatus } : t))
    );

    try {
      await todosApi.updateStatus(item._id, nextStatus);
    } catch (err) {
      console.error('[TodoListScreen] Error updating status:', err);
      setTodos((prev) =>
        prev.map((t) => (t._id === item._id ? { ...t, status: item.status } : t))
      );
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  // Toggle individual sub-item in checklist
  const handleToggleSubItem = async (todo, index) => {
    const rawLines = (todo.note || todo.description || todo.title || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const hasDBChecklist = Array.isArray(todo.checklist) && todo.checklist.length > 0;

    let updatedChecklist = [];
    if (hasDBChecklist) {
      updatedChecklist = todo.checklist.map((c, i) =>
        i === index ? { ...c, completed: !c.completed } : c
      );
    } else {
      updatedChecklist = rawLines.map((line, i) => ({
        title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: i === index,
      }));
    }

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t._id === todo._id ? { ...t, checklist: updatedChecklist } : t))
    );

    try {
      await todosApi.updateTodo(todo._id, { checklist: updatedChecklist });
    } catch (err) {
      console.error('[TodoListScreen] Failed to update checklist item:', err);
      loadData();
    }
  };

  // Delete Todo
  const handleDeleteTodo = (todo) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete this task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setTodos((prev) => prev.filter((t) => t._id !== todo._id));
            try {
              await todosApi.deleteTodo(todo._id);
            } catch (err) {
              console.error('[TodoListScreen] Error deleting todo:', err);
              Alert.alert('Error', 'Failed to delete task.');
              loadData();
            }
          },
        },
      ]
    );
  };

  // User Picker selection
  const handleSelectUser = (selectedU) => {
    if (userPickerMode === 'assignedTo') {
      setAssignedToId(selectedU._id);
    } else {
      setAssignedById(selectedU._id);
    }
    setUserPickerVisible(false);
    setUserSearchText('');
  };

  // Resolving User Names
  const getUserName = (idOrObj, fallback = 'Unassigned') => {
    if (!idOrObj) return fallback;
    if (typeof idOrObj === 'object') return idOrObj.name || fallback;
    const found = users.find((u) => u._id === idOrObj);
    return found?.name || fallback;
  };

  // Filtered Users for Picker
  const filteredUsers = useMemo(() => {
    if (!userSearchText.trim()) return users;
    const q = userSearchText.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.designation || '').toLowerCase().includes(q)
    );
  }, [users, userSearchText]);

  // Statistics
  const stats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let overdue = 0;
    const now = new Date();

    todos.forEach((t) => {
      const isDone = t.status === 'done' || t.status === 'completed';
      if (isDone) {
        completed++;
      } else {
        pending++;
        const targetDate = t.scheduledAt || t.dueDate;
        if (targetDate && new Date(targetDate) < now) {
          overdue++;
        }
      }
    });

    return { total: todos.length, pending, completed, overdue };
  }, [todos]);

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    const todayStr = getTodayStr();

    return todos.filter((t) => {
      const isDone = t.status === 'done' || t.status === 'completed';
      const targetDateStr = (t.scheduledAt || t.dueDate || '').slice(0, 10);

      if (activeTab === 'pending' && isDone) return false;
      if (activeTab === 'completed' && !isDone) return false;
      if (activeTab === 'today') {
        if (targetDateStr !== todayStr && !t.isOverdue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = (t.title || t.note || t.description || '').toLowerCase();
        const assignee = (t.assignedTo?.name || '').toLowerCase();
        const assignor = (t.assignedBy?.name || '').toLowerCase();
        return text.includes(q) || assignee.includes(q) || assignor.includes(q);
      }

      return true;
    });
  }, [todos, activeTab, searchQuery]);

  // Format Date and Time
  const formatDateTimeDisplay = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      let dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (isToday) dateLabel = 'Today';
      else if (isTomorrow) dateLabel = 'Tomorrow';

      const timeLabel = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return `${dateLabel} • ${timeLabel}`;
    } catch {
      return '';
    }
  };

  // Render individual Todo Card (matching Web CRM TodoChecklist design)
  const renderTodoCard = ({ item }) => {
    const isDone = item.status === 'done' || item.status === 'completed';
    const prio = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
    const targetDate = item.scheduledAt || item.dueDate;
    const isOverdue = !isDone && targetDate && new Date(targetDate) < new Date();
    const dateTimeStr = formatDateTimeDisplay(targetDate);

    // Parse multi-line description and checklist
    const rawLines = (item.note || item.description || item.title || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const hasDBChecklist = Array.isArray(item.checklist) && item.checklist.length > 0;
    const items = hasDBChecklist
      ? item.checklist.map((c, i) => ({
          title: c.title || rawLines[i] || `Item ${i + 1}`,
          completed: !!c.completed,
          _id: c._id,
        }))
      : rawLines.map((line) => ({
          title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
          completed: false,
        }));

    const totalSub = items.length;
    const doneSub = items.filter((c) => c.completed).length;
    const percent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

    const assigneeName = getUserName(item.assignedTo, 'Self');
    const reportedToName =
      item.assignedBy === 'all' ? 'All Team' : getUserName(item.assignedBy, 'Manager');

    return (
      <View style={[styles.card, isDone && styles.cardDone]}>
        {/* Top Header Row of Card */}
        <View style={styles.cardHeaderRow}>
          {/* Main Status Checkbox */}
          <TouchableOpacity
            style={[styles.mainCheckbox, isDone && styles.mainCheckboxChecked]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            {isDone ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Ionicons name="ellipse-outline" size={19} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {/* Date & Time Badge */}
          <View style={[styles.dateTimeBadge, isOverdue && styles.dateTimeBadgeOverdue]}>
            <Ionicons
              name={isOverdue ? 'warning' : 'calendar-outline'}
              size={12}
              color={isOverdue ? '#DC2626' : '#475569'}
            />
            <Text style={[styles.dateTimeText, isOverdue && styles.dateTimeTextOverdue]}>
              {isOverdue ? `OVERDUE (${dateTimeStr})` : dateTimeStr || 'Today'}
            </Text>
          </View>

          {/* Priority Pill */}
          <View style={[styles.priorityBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}>
            <Ionicons name={prio.icon} size={11} color={prio.text} />
            <Text style={[styles.priorityText, { color: prio.text }]}>{prio.label}</Text>
          </View>

          {/* Delete Action */}
          <TouchableOpacity
            style={styles.deleteIconBtn}
            onPress={() => handleDeleteTodo(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Assigned To & Reported To Banner */}
        <View style={styles.assignmentRow}>
          <View style={styles.assignPill}>
            <Ionicons name="person" size={11} color="#0369A1" />
            <Text style={styles.assignLabel}>Assigned to:</Text>
            <Text style={styles.assignValue} numberOfLines={1}>
              {assigneeName}
            </Text>
          </View>

          <View style={styles.reportPill}>
            <Ionicons name="shield-checkmark" size={11} color="#475569" />
            <Text style={styles.reportLabel}>Reported to:</Text>
            <Text style={styles.reportValue} numberOfLines={1}>
              {reportedToName}
            </Text>
          </View>
        </View>

        {/* Center Description / Sub-Items Checklist Box (Default 1., 2., 3...) */}
        <View style={styles.checklistCardBox}>
          {totalSub === 0 ? (
            <Text style={styles.emptyDescText}>No description provided</Text>
          ) : (
            <View style={styles.subItemsList}>
              {items.map((sub, idx) => (
                <TouchableOpacity
                  key={sub._id || `${idx}-${sub.title}`}
                  style={[styles.subItemRow, sub.completed && styles.subItemRowDone]}
                  onPress={() => handleToggleSubItem(item, idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.subCheckbox, sub.completed && styles.subCheckboxChecked]}>
                    {sub.completed ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={styles.subIndexLabel}>{idx + 1}.</Text>
                  <Text
                    style={[styles.subItemText, sub.completed && styles.subItemTextDone]}
                    numberOfLines={3}
                  >
                    {sub.title}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Progress Bar (when multiple items exist) */}
              {totalSub > 1 ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {doneSub} of {totalSub} completed ({percent}%)
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="Todo List"
        subtitle={`${stats.pending} pending • ${stats.completed} completed`}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>Add Todo</Text>
          </TouchableOpacity>
        }
      />

      {/* Top Quick Add Bar (with Default "1. ") */}
      <View style={styles.quickAddBar}>
        <TextInput
          style={styles.quickInput}
          placeholder="1. Write quick todo item..."
          placeholderTextColor="#94A3B8"
          value={quickText}
          onChangeText={setQuickText}
        />
        <TouchableOpacity
          style={[styles.quickPriorityBtn, { backgroundColor: PRIORITY_CONFIG[quickPriority].bg }]}
          onPress={() => {
            const cycle = ['low', 'medium', 'high', 'urgent'];
            const nextIdx = (cycle.indexOf(quickPriority) + 1) % cycle.length;
            setQuickPriority(cycle[nextIdx]);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.quickPriorityText, { color: PRIORITY_CONFIG[quickPriority].text }]}>
            {PRIORITY_CONFIG[quickPriority].label}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickSubmitBtn, quickAdding && styles.quickSubmitBtnDisabled]}
          onPress={handleQuickAdd}
          disabled={quickAdding}
          activeOpacity={0.8}
        >
          {quickAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={17} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by description, assigned to, reported to..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'today', label: 'Today' },
          { id: 'completed', label: 'Done' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Todo List / Empty State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#174EA6" />
          <Text style={styles.loadingText}>Loading Manager Todo List...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTodos}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderTodoCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#174EA6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkbox-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No tasks matching your search query.'
                  : 'Use the quick bar above or tap "+ Add Todo" to create a task.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FULL ADD TODO MODAL (SAME FORM WITH DEFAULT 1., ASSIGNED TO, REPORTED TO, DATE & TIME) ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Todo Item</Text>
                <Text style={styles.modalSubtitle}>Assign tasks, set reported to, date & logout time</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 1. Description / Sub-Items Field (Default: 1.) */}
              <View style={styles.formSectionHeader}>
                <Text style={styles.modalLabel}>TODO TASK DESCRIPTION *</Text>
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={handleAddDescriptionItem}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={13} color="#174EA6" />
                  <Text style={styles.addItemBtnText}>+ Add Item (2., 3...)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.helperTipText}>
                Default is set to <Text style={{ fontWeight: '700' }}>1.</Text> Tap '+ Add Item' to add 2., 3., 4.
              </Text>

              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="1. Write todo item here..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              {/* 2. Assigned To & Reported To Pickers */}
              <View style={styles.dualFieldRow}>
                {/* Assigned To */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>ASSIGNED TO</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => {
                      setUserPickerMode('assignedTo');
                      setUserSearchText('');
                      setUserPickerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-outline" size={14} color="#0369A1" />
                    <Text style={styles.pickerSelectorText} numberOfLines={1}>
                      {getUserName(assignedToId, 'Select User')}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Reported To */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>REPORTED TO</Text>
                  <TouchableOpacity
                    style={styles.pickerSelectorBtn}
                    onPress={() => {
                      setUserPickerMode('reportedTo');
                      setUserSearchText('');
                      setUserPickerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color="#475569" />
                    <Text style={styles.pickerSelectorText} numberOfLines={1}>
                      {getUserName(assignedById, 'Select Reporting')}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Date & Logout Time */}
              <Text style={styles.modalLabel}>DUE DATE & LOGOUT TIME</Text>
              {/* Quick Date Selectors */}
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={styles.quickPillBtn}
                  onPress={() => setQuickDueDate(0)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPillText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPillBtn}
                  onPress={() => setQuickDueDate(1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPillText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPillBtn}
                  onPress={() => setQuickDueDate(3)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPillText}>In 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPillBtn}
                  onPress={() => setQuickDueDate(7)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPillText}>In 1 Week</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dualFieldRow}>
                {/* Date Input */}
                <View style={{ flex: 1.2 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>

                {/* Time Input */}
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="HH:mm (e.g. 18:30)"
                    placeholderTextColor="#94A3B8"
                    value={dueTime}
                    onChangeText={setDueTime}
                  />
                </View>
              </View>

              {/* Quick Time Selectors */}
              <View style={[styles.quickPillsRow, { marginTop: 4 }]}>
                {[
                  { label: '09:00 AM', val: '09:00' },
                  { label: '01:00 PM', val: '13:00' },
                  { label: '06:30 PM (Logout)', val: '18:30' },
                  { label: '08:00 PM', val: '20:00' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.val}
                    style={[styles.quickTimeBtn, dueTime === t.val && styles.quickTimeBtnActive]}
                    onPress={() => setDueTime(t.val)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickTimeText,
                        dueTime === t.val && styles.quickTimeTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Priority Selector */}
              <Text style={styles.modalLabel}>PRIORITY</Text>
              <View style={styles.prioritySelectorRow}>
                {['low', 'medium', 'high', 'urgent'].map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSelected = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        isSelected && { backgroundColor: cfg.bg, borderColor: cfg.text },
                      ]}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cfg.icon}
                        size={13}
                        color={isSelected ? cfg.text : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.priorityOptionText,
                          isSelected && { color: cfg.text, fontWeight: '700' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.modalSubmitBtnDisabled]}
                onPress={handleCreateTodo}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Create Todo</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── USER PICKER MODAL (FOR ASSIGNED TO & REPORTED TO) ── */}
      <Modal
        visible={userPickerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUserPickerVisible(false)}
      >
        <View style={styles.userPickerOverlay}>
          <View style={styles.userPickerCard}>
            <View style={styles.userPickerHeader}>
              <Text style={styles.userPickerTitle}>
                Select {userPickerMode === 'assignedTo' ? 'Assigned To' : 'Reported To'}
              </Text>
              <TouchableOpacity
                onPress={() => setUserPickerVisible(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search user */}
            <View style={styles.userSearchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.userSearchInput}
                placeholder="Search staff by name or dept..."
                placeholderTextColor="#94A3B8"
                value={userSearchText}
                onChangeText={setUserSearchText}
              />
            </View>

            <FlatList
              data={filteredUsers}
              keyExtractor={(u) => u._id}
              style={{ maxHeight: 320 }}
              renderItem={({ item: u }) => {
                const isSelected =
                  userPickerMode === 'assignedTo'
                    ? assignedToId === u._id
                    : assignedById === u._id;
                return (
                  <TouchableOpacity
                    style={[styles.userListItem, isSelected && styles.userListItemActive]}
                    onPress={() => handleSelectUser(u)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userAvatarBox}>
                      <Text style={styles.userAvatarLetter}>
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userNameText, isSelected && styles.userNameTextActive]}>
                        {u.name}
                        {u._id === (user?._id || user?.id) ? ' (Me)' : ''}
                      </Text>
                      <Text style={styles.userDeptText}>
                        {u.designation || u.role || 'Staff'} • {u.department || 'General'}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={18} color="#174EA6" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#174EA6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Quick Add Bar */
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  quickPriorityBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickPriorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickSubmitBtn: {
    backgroundColor: '#174EA6',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSubmitBtnDisabled: {
    opacity: 0.6,
  },

  /* Stats Container */
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },

  /* Search & Tabs */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#174EA6',
    borderColor: '#174EA6',
  },
  filterTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Todo Cards List */
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#12305A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mainCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  mainCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  dateTimeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  dateTimeBadgeOverdue: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  dateTimeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  dateTimeTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteIconBtn: {
    padding: 3,
  },

  /* Assignment Row */
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  assignPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assignLabel: {
    fontSize: 9.5,
    color: '#0369A1',
    fontWeight: '500',
  },
  assignValue: {
    fontSize: 10.5,
    color: '#0369A1',
    fontWeight: '700',
    flexShrink: 1,
  },
  reportPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportLabel: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '500',
  },
  reportValue: {
    fontSize: 10.5,
    color: '#1E293B',
    fontWeight: '700',
    flexShrink: 1,
  },

  /* Description / Numbered Checklist Container */
  checklistCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  emptyDescText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  subItemsList: {
    gap: 6,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingVertical: 2,
  },
  subItemRowDone: {
    opacity: 0.65,
  },
  subCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#FFFFFF',
  },
  subCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  subIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174EA6',
    minWidth: 16,
  },
  subItemText: {
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
  },
  subItemTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  progressContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'right',
  },

  /* Loading & Empty States */
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  /* ── Add Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  formSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174EA6',
  },
  helperTipText: {
    fontSize: 11,
    color: '#EA580C',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  pickerSelectorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  quickPillBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  quickTimeBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTimeBtnActive: {
    backgroundColor: '#174EA6',
    borderColor: '#174EA6',
  },
  quickTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  quickTimeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#174EA6',
    paddingVertical: 12,
    borderRadius: 11,
    marginTop: 18,
    marginBottom: 12,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.7,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ── User Picker Modal ── */
  userPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  userPickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  userPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 10,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    padding: 0,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 8,
  },
  userListItemActive: {
    backgroundColor: '#EFF6FF',
  },
  userAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#174EA6',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  userNameTextActive: {
    color: '#174EA6',
    fontWeight: '700',
  },
  userDeptText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
});
