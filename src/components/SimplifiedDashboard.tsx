import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Settings, CheckCircle, Circle } from 'lucide-react-native';
import { IncomeSource, FixedExpense, Payment, WeeklyView, MonthlyView, PaymentStatus } from '../types-new';

interface SimplifiedDashboardProps {
  incomeSources: IncomeSource[];
  fixedExpenses: FixedExpense[];
  payments: Payment[];
  onMarkPayment: (paymentId: string, status: PaymentStatus) => Promise<void>;
  viewMode: 'weekly' | 'monthly';
  onViewModeChange: (mode: 'weekly' | 'monthly') => void;
  householdId: string;
}

export default function SimplifiedDashboard({
  incomeSources,
  fixedExpenses,
  payments,
  onMarkPayment,
  viewMode,
  onViewModeChange,
  householdId
}: SimplifiedDashboardProps) {
  const [currentView, setCurrentView] = useState<WeeklyView | MonthlyView | null>(null);

  // Calculate current period's data
  useEffect(() => {
    calculateCurrentPeriod();
  }, [incomeSources, fixedExpenses, payments, viewMode]);

  const calculateCurrentPeriod = () => {
    const now = new Date();
    
    if (viewMode === 'weekly') {
      // Calculate weekly view
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(weekStart);
      
      const weeklyIncome = calculateIncomeForPeriod(weekStart, weekEnd);
      const weeklyExpenses = calculateExpensesForPeriod(weekStart, weekEnd);
      const periodPayments = getPaymentsForPeriod(weekStart, weekEnd);
      
      setCurrentView({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalIncome: weeklyIncome,
        totalFixedExpenses: weeklyExpenses,
        availableAmount: weeklyIncome - weeklyExpenses,
        upcomingPayments: periodPayments.filter(p => p.status === 'pending'),
        overduePayments: periodPayments.filter(p => p.status === 'overdue'),
      } as WeeklyView);
    } else {
      // Calculate monthly view
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthlyIncome = calculateIncomeForPeriod(monthStart, monthEnd);
      const monthlyExpenses = calculateExpensesForPeriod(monthStart, monthEnd);
      const periodPayments = getPaymentsForPeriod(monthStart, monthEnd);
      
      setCurrentView({
        month: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
        totalIncome: monthlyIncome,
        totalFixedExpenses: monthlyExpenses,
        availableAmount: monthlyIncome - monthlyExpenses,
        upcomingPayments: periodPayments.filter(p => p.status === 'pending'),
        overduePayments: periodPayments.filter(p => p.status === 'overdue'),
      } as MonthlyView);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  };

  const calculateIncomeForPeriod = (start: Date, end: Date) => {
    return incomeSources
      .filter(source => source.active)
      .reduce((total, source) => {
        if (viewMode === 'weekly') {
          // Convert all income to weekly amounts
          switch (source.frequency) {
            case 'weekly': return total + source.amount;
            case 'biweekly': return total + (source.amount / 2);
            case 'monthly': return total + (source.amount / 4.33);
            default: return total;
          }
        } else {
          // Convert all income to monthly amounts
          switch (source.frequency) {
            case 'weekly': return total + (source.amount * 4.33);
            case 'biweekly': return total + (source.amount * 2.17);
            case 'monthly': return total + source.amount;
            default: return total;
          }
        }
      }, 0);
  };

  const calculateExpensesForPeriod = (start: Date, end: Date) => {
    return fixedExpenses
      .filter(expense => expense.active)
      .reduce((total, expense) => {
        if (viewMode === 'weekly') {
          // Convert all expenses to weekly amounts
          switch (expense.frequency) {
            case 'weekly': return total + expense.amount;
            case 'monthly': return total + (expense.amount / 4.33);
            case 'yearly': return total + (expense.amount / 52);
            default: return total;
          }
        } else {
          // Convert all expenses to monthly amounts
          switch (expense.frequency) {
            case 'weekly': return total + (expense.amount * 4.33);
            case 'monthly': return total + expense.amount;
            case 'yearly': return total + (expense.amount / 12);
            default: return total;
          }
        }
      }, 0);
  };

  const getPaymentsForPeriod = (start: Date, end: Date) => {
    return payments.filter(payment => {
      const dueDate = new Date(payment.dueDate);
      return dueDate >= start && dueDate <= end;
    });
  };

  const handlePaymentToggle = async (payment: Payment) => {
    const newStatus: PaymentStatus = payment.status === 'paid' ? 'pending' : 'paid';
    try {
      await onMarkPayment(payment.id, newStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const formatPeriod = () => {
    if (!currentView) return '';
    
    if (viewMode === 'weekly' && 'weekStart' in currentView) {
      const start = new Date(currentView.weekStart);
      const end = new Date(currentView.weekEnd);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (viewMode === 'monthly' && 'month' in currentView) {
      const date = new Date(currentView.month + '-01');
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    return '';
  };

  if (!currentView) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const availableAmount = currentView.totalIncome - currentView.totalFixedExpenses;
  const isPositive = availableAmount >= 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Stackd</Text>
        <TouchableOpacity onPress={() => onViewModeChange(viewMode === 'weekly' ? 'monthly' : 'weekly')}>
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#4CAF50" />
            <Text style={{ color: '#fff', fontWeight: '600', textTransform: 'capitalize' }}>{viewMode}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period Header */}
        <Text style={{ color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          {formatPeriod()}
        </Text>

        {/* Income Section */}
        <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <DollarSign size={24} color="#4CAF50" />
            <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: '600' }}>
              {viewMode === 'weekly' ? 'This Week\'s Income' : 'This Month\'s Income'}
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>
            ${currentView.totalIncome.toLocaleString()}
          </Text>
          {incomeSources.filter(s => s.active).length > 0 && (
            <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8 }}>
              {incomeSources.filter(s => s.active).length} income source{incomeSources.filter(s => s.active).length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Fixed Expenses Section */}
        <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <TrendingDown size={24} color="#ff6b6b" />
            <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: '600' }}>
              Fixed Expenses
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>
            ${currentView.totalFixedExpenses.toLocaleString()}
          </Text>
          {fixedExpenses.filter(e => e.active).length > 0 && (
            <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8 }}>
              {fixedExpenses.filter(e => e.active).length} bill{fixedExpenses.filter(e => e.active).length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Available Amount */}
        <View style={{ 
          backgroundColor: isPositive ? '#1a3a1a' : '#3a1a1a', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 24,
          borderWidth: 2,
          borderColor: isPositive ? '#4CAF50' : '#ff6b6b',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <TrendingUp size={24} color={isPositive ? "#4CAF50" : "#ff6b6b"} />
            <Text style={{ color: isPositive ? "#4CAF50" : "#ff6b6b", fontSize: 18, fontWeight: '600' }}>
              Available to Save & Spend
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: '700' }}>
            {isPositive ? '+' : ''}${Math.abs(availableAmount).toLocaleString()}
          </Text>
          {!isPositive && (
            <Text style={{ color: '#ff6b6b', fontSize: 14, marginTop: 8 }}>
              ⚠️ Expenses exceed income
            </Text>
          )}
        </View>

        {/* Upcoming Payments */}
        {(currentView.upcomingPayments.length > 0 || currentView.overduePayments.length > 0) && (
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              Payments Due
            </Text>
            
            {/* Overdue Payments */}
            {currentView.overduePayments.map(payment => {
              const expense = fixedExpenses.find(e => e.id === payment.expenseId);
              if (!expense) return null;
              
              return (
                <TouchableOpacity
                  key={payment.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#3a1a1a',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#ff6b6b',
                  }}
                  onPress={() => handlePaymentToggle(payment)}
                >
                  <Circle size={20} color="#ff6b6b" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      {expense.emoji} {expense.name}
                    </Text>
                    <Text style={{ color: '#ff6b6b', fontSize: 14 }}>
                      OVERDUE • ${payment.amount.toLocaleString()}
                    </Text>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Upcoming Payments */}
            {currentView.upcomingPayments.map(payment => {
              const expense = fixedExpenses.find(e => e.id === payment.expenseId);
              if (!expense) return null;
              
              return (
                <TouchableOpacity
                  key={payment.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2a2a2a',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                  }}
                  onPress={() => handlePaymentToggle(payment)}
                >
                  {payment.status === 'paid' ? (
                    <CheckCircle size={20} color="#4CAF50" style={{ marginRight: 12 }} />
                  ) : (
                    <Circle size={20} color="#ccc" style={{ marginRight: 12 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      {expense.emoji} {expense.name}
                    </Text>
                    <Text style={{ color: '#ccc', fontSize: 14 }}>
                      ${payment.amount.toLocaleString()}
                      {expense.autoDeducted && <Text style={{ color: '#4CAF50' }}> • Auto-pay</Text>}
                    </Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {payment.status === 'paid' && (
                    <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '600' }}>PAID</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state for payments */}
        {currentView.upcomingPayments.length === 0 && currentView.overduePayments.length === 0 && (
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, alignItems: 'center' }}>
            <CheckCircle size={48} color="#4CAF50" style={{ marginBottom: 12 }} />
            <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              All Caught Up!
            </Text>
            <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center' }}>
              No bills due this {viewMode === 'weekly' ? 'week' : 'month'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}