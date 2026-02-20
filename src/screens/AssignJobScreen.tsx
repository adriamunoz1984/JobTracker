// src/screens/AssignJobScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Divider, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { 
  getFirestore, 
  collection, 
  getDocs,
  doc,
  setDoc
} from 'firebase/firestore';

const db = getFirestore();

export default function AssignJobScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Job basic info (required for assignment)
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Load active employees
  useEffect(() => {
    loadEmployees();
  }, [user?.uid]);

  const loadEmployees = async () => {
    if (!user?.uid) return;

    try {
      const employeesRef = collection(db, 'users', user.uid, 'employees');
      const snapshot = await getDocs(employeesRef);
      
      const activeEmployees = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Employee))
        .filter(emp => emp.status === 'active');
      
      setEmployees(activeEmployees);
      
      if (activeEmployees.length > 0) {
        setSelectedEmployee(activeEmployees[0].uid);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleAssignJob = async () => {
  // Validate required fields
  if (!address.trim() || !city.trim()) {
    Alert.alert('Missing Information', 'Please enter at least the address and city');
    return;
  }

  if (!selectedEmployee) {
    Alert.alert('No Employee Selected', 'Please select an employee to assign this job to');
    return;
  }

  try {
    setIsLoading(true);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Create incomplete job - remove undefined fields
    const jobData: any = {
      id: jobId,
      date: date.toISOString(),
      address: address.trim(),
      city: city.trim(),
      
      // These will be filled in by employee after completion
      yards: 0,
      amount: 0,
      isPaid: false,
      isPaidToMe: false,
      paymentMethod: 'Cash',
      
      // Assignment info
      ownerId: user!.uid,
      assignedTo: selectedEmployee,
      jobType: 'owner',
      status: 'pending',
      
      createdAt: now,
      updatedAt: now,
    };

    // Only add optional fields if they have values
    if (companyName.trim()) {
      jobData.companyName = companyName.trim();
    }
    
    if (notes.trim()) {
      jobData.notes = notes.trim();
    }

    // Save to employee's ownerJobs collection
    const selectedEmp = employees.find(e => e.uid === selectedEmployee);
    await setDoc(
      doc(db, 'users', selectedEmployee, 'ownerJobs', jobId),
      jobData
    );

    Alert.alert(
      'Job Assigned!',
      `Job assigned to ${selectedEmp?.name}. They can accept and complete it from their app.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  } catch (error) {
    console.error('Error assigning job:', error);
    Alert.alert('Error', 'Failed to assign job. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  if (user?.role !== 'owner') {
    return (
      <View style={styles.container}>
        <Text>Only business owners can assign jobs.</Text>
      </View>
    );
  }

  if (employees.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Active Employees</Text>
          <Text style={styles.emptyText}>
            You need to invite and have at least one active employee before you can assign jobs.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EmployeeManagement' as never)}
            style={styles.manageButton}
          >
            Manage Employees
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>Assign Job to Employee</Text>
        <Text style={styles.subtitle}>
          Create a job assignment. The employee will add yards and payment details after completing the work.
        </Text>

        <Divider style={styles.divider} />

        {/* Employee Selection */}
        <Text style={styles.label}>Assign To:</Text>
        {employees.map((employee) => (
          <List.Item
            key={employee.uid}
            title={employee.name}
            description={employee.email}
            left={props => (
              <List.Icon 
                {...props} 
                icon={selectedEmployee === employee.uid ? "radiobox-marked" : "radiobox-blank"} 
              />
            )}
            onPress={() => setSelectedEmployee(employee.uid)}
            style={[
              styles.employeeItem,
              selectedEmployee === employee.uid && styles.selectedEmployee
            ]}
          />
        ))}

        <Divider style={styles.divider} />

        {/* Date Picker */}
        <Text style={styles.dateLabel}>Job Date: {format(date, 'MMMM dd, yyyy')}</Text>
        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
        >
          Change Date
        </Button>
        
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Job Details */}
        <TextInput
          label="Company Name (Optional)"
          value={companyName}
          onChangeText={setCompanyName}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Job Address *"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          mode="outlined"
          required
        />
        
        <TextInput
          label="City *"
          value={city}
          onChangeText={setCity}
          style={styles.input}
          mode="outlined"
          required
        />

        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.infoText}>
          ℹ️ The employee will add yards, amount, and payment details after completing the job.
        </Text>

        {/* Submit Button */}
        <Button 
          mode="contained" 
          onPress={handleAssignJob} 
          style={styles.submitButton}
          loading={isLoading}
          disabled={isLoading}
        >
          Assign Job
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inputContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  manageButton: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  employeeItem: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedEmployee: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dateButton: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});