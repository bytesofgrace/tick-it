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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiCannon from 'react-native-confetti-cannon';
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
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onTogglePriority: (id: string, priority: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onTogglePriority, onEdit, onDelete }: TodoItemProps) {
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

  const formatDueDate = () => {
    if (!todo.dueDate) return null;
    const due = new Date(todo.dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = due.toDateString() === today.toDateString();
    const isTomorrow = due.toDateString() === tomorrow.toDateString();
    
    if (isToday) return '📅 Due Today';
    if (isTomorrow) return '📅 Due Tomorrow';
    return `📅 Due ${due.toLocaleDateString()}`;
  };

  return (
    <View style={[styles.todoItem, todo.priority && styles.todoItemPriority, getUrgencyStyle()]}>
      <View style={styles.todoHeader}>
        <TouchableOpacity 
          style={styles.todoContent}
          onPress={() => onToggle(todo.id, !todo.completed)}
        >
          <View style={[styles.checkbox, todo.completed && styles.checkboxCompleted]}>
            {todo.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.todoText}>
            <Text style={[styles.todoTitle, todo.completed && styles.todoTitleCompleted]}>
              {todo.title}
            </Text>
            {todo.description && (
              <Text style={[styles.todoDescription, todo.completed && styles.todoDescriptionCompleted]}>
                {todo.description}
              </Text>
            )}
            {todo.dueDate && !todo.completed && (
              <Text style={styles.dueDateText}>{formatDueDate()}</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onTogglePriority(todo.id, !todo.priority)} 
          style={[styles.priorityButton, todo.priority && styles.priorityButtonActive]}
        >
          <Text style={[styles.priorityButtonText, todo.priority && styles.priorityButtonTextActive]}>
            {todo.priority ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.todoActions}>
        <TouchableOpacity onPress={() => onEdit(todo)} style={styles.editButton}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(todo.id)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<any>(null);
  const { currentUser, logout } = useAuth();

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

  const handleAddTodo = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await addDoc(collection(db, 'todos'), {
        title: title.trim(),
        description: description.trim(),
        completed: false,
        priority: false,
        dueDate: dueDate || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser?.uid,
      });
      setTitle('');
      setDescription('');
      setDueDate(null);
      setModalVisible(false);
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
      await updateDoc(doc(db, 'todos', editingTodo.id), {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        updatedAt: new Date(),
      });
      setTitle('');
      setDescription('');
      setDueDate(null);
      setEditingTodo(null);
      setModalVisible(false);
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
      
      await updateDoc(doc(db, 'todos', id), {
        completed,
        updatedAt: new Date(),
      });
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

  const openAddModal = () => {
    setTitle('');
    setDescription('');
    setDueDate(null);
    setShowDatePicker(false);
    setEditingTodo(null);
    setModalVisible(true);
  };

  const openEditModal = (todo: Todo) => {
    setTitle(todo.title);
    setDescription(todo.description || '');
    setDueDate(todo.dueDate || null);
    setShowDatePicker(false);
    setEditingTodo(todo);
    setModalVisible(true);
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
        <Text style={styles.loadingText}>Loading your todos...</Text>
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
          <Text style={styles.headerTitle}>To Do List</Text>
          <Text style={styles.motivationalText}>{randomPhrase}</Text>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{todos.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{todos.filter(t => !t.completed).length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{todos.filter(t => t.completed).length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
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
                <Text style={styles.emptyTitle}>No tasks to organise yet!</Text>
                <Text style={styles.emptyDescription}>Write one and start ticking</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+</Text>
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
                  <Text style={styles.modalTitle}>
                    {editingTodo ? 'Edit Task' : 'Add New Task'}
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Task title"
                    placeholderTextColor="#8B7BA8"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />

                  <TextInput
                    style={[styles.modalInput, styles.descriptionInput]}
                    placeholder="Description (optional)"
                    placeholderTextColor="#8B7BA8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.sectionLabel}>Due Date</Text>
                  
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {dueDate ? `📅 ${dueDate.toLocaleDateString()}` : '📅 Select Date'}
                    </Text>
                  </TouchableOpacity>

                  {dueDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setDueDate(null)}
                    >
                      <Text style={styles.clearDateText}>Clear Date</Text>
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

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(false);
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
  todoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  priorityButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
    borderWidth: 2,
    borderColor: '#CEE476',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 20,
    textAlign: 'center',
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
    marginTop: 4,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 8,
    marginTop: 8,
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
    backgroundColor: '#EF4444',
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