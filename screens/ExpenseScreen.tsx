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
  Platform,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useNotification } from '../contexts/NotificationContext';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface Person {
  id: string;
  name: string;
  amount: string;
  paid: boolean;
}

interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  people: Person[];
  dueDate?: Date;
  description: string;
  priority: boolean;
  settled: boolean;
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
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [people, setPeople] = useState<Person[]>([{ id: '1', name: '', amount: '', paid: false }]);
  const [draftRestored, setDraftRestored] = useState(false);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { fontScale } = useAccessibility();

  // Auto-save draft to AsyncStorage
  useEffect(() => {
    if (!modalVisible) return;

    const saveDraft = async () => {
      try {
        // Only save if there's actual content and we're not editing an existing expense
        if (!editingExpense && (title.trim() || totalAmount.trim() || description.trim())) {
          const draft = {
            title,
            totalAmount,
            description,
            dueDate: dueDate?.toISOString(),
            dueTime: dueTime?.toISOString(),
            people,
            editingExpenseId: null, // Always null for new expenses
          };
          await AsyncStorage.setItem('@expense_draft', JSON.stringify(draft));
          console.log('💾 Expense draft auto-saved:', { title: title.slice(0, 20), totalAmount, hasDescription: !!description });
        }
      } catch (error) {
        console.error('Failed to save expense draft:', error);
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [title, totalAmount, description, dueDate, dueTime, people, modalVisible, editingExpense]);

  // Clear draft after successful save
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem('@expense_draft');
      setDraftRestored(false);
      console.log('🗑️ Expense draft cleared');
    } catch (error) {
      console.error('Failed to clear expense draft:', error);
    }
  };

  // Dynamic styles based on font scale
  const dynamicStyles = {
    headerTitle: { fontSize: 28 * fontScale },
    motivationalText: { fontSize: 14 * fontScale },
    statNumber: { fontSize: 24 * fontScale },
    statLabel: { fontSize: 12 * fontScale },
    emptyTitle: { fontSize: 20 * fontScale },
    emptyDescription: { fontSize: 14 * fontScale },
    checkmark: { fontSize: 32 * fontScale },
    expenseTitle: { fontSize: 20 * fontScale },
    expenseTotal: { fontSize: 16 * fontScale },
    expenseDescription: { fontSize: 14 * fontScale },
    personName: { fontSize: 16 * fontScale },
    personAmount: { fontSize: 14 * fontScale },
    dueDateText: { fontSize: 12 * fontScale },
    editButtonText: { fontSize: 24 * fontScale },
    deleteButtonText: { fontSize: 24 * fontScale },
    addButtonText: { fontSize: 24 * fontScale },
    modalTitle: { fontSize: 20 * fontScale },
    modalInput: { fontSize: 16 * fontScale },
    sectionTitle: { fontSize: 18 * fontScale },
    splitAmountText: { fontSize: 16 * fontScale },
    totalSplitText: { fontSize: 14 * fontScale },
    cancelButtonText: { fontSize: 16 * fontScale },
    saveButtonText: { fontSize: 16 * fontScale },
    datePickerButtonText: { fontSize: 16 * fontScale },
    clearDateText: { fontSize: 14 * fontScale },
    datePickerDoneText: { fontSize: 16 * fontScale },
  };

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
            settled: data.settled || false,
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

        // Check for urgent expenses
        checkForUrgentExpenses(expensesData);
      },
      (error) => {
        console.error('Firestore query error:', error);
        setLoading(false);
        setExpenses([]);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Check for urgent expenses and show notifications
  const checkForUrgentExpenses = (expensesList: Expense[]) => {
    const now = new Date();
    const unsettledExpenses = expensesList.filter(e => !e.settled && e.dueDate);

    // Check for overdue expenses
    const overdueExpenses = unsettledExpenses.filter(e => {
      const due = new Date(e.dueDate!);
      return due < now;
    });

    // Check for expenses due within 24 hours
    const urgentExpenses = unsettledExpenses.filter(e => {
      const due = new Date(e.dueDate!);
      const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });

    // Show notifications
    if (overdueExpenses.length > 0) {
      showNotification(
        '💰 Overdue Expenses',
        `${overdueExpenses.length} expense${overdueExpenses.length > 1 ? 's' : ''} past due date!`,
        'error'
      );
    } else if (urgentExpenses.length > 0) {
      showNotification(
        '💸 Upcoming Expenses',
        `${urgentExpenses.length} expense${urgentExpenses.length > 1 ? 's' : ''} due within 24 hours!`,
        'warning'
      );
    }
  };

  const addPerson = () => {
    const newId = (people.length + 1).toString();
    setPeople([...people, { id: newId, name: '', amount: '', paid: false }]);
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(person => person.id !== id));
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

  const openAddModal = async () => {
    // Check if there's a draft
    try {
      const draftJson = await AsyncStorage.getItem('@expense_draft');
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        // Only show restore option if it's not an edit draft and has meaningful content
        const hasContent = (draft.title && draft.title.trim()) || 
                          (draft.totalAmount && draft.totalAmount.trim()) || 
                          (draft.description && draft.description.trim());
        
        console.log('🔍 Expense draft check:', { 
          editingExpenseId: draft.editingExpenseId, 
          title: draft.title?.slice(0, 20), 
          totalAmount: draft.totalAmount,
          description: draft.description?.slice(0, 20),
          hasContent 
        });
        
        if (!draft.editingExpenseId && hasContent) {
          Alert.alert(
            'Draft Found',
            'You have an unsaved expense draft. Would you like to restore it?',
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  clearDraft();
                  setTitle('');
                  setTotalAmount('');
                  setDescription('');
                  setDueDate(null);
                  setDueTime(null);
                  setPeople([{ id: '1', name: '', amount: '', paid: false }]);
                  setShowDatePicker(false);
                  setEditingExpense(null);
                  setModalVisible(true);
                }
              },
              {
                text: 'Restore',
                onPress: () => {
                  setTitle(draft.title || '');
                  setTotalAmount(draft.totalAmount || '');
                  setDescription(draft.description || '');
                  setDueDate(draft.dueDate ? new Date(draft.dueDate) : null);
                  setDueTime(draft.dueTime ? new Date(draft.dueTime) : null);
                  setPeople(draft.people || [{ id: '1', name: '', amount: '', paid: false }]);
                  setShowDatePicker(false);
                  setEditingExpense(null);
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
      console.error('Failed to check for expense draft:', error);
    }

    setTitle('');
    setTotalAmount('');
    setDescription('');
    setDueDate(null);
    setDueTime(null);
    setPeople([{ id: '1', name: '', amount: '', paid: false }]);
    setShowDatePicker(false);
    setEditingExpense(null);
    setDraftRestored(false);
    setModalVisible(true);
  };

  const openEditModal = (expense: Expense) => {
    setTitle(expense.title);
    setTotalAmount(expense.totalAmount.toString());
    setDescription(expense.description || '');
    setDueDate(expense.dueDate || null);
    // Extract time from dueDate if it exists
    if (expense.dueDate) {
      const hasTime = expense.dueDate.getHours() !== 0 || expense.dueDate.getMinutes() !== 0;
      if (hasTime) {
        setDueTime(expense.dueDate);
      } else {
        setDueTime(null);
      }
    } else {
      setDueTime(null);
    }
    // Ensure all people have paid property
    const peopleWithPaid = expense.people.map(person => ({
      ...person,
      paid: person.paid !== undefined ? person.paid : false
    }));
    setPeople(peopleWithPaid.length > 0 ? peopleWithPaid : [{ id: '1', name: '', amount: '', paid: false }]);
    setShowDatePicker(false);
    setShowTimePicker(false);
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

  const handleTogglePayerPaid = async (expenseId: string, expense: Expense, payerId: string) => {
    try {
      const updatedPeople = expense.people.map(person => 
        person.id === payerId 
          ? { ...person, paid: !person.paid }
          : person
      );
      
      // Check if all payers have paid
      const allPaid = updatedPeople.every(person => person.paid);
      
      await updateDoc(doc(db, 'expenses', expenseId), {
        people: updatedPeople,
        settled: allPaid,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const handleToggleSettled = async (id: string, settled: boolean, expense: Expense) => {
    try {
      // When toggling the main checkbox, update all people's paid status
      const updatedPeople = expense.people.map(person => ({
        ...person,
        paid: settled
      }));
      
      await updateDoc(doc(db, 'expenses', id), {
        settled,
        people: updatedPeople,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update settled status');
    }
  };

  const handleAddExpense = async () => {
    if (!title.trim() || !totalAmount.trim()) {
      Alert.alert('Error', 'Please enter expense title and total amount');
      return;
    }

    const validPeople = people.filter(person => person.name.trim());

    try {
      // Combine date and time if both are set
      let finalDueDate = dueDate;
      if (dueDate && dueTime) {
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      }

      await addDoc(collection(db, 'expenses'), {
        title: title.trim(),
        totalAmount: parseFloat(totalAmount),
        people: validPeople,
        dueDate: finalDueDate || null,
        description: description.trim(),
        priority: false,
        settled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser?.uid,
      });
      setTitle('');
      setTotalAmount('');
      setDescription('');
      setDueDate(null);
      setDueTime(null);
      setPeople([{ id: '1', name: '', amount: '', paid: false }]);
      setModalVisible(false);
      await clearDraft(); // Clear draft after successful save
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

    try {
      // Combine date and time if both are set
      let finalDueDate = dueDate;
      if (dueDate && dueTime) {
        finalDueDate = new Date(dueDate);
        finalDueDate.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      }

      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        title: title.trim(),
        totalAmount: parseFloat(totalAmount),
        people: validPeople,
        dueDate: finalDueDate || null,
        description: description.trim(),
        updatedAt: new Date(),
      });
      setTitle('');
      setTotalAmount('');
      setDescription('');
      setDueDate(null);
      setDueTime(null);
      setPeople([{ id: '1', name: '', amount: '', paid: false }]);
      setEditingExpense(null);
      setModalVisible(false);
      await clearDraft(); // Clear draft after successful save
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
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Expense-It</Text>
          <Text style={[styles.motivationalText, dynamicStyles.motivationalText]}>{randomPhrase}</Text>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, dynamicStyles.statNumber]}>${Math.round(thisMonthExpenses)}</Text>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Spent This Month</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, dynamicStyles.statNumber]}>${Math.round(totalOwedAmount)}</Text>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Left to Receive</Text>
            </View>
          </View>

          <FlatList
            data={expenses}
            renderItem={({ item }) => (
              <View style={[styles.expenseItem, item.priority && styles.expenseItemPriority]}>
                <TouchableOpacity 
                  onPress={() => handleTogglePriority(item.id, !item.priority)} 
                  style={[styles.priorityButton, item.priority && styles.priorityButtonActive]}
                >
                  <Text style={[styles.priorityButtonText, item.priority && styles.priorityButtonTextActive, { fontSize: 20 * fontScale }]}>
                    {item.priority ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.expenseHeader}>
                  <TouchableOpacity 
                    style={styles.expenseContent}
                    onPress={() => handleToggleSettled(item.id, !item.settled, item)}
                  >
                    <View style={[styles.checkbox, item.settled && styles.checkboxSettled]}>
                      {item.settled && <Text style={[styles.checkmark, dynamicStyles.checkmark]}>✓</Text>}
                    </View>
                    <View style={styles.expenseTextContainer}>
                      <Text style={[styles.expenseTitle, item.settled && styles.expenseTitleSettled, dynamicStyles.expenseTitle]}>{item.title}</Text>
                      <Text style={[styles.expenseAmount, item.settled && styles.expenseAmountSettled, dynamicStyles.expenseTotal]}>${item.totalAmount.toFixed(2)}</Text>
                      {item.description && (
                        <Text style={[styles.expenseDescription, item.settled && styles.expenseDescriptionSettled, dynamicStyles.expenseDescription]}>{item.description}</Text>
                      )}
                      <View style={styles.expensePeople}>
                        {item.people.map((person, index) => (
                          <View key={index} style={styles.personRowWithCheckbox}>
                            <Text style={[styles.personText, person.paid && styles.personTextPaid, dynamicStyles.personAmount]}>
                              {person.name}: ${person.amount}
                            </Text>
                            <TouchableOpacity 
                              onPress={() => handleTogglePayerPaid(item.id, item, person.id)}
                              style={styles.personCheckboxButton}
                            >
                              <View style={[styles.personCheckbox, person.paid && styles.checkboxSettled]}>
                                {person.paid && <Text style={{ fontSize: 14 * fontScale }}>✓</Text>}
                              </View>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.expenseActions}>
                  <View style={styles.actionButtons}>
                    {item.dueDate && !item.settled && (() => {
                      const due = new Date(item.dueDate);
                      const today = new Date();
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      
                      const isToday = due.toDateString() === today.toDateString();
                      const isTomorrow = due.toDateString() === tomorrow.toDateString();
                      
                      const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0;
                      const timeStr = hasTime ? ` at ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '';
                      
                      let dateStr = '';
                      if (isToday) dateStr = `📅 Due Today${timeStr}`;
                      else if (isTomorrow) dateStr = `📅 Due Tomorrow${timeStr}`;
                      else dateStr = `📅 Due ${due.toLocaleDateString()}${timeStr}`;
                      
                      return <Text style={[styles.dueDateText, dynamicStyles.dueDateText]}>{dateStr}</Text>;
                    })()}
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                      <Text style={[styles.editButtonText, dynamicStyles.editButtonText]}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExpense(item.id)} style={styles.deleteButton}>
                      <Text style={[styles.deleteButtonText, dynamicStyles.deleteButtonText]}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            style={styles.expenseList}
            contentContainerStyle={expenses.length === 0 ? styles.emptyListContainer : undefined}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No expenses to chase yet!</Text>
                <Text style={[styles.emptyDescription, dynamicStyles.emptyDescription]}>Add one and start tracking your spending</Text>
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
                      {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                    </Text>
                    {draftRestored && !editingExpense && (
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
                      placeholder="Expense title"
                      placeholderTextColor="#8B7BA8"
                      value={title}
                      onChangeText={setTitle}
                      autoFocus
                    />

                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    placeholder="Total amount ($)"
                    placeholderTextColor="#8B7BA8"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                    keyboardType="numeric"
                  />

                  <Text style={[styles.sectionLabel, dynamicStyles.sectionTitle]}>Who owes you money?</Text>
                  
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
                      onPress={() => {
                        setDueDate(null);
                        setDueTime(null);
                      }}
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

                  {dueDate && (
                    <>
                      <Text style={styles.sectionLabel}>Due Time</Text>
                      
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.datePickerButtonText}>
                          {dueTime ? `🕐 ${dueTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '🕐 Select Time'}
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

                  <TextInput
                    style={[styles.modalInput, styles.descriptionInput]}
                    placeholder="Description"
                    placeholderTextColor="#8B7BA8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
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
    backgroundColor: '#6C55BE',
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
  datePickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#CEE476',
    alignItems: 'center',
    width: '100%',
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
    marginBottom: 12,
  },
  expenseContent: {
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
  checkboxSettled: {
    backgroundColor: '#CEE476',
  },
  checkmark: {
    color: '#6C55BE',
    fontSize: 24,
    fontWeight: 'bold',
  },
  expenseTextContainer: {
    flex: 1,
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
  expenseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C55BE',
    marginBottom: 4,
  },
  expenseTitleSettled: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C55BE',
    marginBottom: 4,
  },
  expenseAmountSettled: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#6C55BE',
    lineHeight: 20,
    marginBottom: 8,
  },
  expenseDescriptionSettled: {
    textDecorationLine: 'line-through',
    color: '#8B7BA8',
  },
  expensePeople: {
    marginTop: 12,
    marginBottom: 4,
  },
  personRow: {
    marginBottom: 6,
  },
  personRowWithCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingRight: 40,
  },
  personCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8B7BA8',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personCheckmark: {
    fontSize: 16,
    color: '#6C55BE',
    fontWeight: 'bold',
  },
  personText: {
    fontSize: 14,
    color: '#8B7BA8',
  },
  personTextPaid: {
    color: '#B0A3C6',
    textDecorationLine: 'line-through',
  },
  personCheckboxButton: {
    padding: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6C55BE',
    fontWeight: '600',
    marginRight: 8,
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
