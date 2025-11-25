import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onTogglePriority: (id: string, priority: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onTogglePriority, onEdit, onDelete }: TodoItemProps) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const { fontScale } = useAccessibility();

  const getUrgencyStyle = () => {
    if (!todo.dueDate || todo.completed) return null;
    
    const now = new Date();
    const due = new Date(todo.dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return styles.todoItemOverdue; // Past due - dark red
    } else if (daysUntilDue <= 1) {
      return styles.todoItemUrgent; // Due today or tomorrow - red
    } else if (daysUntilDue <= 3) {
      return styles.todoItemSoon; // Due in 2-3 days - orange
    }
    return null;
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!todo.subtasks) return;
    
    const updatedSubtasks = todo.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        subtasks: updatedSubtasks,
        updatedAt: new Date(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update subtask');
    }
  };

  const getCompletedSubtasksCount = () => {
    if (!todo.subtasks || todo.subtasks.length === 0) return null;
    const completed = todo.subtasks.filter(st => st.completed).length;
    return `${completed}/${todo.subtasks.length}`;
  };

  const formatDueDate = () => {
    if (!todo.dueDate) return null;
    const due = new Date(todo.dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = due.toDateString() === today.toDateString();
    const isTomorrow = due.toDateString() === tomorrow.toDateString();
    
    // Check if time is set (not midnight)
    const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0;
    const timeStr = hasTime ? ` at ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '';
    
    if (isToday) return `📅 Due Today${timeStr}`;
    if (isTomorrow) return `📅 Due Tomorrow${timeStr}`;
    return `📅 Due ${due.toLocaleDateString()}${timeStr}`;
  };

  return (
    <View style={[styles.todoItem, todo.priority && styles.todoItemPriority, getUrgencyStyle()]}>
      <TouchableOpacity 
        onPress={() => onTogglePriority(todo.id, !todo.priority)} 
        style={[styles.priorityButton, todo.priority && styles.priorityButtonActive]}
      >
        <Text style={[styles.priorityButtonText, todo.priority && styles.priorityButtonTextActive, { fontSize: 20 * fontScale }]}>
          {todo.priority ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
      <View style={styles.todoHeader}>
        <TouchableOpacity 
          style={styles.todoContent}
          onPress={() => onToggle(todo.id, !todo.completed)}
        >
          <View style={[styles.checkbox, todo.completed && styles.checkboxCompleted]}>
            {todo.completed && <Text style={[styles.checkmark, { fontSize: 24 * fontScale }]}>✓</Text>}
          </View>
          <View style={styles.todoText}>
            <Text style={[styles.todoTitle, todo.completed && styles.todoTitleCompleted, { fontSize: 18 * fontScale }]}>
              {todo.title}
            </Text>
            {todo.description && (
              <Text style={[styles.todoDescription, todo.completed && styles.todoDescriptionCompleted, { fontSize: 14 * fontScale }]}>
                {todo.description}
              </Text>
            )}
            {todo.subtasks && todo.subtasks.length > 0 && (
              <TouchableOpacity 
                style={styles.subtasksToggle}
                onPress={() => setShowSubtasks(!showSubtasks)}
              >
                <Text style={[styles.subtasksToggleText, { fontSize: 13 * fontScale }]}>
                  {showSubtasks ? '▼' : '▶'} Checklist ({getCompletedSubtasksCount()})
                </Text>
              </TouchableOpacity>
            )}
            {showSubtasks && todo.subtasks && todo.subtasks.length > 0 && (
              <View style={styles.subtasksList}>
                {todo.subtasks.map((subtask) => (
                  <TouchableOpacity
                    key={subtask.id}
                    style={styles.subtaskItem}
                    onPress={() => handleToggleSubtask(subtask.id)}
                  >
                    <View style={[styles.subtaskCheckbox, subtask.completed && styles.checkboxCompleted]}>
                      {subtask.completed && <Text style={[styles.subtaskCheckmark, { fontSize: 12 * fontScale }]}>✓</Text>}
                    </View>
                    <Text style={[styles.subtaskText, subtask.completed && styles.subtaskTextCompleted, { fontSize: 13 * fontScale }]}>
                      {subtask.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.todoActions}>
        <View style={styles.actionButtons}>
          {todo.dueDate && !todo.completed && (
            <Text style={[styles.dueDateText, { fontSize: 12 * fontScale }]}>{formatDueDate()}</Text>
          )}
          <TouchableOpacity onPress={() => onEdit(todo)} style={styles.editButton}>
            <Text style={[styles.editButtonText, { fontSize: 24 * fontScale }]}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(todo.id)} style={styles.deleteButton}>
            <Text style={[styles.deleteButtonText, { fontSize: 24 * fontScale }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [subtasks, setSubtasks] = useState<{id: string; text: string; completed: boolean}[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const confettiRef = useRef<any>(null);
  const { currentUser, logout } = useAuth();
  const { showNotification } = useNotification();
  const { fontScale } = useAccessibility();

  // Dynamic styles based on font scale
  const dynamicStyles = {
    loadingText: { fontSize: 16 * fontScale },
    headerTitle: { fontSize: 28 * fontScale },
    motivationalText: { fontSize: 14 * fontScale },
    statNumber: { fontSize: 24 * fontScale },
    statLabel: { fontSize: 12 * fontScale },
    emptyTitle: { fontSize: 20 * fontScale },
    emptyDescription: { fontSize: 14 * fontScale },
    checkmark: { fontSize: 24 * fontScale },
    todoTitle: { fontSize: 18 * fontScale },
    todoDescription: { fontSize: 14 * fontScale },
    subtasksToggleText: { fontSize: 13 * fontScale },
    subtaskCheckmark: { fontSize: 12 * fontScale },
    subtaskText: { fontSize: 13 * fontScale },
    priorityButtonText: { fontSize: 20 * fontScale },
    editButtonText: { fontSize: 24 * fontScale },
    deleteButtonText: { fontSize: 24 * fontScale },
    addButtonText: { fontSize: 45 * fontScale },
    modalTitle: { fontSize: 20 * fontScale },
    modalInput: { fontSize: 16 * fontScale },
    cancelButtonText: { fontSize: 16 * fontScale },
    saveButtonText: { fontSize: 16 * fontScale },
    dueDateText: { fontSize: 12 * fontScale },
    sectionLabel: { fontSize: 14 * fontScale },
    subtaskInput: { fontSize: 16 * fontScale },
    addSubtaskButtonText: { fontSize: 24 * fontScale },
    modalSubtaskText: { fontSize: 14 * fontScale },
    removeSubtaskButton: { fontSize: 18 * fontScale },
    datePickerButtonText: { fontSize: 16 * fontScale },
    datePickerDoneText: { fontSize: 16 * fontScale },
    clearDateText: { fontSize: 14 * fontScale },
  };

  const motivationalPhrases = [
    "Tick it off - one step closer to your goals!",
    "Don't wait for the right moment, make it happen and tick it!",
    "Every tick is proof of your progress - keep going!",
    "Big dreams start with small ticks.",
    "Stay focused, stay positive, and tick your way to success."
  ];

  const [randomPhrase] = useState(() => 
    motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]
  );

  // Auto-save draft to AsyncStorage
  useEffect(() => {
    if (!modalVisible) return;

    const saveDraft = async () => {
      try {
        const draft = {
          title,
          description,
          dueDate: dueDate?.toISOString(),
          dueTime: dueTime?.toISOString(),
          subtasks,
          editingTodoId: editingTodo?.id || null,
        };
        await AsyncStorage.setItem('@todo_draft', JSON.stringify(draft));
        console.log('💾 Draft auto-saved');
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    };

    // Save draft after 1 second of changes
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [title, description, dueDate, dueTime, subtasks, modalVisible, editingTodo]);

  // Load draft on component mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftJson = await AsyncStorage.getItem('@todo_draft');
        if (draftJson) {
          const draft = JSON.parse(draftJson);
          // Only restore if it's for a new todo (not editing)
          if (!draft.editingTodoId && !editingTodo) {
            setTitle(draft.title || '');
            setDescription(draft.description || '');
            setDueDate(draft.dueDate ? new Date(draft.dueDate) : null);
            setDueTime(draft.dueTime ? new Date(draft.dueTime) : null);
            setSubtasks(draft.subtasks || []);
            setDraftRestored(true);
            console.log('📝 Draft restored');
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, []);

  // Clear draft after successful save
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem('@todo_draft');
      setDraftRestored(false);
      console.log('🗑️ Draft cleared');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  useEffect(() => {
    console.log('Current user:', currentUser?.uid);
    if (!currentUser?.uid) {
      console.log('No authenticated user, skipping query');
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log('Query successful, docs:', querySnapshot.size); // Debug line
        const todosData: Todo[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          todosData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            completed: data.completed,
            priority: data.priority || false,
            dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
            subtasks: data.subtasks || [],
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            userId: data.userId,
          });
        });
        
        // Sort by priority first, then by creation date
        todosData.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority ? 1 : -1;
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        
        setTodos(todosData);
        setLoading(false);

        // Check for upcoming and overdue tasks, show notifications
        checkForUrgentTasks(todosData);
      },
      (error) => {
        console.error('Firestore query error:', error);
        console.error('User ID:', currentUser?.uid); // Debug line
        setLoading(false);
        setTodos([]);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Check for urgent tasks and show notifications
  const checkForUrgentTasks = (tasks: Todo[]) => {
    const now = new Date();
    const incompleteTasks = tasks.filter(t => !t.completed && t.dueDate);

    // Check for overdue tasks
    const overdueTasks = incompleteTasks.filter(t => {
      const due = new Date(t.dueDate!);
      return due < now;
    });

    // Check for tasks due within 24 hours
    const urgentTasks = incompleteTasks.filter(t => {
      const due = new Date(t.dueDate!);
      const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });

    // Show notifications
    if (overdueTasks.length > 0) {
      showNotification(
        '⚠️ Overdue Tasks',
        `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}!`,
        'error'
      );
    } else if (urgentTasks.length > 0) {
      showNotification(
        '⏰ Upcoming Tasks',
        `${urgentTasks.length} task${urgentTasks.length > 1 ? 's' : ''} due within 24 hours!`,
        'warning'
      );
    }
  };

  const handleAddTodo = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      // Combine date and time if both are set
      let finalDueDate = dueDate;
      if (dueDate && dueTime) {
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      }

      await addDoc(collection(db, 'todos'), {
        title: title.trim(),
        description: description.trim(),
        completed: false,
        priority: false,
        dueDate: finalDueDate || null,
        subtasks: subtasks,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser?.uid,
      });
      setTitle('');
      setDescription('');
      setDueDate(null);
      setDueTime(null);
      setSubtasks([]);
      setNewSubtaskText('');
      setModalVisible(false);
      await clearDraft(); // Clear draft after successful save
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add task');
    }
  };

  const handleEditTodo = async () => {
    if (!title.trim() || !editingTodo) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      // Combine date and time if both are set
      let finalDueDate = dueDate;
      if (dueDate && dueTime) {
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      }

      await updateDoc(doc(db, 'todos', editingTodo.id), {
        title: title.trim(),
        description: description.trim(),
        dueDate: finalDueDate || null,
        subtasks: subtasks,
        updatedAt: new Date(),
      });
      setTitle('');
      setDescription('');
      setDueDate(null);
      setDueTime(null);
      setSubtasks([]);
      setNewSubtaskText('');
      setEditingTodo(null);
      setModalVisible(false);
      await clearDraft(); // Clear draft after successful save
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      // Only trigger confetti if completing a task (false -> true)
      if (completed) {
        const currentTodo = todos.find(t => t.id === id);
        if (currentTodo && !currentTodo.completed) {
          // Immediate confetti - no delay
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
      
      const updateData: any = {
        completed,
        updatedAt: new Date(),
      };
      
      // Add completedAt timestamp when marking as complete
      if (completed) {
        updateData.completedAt = new Date();
      } else {
        // Remove completedAt when uncompleting
        updateData.completedAt = null;
      }
      
      await updateDoc(doc(db, 'todos', id), updateData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleTogglePriority = async (id: string, priority: boolean) => {
    try {
      await updateDoc(doc(db, 'todos', id), {
        priority,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'todos', id));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete todo');
            }
          },
        },
      ]
    );
  };

  const openAddModal = async () => {
    // Check if there's a draft
    try {
      const draftJson = await AsyncStorage.getItem('@todo_draft');
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        // Only show restore option if it's not an edit draft and has content
        if (!draft.editingTodoId && (draft.title || draft.description || draft.subtasks?.length > 0)) {
          Alert.alert(
            'Draft Found',
            'You have an unsaved draft. Would you like to restore it?',
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  clearDraft();
                  setTitle('');
                  setDescription('');
                  setDueDate(null);
                  setDueTime(null);
                  setSubtasks([]);
                  setNewSubtaskText('');
                  setShowDatePicker(false);
                  setEditingTodo(null);
                  setModalVisible(true);
                }
              },
              {
                text: 'Restore',
                onPress: () => {
                  setTitle(draft.title || '');
                  setDescription(draft.description || '');
                  setDueDate(draft.dueDate ? new Date(draft.dueDate) : null);
                  setDueTime(draft.dueTime ? new Date(draft.dueTime) : null);
                  setSubtasks(draft.subtasks || []);
                  setNewSubtaskText('');
                  setShowDatePicker(false);
                  setEditingTodo(null);
                  setDraftRestored(true);
                  setModalVisible(true);
                }
              }
            ]
          );
          return;
        }
      }
    } catch (error) {
      console.error('Failed to check for draft:', error);
    }

    // No draft or error - open fresh modal
    setTitle('');
    setDescription('');
    setDueDate(null);
    setDueTime(null);
    setSubtasks([]);
    setNewSubtaskText('');
    setShowDatePicker(false);
    setEditingTodo(null);
    setDraftRestored(false);
    setModalVisible(true);
  };

  const openEditModal = (todo: Todo) => {
    setTitle(todo.title);
    setDescription(todo.description || '');
    setDueDate(todo.dueDate || null);
    setSubtasks(todo.subtasks || []);
    setNewSubtaskText('');
    // Extract time from dueDate if it exists
    if (todo.dueDate) {
      const hasTime = todo.dueDate.getHours() !== 0 || todo.dueDate.getMinutes() !== 0;
      if (hasTime) {
        setDueTime(todo.dueDate);
      } else {
        setDueTime(null);
      }
    } else {
      setDueTime(null);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
    setEditingTodo(todo);
    setModalVisible(true);
  };

  const addSubtask = () => {
    if (newSubtaskText.trim()) {
      setSubtasks([...subtasks, {
        id: Date.now().toString(),
        text: newSubtaskText.trim(),
        completed: false
      }]);
      setNewSubtaskText('');
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading your todos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* CONFETTI - falls from top */}
      {showConfetti && (
        <View style={styles.confettiOverlay}>
          <ConfettiCannon
            count={200}
            origin={{ x: 200, y: -10 }}
            autoStart={true}
            fadeOut={true}
            explosionSpeed={350}
            fallSpeed={2000}
          />
        </View>
      )}
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>To Do List</Text>
          <Text style={[styles.motivationalText, dynamicStyles.motivationalText]}>{randomPhrase}</Text>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, dynamicStyles.statNumber]}>{todos.length}</Text>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, dynamicStyles.statNumber]}>{todos.filter(t => !t.completed).length}</Text>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, dynamicStyles.statNumber]}>{todos.filter(t => t.completed).length}</Text>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Completed</Text>
            </View>
          </View>

          <FlatList
            data={todos}
            renderItem={({ item }) => (
              <TodoItem
                todo={item}
                onToggle={handleToggleTodo}
                onTogglePriority={handleTogglePriority}
                onEdit={openEditModal}
                onDelete={handleDeleteTodo}
              />
            )
            }
            keyExtractor={(item) => item.id}
            style={styles.todoList}
            contentContainerStyle={todos.length === 0 ? styles.emptyListContainer : undefined}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No tasks to organise yet!</Text>
                <Text style={[styles.emptyDescription, dynamicStyles.emptyDescription]}>Write one and start ticking</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={[styles.addButtonText, dynamicStyles.addButtonText]}>+</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                      {editingTodo ? 'Edit Task' : 'Add New Task'}
                    </Text>
                    {draftRestored && !editingTodo && (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>📝 Draft</Text>
                      </View>
                    )}
                  </View>
                  
                  <ScrollView 
                    style={styles.modalScrollView}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TextInput
                      style={[styles.modalInput, dynamicStyles.modalInput]}
                      placeholder="Task title"
                      placeholderTextColor="#8B7BA8"
                      value={title}
                      onChangeText={setTitle}
                      autoFocus
                    />

                  <TextInput
                    style={[styles.modalInput, styles.descriptionInput, dynamicStyles.modalInput]}
                    placeholder="Description (optional)"
                    placeholderTextColor="#8B7BA8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>Due Date</Text>
                  
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[styles.datePickerButtonText, dynamicStyles.datePickerButtonText]}>
                      {dueDate ? `📅 ${dueDate.toLocaleDateString()}` : '📅 Select Date'}
                    </Text>
                  </TouchableOpacity>

                  {dueDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => {
                        setDueDate(null);
                        setDueTime(null);
                      }}
                    >
                      <Text style={[styles.clearDateText, dynamicStyles.clearDateText]}>Clear Date</Text>
                    </TouchableOpacity>
                  )}

                  {showDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={dueDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        minimumDate={new Date()}
                        textColor="#6C55BE"
                        themeVariant="light"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.datePickerDoneButton}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {dueDate && (
                    <>
                      <Text style={styles.sectionLabel}>Due Time</Text>
                      
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.datePickerButtonText}>
                          {dueTime ? `🕐 ${dueTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '🕐 Select Time (None)'}
                        </Text>
                      </TouchableOpacity>

                      {dueTime && (
                        <TouchableOpacity
                          style={styles.clearDateButton}
                          onPress={() => setDueTime(null)}
                        >
                          <Text style={styles.clearDateText}>Clear Time</Text>
                        </TouchableOpacity>
                      )}

                      {showTimePicker && (
                        <View style={styles.datePickerContainer}>
                          <DateTimePicker
                            value={dueTime || new Date()}
                            mode="time"
                            is24Hour={false}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                              setShowTimePicker(Platform.OS === 'ios');
                              if (selectedTime) {
                                setDueTime(selectedTime);
                              }
                            }}
                            textColor="#6C55BE"
                            themeVariant="light"
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.datePickerDoneButton}
                              onPress={() => setShowTimePicker(false)}
                            >
                              <Text style={styles.datePickerDoneText}>Done</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}

                  <Text style={styles.sectionLabel}>Checklist (Optional)</Text>
                  
                  {subtasks.length > 0 && (
                    <View style={styles.modalSubtasksList}>
                      {subtasks.map((subtask) => (
                        <View key={subtask.id} style={styles.modalSubtaskItem}>
                          <Text style={styles.modalSubtaskText}>• {subtask.text}</Text>
                          <TouchableOpacity onPress={() => removeSubtask(subtask.id)}>
                            <Text style={styles.removeSubtaskButton}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.addSubtaskContainer}>
                    <TextInput
                      style={styles.subtaskInput}
                      placeholder="Add checklist item"
                      placeholderTextColor="#8B7BA8"
                      value={newSubtaskText}
                      onChangeText={setNewSubtaskText}
                      onSubmitEditing={addSubtask}
                      returnKeyType="done"
                    />
                    <TouchableOpacity 
                      style={styles.addSubtaskButton}
                      onPress={addSubtask}
                    >
                      <Text style={styles.addSubtaskButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(false);
                        setShowTimePicker(false);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={editingTodo ? handleEditTodo : handleAddTodo}
                    >
                      <Text style={styles.saveButtonText}>
                        {editingTodo ? 'Save' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6C55BE',
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    pointerEvents: 'none',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#6C55BE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C55BE',
  },
  loadingText: {
    fontSize: 16,
    color: '#CEE476',
  },
  header: {
    backgroundColor: '#6C55BE',
    paddingTop: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CEE476',
    marginBottom: 4,
  },
  motivationalText: {
    fontSize: 14,
    color: '#CEE476',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
    opacity: 1,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#CEE476',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C55BE',
    marginTop: 4,
  },
  todoList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8B7BA8',
    textAlign: 'center',
  },
  todoItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  todoItemPriority: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#CEE476',
  },
  todoItemSoon: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#F59E0B',
  },
  todoItemUrgent: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#EF4444',
  },
  todoItemOverdue: {
    backgroundColor: '#991B1B',
    borderLeftColor: '#7F1D1D',
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 10,
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#CEE476',
  },
  checkmark: {
    color: '#6C55BE',
    fontSize: 24,
    fontWeight: 'bold',
  },
  todoText: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 4,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  todoDescription: {
    fontSize: 14,
    color: '#6C55BE',
    lineHeight: 20,
  },
  todoDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  subtasksToggle: {
    marginTop: 8,
    paddingVertical: 4,
  },
  subtasksToggleText: {
    fontSize: 13,
    color: '#8B7BA8',
    fontWeight: '600',
  },
  subtasksList: {
    marginTop: 8,
    marginLeft: 8,
    gap: 6,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#8B7BA8',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskCheckmark: {
    fontSize: 12,
    color: '#6C55BE',
    fontWeight: 'bold',
  },
  subtaskText: {
    fontSize: 13,
    color: '#6C55BE',
    flex: 1,
  },
  subtaskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  todoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  priorityButtonActive: {
    backgroundColor: '#CEE476',
  },
  priorityButtonText: {
    color: '#8B7BA8',
    fontSize: 20,
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#6C55BE',
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 24,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width:60,
    height: 60,
    borderRadius: 28,
    backgroundColor: '#6C55BE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CEE476',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#CEE476',
    fontSize: 45,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#CEE476',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  draftBadge: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    color: '#E65100',
    fontSize: 11,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#6C55BE',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#8B7BA8',
  },
  cancelButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#CEE476',
  },
  saveButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '700',
  },
  dueDateText: {
    fontSize: 12,
    color: '#6C55BE',
    fontWeight: '600',
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 8,
    marginTop: 8,
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#6C55BE',
  },
  addSubtaskButton: {
    backgroundColor: '#CEE476',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubtaskButtonText: {
    fontSize: 24,
    color: '#6C55BE',
    fontWeight: 'bold',
  },
  modalSubtasksList: {
    marginBottom: 12,
    gap: 6,
  },
  modalSubtaskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSubtaskText: {
    fontSize: 14,
    color: '#6C55BE',
    flex: 1,
  },
  removeSubtaskButton: {
    fontSize: 18,
    color: '#8B7BA8',
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  datePickerButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#CEE476',
  },
  datePickerDoneButton: {
    backgroundColor: '#CEE476',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  datePickerDoneText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '700',
  },
  clearDateButton: {
    backgroundColor: '#6C55BE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearDateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confettiTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    pointerEvents: 'none',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: 'none',
  },
});