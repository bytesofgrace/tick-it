import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

interface Person {
  id: string;
  name: string;
  amount: string;
}

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  people: Person[];
  dueDate?: Date;
  description: string;
  priority: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export default function ExpenseScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [people, setPeople] = useState<Person[]>([{ id: '1', name: '', amount: '' }]);
  const { currentUser } = useAuth();

  const motivationalPhrases = [
    "Chase every expense - your wallet will thank you!",
    "Small expenses add up - keep chasing them down!",
    "Track wisely, spend smartly, chase more!",
    "Every expense chased is money saved.",
    "Stay on the chase - your finances depend on it!"
  ];

  const [randomPhrase] = useState(() => 
    motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)]
  );

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const expensesData: Expense[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          expensesData.push({
            id: doc.id,
            title: data.title,
            totalAmount: data.totalAmount,
            people: data.people || [],
            dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
            description: data.description,
            priority: data.priority || false,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            userId: data.userId,
          });
        });
        
        // Sort by priority first, then by creation date
        expensesData.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority ? 1 : -1;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        setExpenses(expensesData);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore query error:', error);
        setLoading(false);
        setExpenses([]);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addPerson = () => {
    const newId = (people.length + 1).toString();
    setPeople([...people, { id: newId, name: '', amount: '' }]);
  };

  const removePerson = (id: string) => {
    if (people.length > 1) {
      setPeople(people.filter(person => person.id !== id));
    }
  };

  const updatePerson = (id: string, field: 'name' | 'amount', value: string) => {
    setPeople(people.map(person => 
      person.id === id ? { ...person, [field]: value } : person
    ));
  };

  const splitAmountEqually = () => {
    if (!totalAmount.trim() || people.length === 0) return;
    
    const total = parseFloat(totalAmount);
    if (isNaN(total)) return;
    
    const amountPerPerson = (total / people.length).toFixed(2);
    setPeople(people.map(person => ({ ...person, amount: amountPerPerson })));
  };

  const openAddModal = () => {
    setTitle('');
    setTotalAmount('');
    setDescription('');
    setDueDate(null);
    setPeople([{ id: '1', name: '', amount: '' }]);
    setShowDatePicker(false);
    setEditingExpense(null);
    setModalVisible(true);
  };

  const openEditModal = (expense: Expense) => {
    setTitle(expense.title);
    setTotalAmount(expense.totalAmount.toString());
    setDescription(expense.description || '');
    setDueDate(expense.dueDate || null);
    setPeople(expense.people.length > 0 ? expense.people : [{ id: '1', name: '', amount: '' }]);
    setShowDatePicker(false);
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleTogglePriority = async (id: string, priority: boolean) => {
    try {
      await updateDoc(doc(db, 'expenses', id), {
        priority,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const handleAddExpense = async () => {
    if (!title.trim() || !totalAmount.trim()) {
      Alert.alert('Error', 'Please enter expense title and total amount');
      return;
    }

    const validPeople = people.filter(person => person.name.trim());
    if (validPeople.length === 0) {
      Alert.alert('Error', 'Please add at least one person who owes money');
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        title: title.trim(),
        totalAmount: parseFloat(totalAmount),
        people: validPeople,
        dueDate: dueDate || null,
        description: description.trim(),
        priority: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser?.uid,
      });
      setTitle('');
      setTotalAmount('');
      setDescription('');
      setDueDate(null);
      setPeople([{ id: '1', name: '', amount: '' }]);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleEditExpense = async () => {
    if (!title.trim() || !totalAmount.trim() || !editingExpense) {
      Alert.alert('Error', 'Please enter expense title and total amount');
      return;
    }

    const validPeople = people.filter(person => person.name.trim());
    if (validPeople.length === 0) {
      Alert.alert('Error', 'Please add at least one person who owes money');
      return;
    }

    try {
      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        title: title.trim(),
        totalAmount: parseFloat(totalAmount),
        people: validPeople,
        dueDate: dueDate || null,
        description: description.trim(),
        updatedAt: new Date(),
      });
      setTitle('');
      setTotalAmount('');
      setDescription('');
      setDueDate(null);
      setPeople([{ id: '1', name: '', amount: '' }]);
      setEditingExpense(null);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'expenses', id));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
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

  // Calculate total amount owed to user
  const totalOwedAmount = expenses.reduce((sum, expense) => 
    sum + expense.people.reduce((peopleSum, person) => 
      peopleSum + (parseFloat(person.amount) || 0), 0
    ), 0
  );

  // Calculate this month's expenses
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.createdAt);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, expense) => sum + expense.totalAmount, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your expenses...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense-It</Text>
          <Text style={styles.motivationalText}>{randomPhrase}</Text>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>${Math.round(thisMonthExpenses)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>${Math.round(totalOwedAmount)}</Text>
              <Text style={styles.statLabel}>Left to Receive</Text>
            </View>
          </View>

          <FlatList
            data={expenses}
            renderItem={({ item }) => (
              <View style={[styles.expenseItem, item.priority && styles.expenseItemPriority]}>
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseMainInfo}>
                    <Text style={styles.expenseTitle}>{item.title}</Text>
                    <Text style={styles.expenseAmount}>${item.totalAmount.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleTogglePriority(item.id, !item.priority)} 
                    style={[styles.priorityButton, item.priority && styles.priorityButtonActive]}
                  >
                    <Text style={[styles.priorityButtonText, item.priority && styles.priorityButtonTextActive]}>
                      {item.priority ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {item.description && (
                  <Text style={styles.expenseDescription}>{item.description}</Text>
                )}
                <View style={styles.expensePeople}>
                  {item.people.map((person, index) => (
                    <Text key={index} style={styles.personText}>
                      {person.name}: ${person.amount}
                    </Text>
                  ))}
                </View>
                {item.dueDate && (
                  <Text style={styles.dueDateText}>
                    📅 Due {item.dueDate.toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.expenseActions}>
                  <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExpense(item.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            style={styles.expenseList}
            contentContainerStyle={expenses.length === 0 ? styles.emptyListContainer : undefined}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No expenses to chase yet!</Text>
                <Text style={styles.emptyDescription}>Add one and start tracking your spending</Text>
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
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Expense title"
                    placeholderTextColor="#8B7BA8"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Total amount ($)"
                    placeholderTextColor="#8B7BA8"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                    keyboardType="numeric"
                  />

                  <Text style={styles.sectionLabel}>Who owes you money?</Text>
                  
                  {people.map((person, index) => (
                    <View key={person.id} style={styles.personContainer}>
                      <TextInput
                        style={[styles.modalInput, styles.personNameInput]}
                        placeholder="Name"
                        placeholderTextColor="#8B7BA8"
                        value={person.name}
                        onChangeText={(value) => updatePerson(person.id, 'name', value)}
                      />
                      <TextInput
                        style={[styles.modalInput, styles.personAmountInput]}
                        placeholder="Amount"
                        placeholderTextColor="#8B7BA8"
                        value={person.amount}
                        onChangeText={(value) => updatePerson(person.id, 'amount', value)}
                        keyboardType="numeric"
                      />
                      {people.length > 1 && (
                        <TouchableOpacity 
                          onPress={() => removePerson(person.id)}
                          style={styles.removePersonButton}
                        >
                          <Text style={styles.removePersonText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <View style={styles.personActions}>
                    <TouchableOpacity onPress={addPerson} style={styles.addPersonButton}>
                      <Text style={styles.addPersonText}>+ Add Person</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={splitAmountEqually} style={styles.splitButton}>
                      <Text style={styles.splitButtonText}>Split Equally</Text>
                    </TouchableOpacity>
                  </View>

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

                  <TextInput
                    style={[styles.modalInput, styles.descriptionInput]}
                    placeholder="Description"
                    placeholderTextColor="#8B7BA8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />

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
                      onPress={editingExpense ? handleEditExpense : handleAddExpense}
                    >
                      <Text style={styles.saveButtonText}>
                        {editingExpense ? 'Save' : 'Add'}
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
  container: {
    flex: 1,
    backgroundColor: '#6C55BE',
  },
  header: {
    backgroundColor: '#6C55BE',
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CEE476',
    marginBottom: 8,
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
    paddingBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
    borderWidth: 2,
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
  expenseList: {
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
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CEE476',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CEE476',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#6C55BE',
    fontSize: 32,
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 8,
    marginTop: 8,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  personNameInput: {
    flex: 2,
    marginRight: 8,
    marginBottom: 0,
  },
  personAmountInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  removePersonButton: {
    backgroundColor: '#EF4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePersonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  personActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addPersonButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CEE476',
  },
  addPersonText: {
    color: '#6C55BE',
    fontSize: 14,
    fontWeight: '600',
  },
  splitButton: {
    backgroundColor: '#CEE476',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  splitButtonText: {
    color: '#6C55BE',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerButtonText: {
    color: '#6C55BE',
    fontSize: 16,
    fontWeight: '600',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  clearDateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  datePickerDoneButton: {
    backgroundColor: '#CEE476',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#6C55BE',
    fontSize: 14,
    fontWeight: '600',
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
  expenseItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#CEE476',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expenseItemPriority: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#CEE476',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseMainInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
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
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C55BE',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C55BE',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#6C55BE',
    marginBottom: 8,
  },
  expensePeople: {
    marginBottom: 8,
  },
  personText: {
    fontSize: 12,
    color: '#8B7BA8',
    marginBottom: 2,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6C55BE',
    fontWeight: '600',
    marginBottom: 8,
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
});
