import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Plus, Users } from 'lucide-react-native';
import SimplifiedDashboard from '../../src/components/SimplifiedDashboard';
import IncomeSourceCRUD from '../../src/components/IncomeSourceCRUD';
import FixedExpenseCRUD from '../../src/components/FixedExpenseCRUD';
import { IncomeSource, FixedExpense, Payment, PaymentStatus } from '../../src/types-new';
import { NewStackdService } from '../../src/services/newStackdService';
import { useAuth } from '../../src/context/AuthContext';
import { useApp } from '../../src/context/AppContext';

type ViewType = 'dashboard' | 'income' | 'expenses' | 'settings';

export default function NewStackdIntegrated() {
  const { user } = useAuth();
  const { profile, household } = useApp();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  
  // Real Supabase data state
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const householdId = profile?.householdId || household?.id || 'temp';
  const userId = user?.id || 'temp';

  // Load data from Supabase
  useEffect(() => {
    if (householdId && householdId !== 'temp') {
      loadAllData();
    }
  }, [householdId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [sourcesData, expensesData, paymentsData] = await Promise.all([
        NewStackdService.getIncomeSources(householdId),
        NewStackdService.getFixedExpenses(householdId),
        NewStackdService.getPayments(householdId)
      ]);

      setIncomeSources(sourcesData);
      setFixedExpenses(expensesData);
      setPayments(paymentsData);
      
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations for Income Sources
  const createIncomeSource = async (sourceData: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSource = await NewStackdService.createIncomeSource({
        ...sourceData,
        householdId,
        createdBy: userId,
      });
      setIncomeSources(prev => [newSource, ...prev]);
    } catch (error) {
      console.error('Failed to create income source:', error);
      Alert.alert('Error', 'Failed to create income source');
    }
  };

  const updateIncomeSource = async (id: string, updates: Partial<IncomeSource>) => {
    try {
      const updatedSource = await NewStackdService.updateIncomeSource(id, updates);
      setIncomeSources(prev => prev.map(source => 
        source.id === id ? updatedSource : source
      ));
    } catch (error) {
      console.error('Failed to update income source:', error);
      Alert.alert('Error', 'Failed to update income source');
    }
  };

  const deleteIncomeSource = async (id: string) => {
    try {
      await NewStackdService.deleteIncomeSource(id);
      setIncomeSources(prev => prev.filter(source => source.id !== id));
    } catch (error) {
      console.error('Failed to delete income source:', error);
      Alert.alert('Error', 'Failed to delete income source');
    }
  };

  // CRUD Operations for Fixed Expenses
  const createFixedExpense = async (expenseData: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newExpense = await NewStackdService.createFixedExpense({
        ...expenseData,
        householdId,
        createdBy: userId,
      });
      setFixedExpenses(prev => [newExpense, ...prev]);
      
      // Generate initial payment for this expense
      await NewStackdService.generatePaymentsForExpense(newExpense.id, householdId);
      
      // Reload payments to show the new one
      const updatedPayments = await NewStackdService.getPayments(householdId);
      setPayments(updatedPayments);
      
    } catch (error) {
      console.error('Failed to create fixed expense:', error);
      Alert.alert('Error', 'Failed to create fixed expense');
    }
  };

  const updateFixedExpense = async (id: string, updates: Partial<FixedExpense>) => {
    try {
      const updatedExpense = await NewStackdService.updateFixedExpense(id, updates);
      setFixedExpenses(prev => prev.map(expense => 
        expense.id === id ? updatedExpense : expense
      ));
    } catch (error) {
      console.error('Failed to update fixed expense:', error);
      Alert.alert('Error', 'Failed to update fixed expense');
    }
  };

  const deleteFixedExpense = async (id: string) => {
    try {
      await NewStackdService.deleteFixedExpense(id);
      setFixedExpenses(prev => prev.filter(expense => expense.id !== id));
      // Remove associated payments
      setPayments(prev => prev.filter(payment => payment.expenseId !== id));
    } catch (error) {
      console.error('Failed to delete fixed expense:', error);
      Alert.alert('Error', 'Failed to delete fixed expense');
    }
  };

  // Payment Operations
  const markPayment = async (paymentId: string, status: PaymentStatus) => {
    try {
      const updatedPayment = await NewStackdService.updatePaymentStatus(paymentId, status, userId);
      setPayments(prev => prev.map(payment => 
        payment.id === paymentId ? updatedPayment : payment
      ));
    } catch (error) {
      console.error('Failed to update payment:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
        {currentView === 'dashboard' ? 'New Stackd' :
         currentView === 'income' ? 'Income Sources' :
         currentView === 'expenses' ? 'Fixed Expenses' : 'Settings'}
      </Text>
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {currentView === 'dashboard' && (
          <>
            <TouchableOpacity
              style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10 }}
              onPress={() => setCurrentView('income')}
            >
              <Plus size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10 }}
              onPress={() => setCurrentView('expenses')}
            >
              <Plus size={20} color="#ff6b6b" />
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity
          style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10 }}
          onPress={() => setCurrentView('settings')}
        >
          <Settings size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBottomNav = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: '#1a1a1a', 
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: '#333',
    }}>
      <TouchableOpacity
        style={{ 
          flex: 1, 
          alignItems: 'center', 
          paddingVertical: 8,
          backgroundColor: currentView === 'dashboard' ? '#333' : 'transparent',
          borderRadius: 8,
        }}
        onPress={() => setCurrentView('dashboard')}
      >
        <Text style={{ color: currentView === 'dashboard' ? '#4CAF50' : '#ccc', fontSize: 12, fontWeight: '600' }}>
          Dashboard
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{ 
          flex: 1, 
          alignItems: 'center', 
          paddingVertical: 8,
          backgroundColor: currentView === 'income' ? '#333' : 'transparent',
          borderRadius: 8,
        }}
        onPress={() => setCurrentView('income')}
      >
        <Text style={{ color: currentView === 'income' ? '#4CAF50' : '#ccc', fontSize: 12, fontWeight: '600' }}>
          Income
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{ 
          flex: 1, 
          alignItems: 'center', 
          paddingVertical: 8,
          backgroundColor: currentView === 'expenses' ? '#333' : 'transparent',
          borderRadius: 8,
        }}
        onPress={() => setCurrentView('expenses')}
      >
        <Text style={{ color: currentView === 'expenses' ? '#ff6b6b' : '#ccc', fontSize: 12, fontWeight: '600' }}>
          Bills
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 24 }}>Settings</Text>
      
      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>View Mode</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: viewMode === 'weekly' ? '#4CAF50' : '#2a2a2a',
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
            }}
            onPress={() => setViewMode('weekly')}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: viewMode === 'monthly' ? '#4CAF50' : '#2a2a2a',
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
            }}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Monthly</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Users size={20} color="#4CAF50" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Household</Text>
        </View>
        <Text style={{ color: '#ccc', fontSize: 14 }}>
          {household?.name || 'Shared household'}
        </Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
          ID: {householdId}
        </Text>
      </View>

      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Database</Text>
        <Text style={{ color: '#ccc', fontSize: 14 }}>
          Connected to: rdptbefetmtjuxtgxlxd.supabase.co
        </Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
          {incomeSources.length} income sources, {fixedExpenses.length} bills, {payments.length} payments
        </Text>
        <TouchableOpacity
          style={{ marginTop: 12, backgroundColor: '#4CAF50', borderRadius: 8, padding: 8, alignItems: 'center' }}
          onPress={loadAllData}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Refresh Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Loading Stackd...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {renderHeader()}
      
      <View style={{ flex: 1 }}>
        {currentView === 'dashboard' && (
          <SimplifiedDashboard
            incomeSources={incomeSources}
            fixedExpenses={fixedExpenses}
            payments={payments}
            onMarkPayment={markPayment}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            householdId={householdId}
          />
        )}
        
        {currentView === 'income' && (
          <View style={{ flex: 1, padding: 16 }}>
            <IncomeSourceCRUD
              incomeSources={incomeSources}
              onCreateSource={createIncomeSource}
              onUpdateSource={updateIncomeSource}
              onDeleteSource={deleteIncomeSource}
              householdId={householdId}
              userId={userId}
            />
          </View>
        )}
        
        {currentView === 'expenses' && (
          <View style={{ flex: 1, padding: 16 }}>
            <FixedExpenseCRUD
              fixedExpenses={fixedExpenses}
              onCreateExpense={createFixedExpense}
              onUpdateExpense={updateFixedExpense}
              onDeleteExpense={deleteFixedExpense}
              householdId={householdId}
              userId={userId}
            />
          </View>
        )}
        
        {currentView === 'settings' && renderSettings()}
      </View>
      
      {renderBottomNav()}
    </SafeAreaView>
  );
}