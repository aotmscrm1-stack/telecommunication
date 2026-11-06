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

export default function TodoListScreen({ onNavigate }) {
  const { user } = useAuth();

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'today', 'completed'

  // Modal State for Creating a Task
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    try {
      const res = await todosApi.getTodos();
      const list = res.todos || res.followups || [];
      setTodos(list);
    } catch (err) {
      console.warn('[TodoListScreen] Error fetching todos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTodos();
  }, [fetchTodos]);

  // Toggle status: 'done' <-> 'pending'
  const handleToggleStatus = async (item) => {
    const isCompleted = item.status === 'done' || item.status === 'completed';
    const nextStatus = isCompleted ? 'pending' : 'done';

    // Optimistic UI update
    setTodos((prev) =>
      prev.map((t) => (t._id === item._id ? { ...t, status: nextStatus } : t))
    );

    try {
      await todosApi.updateStatus(item._id, nextStatus);
    } catch (err) {
      console.error('[TodoListScreen] Error updating status:', err);
      // Revert if failed
      setTodos((prev) =>
        prev.map((t) => (t._id === item._id ? { ...t, status: item.status } : t))
      );
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (todoId, itemId, currentVal) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => {
        if (t._id !== todoId) return t;
        const nextChecklist = (t.checklist || []).map((c) =>
          c._id === itemId ? { ...c, completed: !currentVal } : c
        );
        return { ...t, checklist: nextChecklist };
      })
    );

    try {
      await todosApi.toggleChecklist(todoId, itemId);
    } catch (err) {
      console.error('[TodoListScreen] Error toggling checklist:', err);
      fetchTodos();
    }
  };

  // Delete Todo
  const handleDeleteTodo = (todo) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${todo.title || 'this task'}"?`,
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
              fetchTodos();
            }
          },
        },
      ]
    );
  };

  // Create Todo
  const handleCreateTodo = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a task title.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        dueDate: newDueDate ? new Date(newDueDate) : new Date(),
        assignedTo: user?._id || user?.id,
      };

      await todosApi.createTodo(payload);
      setModalVisible(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewDueDate('');
      fetchTodos();
    } catch (err) {
      console.error('[TodoListScreen] Error creating todo:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick date helper for modal
  const setQuickDate = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setNewDueDate(`${yyyy}-${mm}-${dd}`);
  };

  // Filtered Todos & Statistics
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

  const filteredTodos = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return todos.filter((t) => {
      const isDone = t.status === 'done' || t.status === 'completed';
      const targetDateStr = (t.scheduledAt || t.dueDate || '').slice(0, 10);

      // Tab filtering
      if (activeTab === 'pending' && isDone) return false;
      if (activeTab === 'completed' && !isDone) return false;
      if (activeTab === 'today') {
        if (targetDateStr !== todayStr && !t.isOverdue) return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || t.note || '').toLowerCase().includes(q);
        return titleMatch || descMatch;
      }

      return true;
    });
  }, [todos, activeTab, searchQuery]);

  // Format date helper
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Render individual Todo Item
  const renderTodoCard = ({ item }) => {
    const isDone = item.status === 'done' || item.status === 'completed';
    const prio = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
    const targetDate = item.scheduledAt || item.dueDate;
    const isOverdue = !isDone && targetDate && new Date(targetDate) < new Date();
    const dateStr = formatDateDisplay(targetDate);
    const checklist = item.checklist || [];
    const completedChecklistCount = checklist.filter((c) => c.completed).length;

    return (
      <View style={[styles.card, isDone && styles.cardDone]}>
        {/* Top Card Row */}
        <View style={styles.cardHeaderRow}>
          {/* Checkbox Button */}
          <TouchableOpacity
            style={[styles.checkboxBtn, isDone && styles.checkboxBtnChecked]}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            {isDone ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Ionicons name="ellipse-outline" size={18} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {/* Title and Description */}
          <View style={styles.cardContent}>
            <Text
              style={[styles.todoTitle, isDone && styles.todoTitleDone]}
              numberOfLines={2}
            >
              {item.title || 'Untitled Task'}
            </Text>
            {item.description || item.note ? (
              <Text
                style={[styles.todoDescription, isDone && styles.todoDescriptionDone]}
                numberOfLines={2}
              >
                {item.description || item.note}
              </Text>
            ) : null}
          </View>

          {/* Delete Action */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteTodo(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={17} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Checklist Section (if any) */}
        {checklist.length > 0 ? (
          <View style={styles.checklistSection}>
            <View style={styles.checklistHeader}>
              <Ionicons name="list-outline" size={13} color="#64748B" />
              <Text style={styles.checklistCountText}>
                Checklist ({completedChecklistCount}/{checklist.length})
              </Text>
            </View>
            {checklist.map((c) => (
              <TouchableOpacity
                key={c._id || c.title}
                style={styles.checklistItem}
                onPress={() => handleToggleChecklist(item._id, c._id, c.completed)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={c.completed ? 'checkbox' : 'square-outline'}
                  size={15}
                  color={c.completed ? '#059669' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.checklistItemText,
                    c.completed && styles.checklistItemTextDone,
                  ]}
                  numberOfLines={1}
                >
                  {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Footer Meta Row */}
        <View style={styles.cardFooter}>
          {/* Priority Badge */}
          <View style={[styles.priorityBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}>
            <Ionicons name={prio.icon} size={11} color={prio.text} />
            <Text style={[styles.priorityText, { color: prio.text }]}>{prio.label}</Text>
          </View>

          {/* Due Date Badge */}
          {dateStr ? (
            <View style={[styles.dateBadge, isOverdue && styles.dateBadgeOverdue]}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={isOverdue ? '#DC2626' : '#64748B'}
              />
              <Text style={[styles.dateText, isOverdue && styles.dateTextOverdue]}>
                {isOverdue ? `Overdue (${dateStr})` : dateStr}
              </Text>
            </View>
          ) : null}

          {/* Assigned Person */}
          {item.assignedTo?.name ? (
            <View style={styles.assignedBadge}>
              <Ionicons name="person-circle-outline" size={12} color="#0284C7" />
              <Text style={styles.assignedText} numberOfLines={1}>
                {item.assignedTo.name}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title="Todo List"
        subtitle={`${stats.pending} pending • ${stats.completed} done`}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

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
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search todos or remarks..."
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
          <Text style={styles.loadingText}>Loading Todo List...</Text>
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
                  : 'Tap the "+ Add" button to create your first manager task.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Task Modal */}
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
                <Text style={styles.modalTitle}>New Task / Todo</Text>
                <Text style={styles.modalSubtitle}>Create a task for yourself or your team</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Task Title */}
              <Text style={styles.modalLabel}>TASK TITLE *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Follow up on Batch #4 demo leads"
                placeholderTextColor="#94A3B8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Task Description */}
              <Text style={styles.modalLabel}>NOTES / DETAILS (OPTIONAL)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Key action items or caller instructions..."
                placeholderTextColor="#94A3B8"
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
              />

              {/* Priority Selector */}
              <Text style={styles.modalLabel}>PRIORITY</Text>
              <View style={styles.prioritySelectorRow}>
                {['low', 'medium', 'high', 'urgent'].map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSelected = newPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        isSelected && { backgroundColor: cfg.bg, borderColor: cfg.text },
                      ]}
                      onPress={() => setNewPriority(p)}
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

              {/* Due Date with Quick Selectors */}
              <Text style={styles.modalLabel}>DUE DATE (YYYY-MM-DD)</Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={styles.quickDateBtn}
                  onPress={() => setQuickDate(0)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateBtn}
                  onPress={() => setQuickDate(1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateBtn}
                  onPress={() => setQuickDate(3)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>In 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateBtn}
                  onPress={() => setQuickDate(7)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>In 1 Week</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2026-11-10"
                placeholderTextColor="#94A3B8"
                value={newDueDate}
                onChangeText={setNewDueDate}
              />

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
                    <Text style={styles.modalSubmitBtnText}>Create Task</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#174EA6',
    borderColor: '#174EA6',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxBtnChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  cardContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 19,
  },
  todoTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  todoDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  todoDescriptionDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  deleteBtn: {
    padding: 4,
  },
  checklistSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    gap: 6,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  checklistCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checklistItemText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  checklistItemTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  dateBadgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  dateTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  assignedText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0284C7',
  },
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
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  /* Add Task Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityOptionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickDateBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#174EA6',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.7,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

