import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Plus, Users } from 'lucide-react-native';
import SimplifiedDashboard from '../../src/components/SimplifiedDashboard';
import IncomeSourceCRUD from '../../src/components/IncomeSourceCRUD';
import FixedExpenseCRUD from '../../src/components/FixedExpenseCRUD';
import { IncomeSource, FixedExpense, Payment, PaymentStatus } from '../../src/types-new';
import { useAuth } from '../../src/context/AuthContext';
import { useApp } from '../../src/context/AppContext';

type ViewType = 'dashboard' | 'income' | 'expenses' | 'settings';

export default function NewStackd() {
  const { user } = useAuth();
  const { profile } = useApp();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  
  // Mock data - replace with actual Supabase calls
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const householdId = profile?.householdId || 'default';

  // CRUD Operations for Income Sources
  const createIncomeSource = async (sourceData: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>) => {
    // TODO: Replace with actual Supabase call
    const newSource: IncomeSource = {
      ...sourceData,
      id: Math.random().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIncomeSources(prev => [...prev, newSource]);
  };

  const updateIncomeSource = async (id: string, updates: Partial<IncomeSource>) => {
    // TODO: Replace with actual Supabase call
    setIncomeSources(prev => prev.map(source => 
      source.id === id ? { ...source, ...updates, updatedAt: new Date().toISOString() } : source
    ));
  };

  const deleteIncomeSource = async (id: string) => {
    // TODO: Replace with actual Supabase call
    setIncomeSources(prev => prev.filter(source => source.id !== id));
  };

  // CRUD Operations for Fixed Expenses
  const createFixedExpense = async (expenseData: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    // TODO: Replace with actual Supabase call
    const newExpense: FixedExpense = {
      ...expenseData,
      id: Math.random().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFixedExpenses(prev => [...prev, newExpense]);
    
    // Generate payments for this expense
    generatePaymentsForExpense(newExpense);
  };

  const updateFixedExpense = async (id: string, updates: Partial<FixedExpense>) => {
    // TODO: Replace with actual Supabase call
    setFixedExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, ...updates, updatedAt: new Date().toISOString() } : expense
    ));
  };

  const deleteFixedExpense = async (id: string) => {
    // TODO: Replace with actual Supabase call
    setFixedExpenses(prev => prev.filter(expense => expense.id !== id));
    setPayments(prev => prev.filter(payment => payment.expenseId !== id));
  };

  // Payment Operations
  const markPayment = async (paymentId: string, status: PaymentStatus) => {
    // TODO: Replace with actual Supabase call
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId ? { 
        ...payment, 
        status, 
        paidDate: status === 'paid' ? new Date().toISOString() : undefined,
        paidBy: status === 'paid' ? user?.id : undefined,
      } : payment
    ));
  };

  // Generate payments for the current period
  const generatePaymentsForExpense = (expense: FixedExpense) => {
    // TODO: Generate proper payment schedule based on frequency and due dates
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), expense.dueDay);
    
    if (dueDate < now) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const newPayment: Payment = {
      id: Math.random().toString(),
      expenseId: expense.id,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: expense.amount,
      status: expense.autoDeducted ? 'auto-paid' : 'pending',
      householdId: expense.householdId,
      createdAt: new Date().toISOString(),
    };

    setPayments(prev => [...prev, newPayment]);
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
        {currentView === 'dashboard' ? 'Dashboard' :
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

      <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Users size={20} color="#4CAF50" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Household</Text>
        </View>
        <Text style={{ color: '#ccc', fontSize: 14 }}>
          Shared with household members
        </Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
          ID: {householdId}
        </Text>
      </View>
    </View>
  );

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
              userId={user?.id || ''}
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
              userId={user?.id || ''}
            />
          </View>
        )}
        
        {currentView === 'settings' && renderSettings()}
      </View>
      
      {renderBottomNav()}
    </SafeAreaView>
  );
}