import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react-native';
import { FixedExpense, Frequency, EXPENSE_CATEGORIES, BILL_PRESETS } from '../types-new';

interface FixedExpenseCRUDProps {
  fixedExpenses: FixedExpense[];
  onCreateExpense: (expense: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateExpense: (id: string, updates: Partial<FixedExpense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  householdId: string;
  userId: string;
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function FixedExpenseCRUD({
  fixedExpenses,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  householdId,
  userId
}: FixedExpenseCRUDProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as Frequency,
    dueDay: 1,
    autoDeducted: false,
    category: 'other' as string,
    emoji: '📦',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      dueDay: 1,
      autoDeducted: false,
      category: 'other',
      emoji: '📦',
      active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const expenseData = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      dueDay: formData.dueDay,
      autoDeducted: formData.autoDeducted,
      category: formData.category as any,
      emoji: formData.emoji,
      active: formData.active,
      householdId,
      createdBy: userId,
    };

    try {
      if (editingId) {
        await onUpdateExpense(editingId, expenseData);
        setEditingId(null);
      } else {
        await onCreateExpense(expenseData);
        setIsCreating(false);
      }
      resetForm();
      setShowPresets(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  const handleEdit = (expense: FixedExpense) => {
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      dueDay: expense.dueDay,
      autoDeducted: expense.autoDeducted,
      category: expense.category,
      emoji: expense.emoji,
      active: expense.active,
    });
    setEditingId(expense.id);
    setShowPresets(false);
  };

  const handleDelete = (expense: FixedExpense) => {
    Alert.alert(
      'Delete Fixed Expense',
      `Are you sure you want to delete "${expense.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteExpense(expense.id),
        },
      ]
    );
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setShowPresets(false);
    resetForm();
  };

  const handlePresetSelect = (preset: typeof BILL_PRESETS[0]) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.id === preset.category);
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      emoji: category?.emoji || preset.emoji,
    }));
    setShowPresets(false);
  };

  const renderPresets = () => (
    <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
        Common Bills & Subscriptions
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {BILL_PRESETS.map((preset, index) => {
            const category = EXPENSE_CATEGORIES.find(cat => cat.id === preset.category);
            return (
              <TouchableOpacity
                key={index}
                style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: 8,
                  padding: 12,
                  minWidth: 100,
                  alignItems: 'center',
                }}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{category?.emoji}</Text>
                <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{preset.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={{ marginTop: 12, alignSelf: 'flex-end' }}
        onPress={() => setShowPresets(false)}
      >
        <Text style={{ color: '#4CAF50', fontSize: 14 }}>Skip presets</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForm = () => (
    <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
        {editingId ? 'Edit Fixed Expense' : 'Add Fixed Expense'}
      </Text>
      
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>Name</Text>
        <TextInput
          style={{
            backgroundColor: '#2a2a2a',
            color: '#fff',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          placeholder="e.g., Rent, Electric, Netflix"
          placeholderTextColor="#666"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>Amount ($)</Text>
        <TextInput
          style={{
            backgroundColor: '#2a2a2a',
            color: '#fff',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          placeholder="0.00"
          placeholderTextColor="#666"
          keyboardType="decimal-pad"
          value={formData.amount}
          onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
        />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {EXPENSE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={{
                  backgroundColor: formData.category === category.id ? '#4CAF50' : '#2a2a2a',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                onPress={() => setFormData(prev => ({ ...prev, category: category.id, emoji: category.emoji }))}
              >
                <Text style={{ fontSize: 16 }}>{category.emoji}</Text>
                <Text style={{ color: '#fff', fontSize: 12 }}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>Frequency</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={{
                flex: 1,
                backgroundColor: formData.frequency === freq.value ? '#4CAF50' : '#2a2a2a',
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
              onPress={() => setFormData(prev => ({ ...prev, frequency: freq.value }))}
            >
              <Text style={{ color: '#fff', fontWeight: '500' }}>{freq.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#ccc', marginBottom: 6 }}>
          {formData.frequency === 'monthly' ? 'Due Day of Month' : 'Due Day of Week'}
        </Text>
        <TextInput
          style={{
            backgroundColor: '#2a2a2a',
            color: '#fff',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
          }}
          placeholder={formData.frequency === 'monthly' ? '1-31' : '1-7 (Monday=1)'}
          placeholderTextColor="#666"
          keyboardType="number-pad"
          value={formData.dueDay.toString()}
          onChangeText={(text) => {
            const day = parseInt(text) || 1;
            const max = formData.frequency === 'monthly' ? 31 : 7;
            setFormData(prev => ({ ...prev, dueDay: Math.min(Math.max(day, 1), max) }));
          }}
        />
      </View>

      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
      }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Auto-deducted (Auto-pay)</Text>
        <Switch
          value={formData.autoDeducted}
          onValueChange={(value) => setFormData(prev => ({ ...prev, autoDeducted: value }))}
          trackColor={{ false: '#666', true: '#4CAF50' }}
          thumbColor={'#fff'}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#4CAF50',
            borderRadius: 8,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={handleSave}
        >
          <Save size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#666',
            borderRadius: 8,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={handleCancel}
        >
          <X size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFixedExpense = (expense: FixedExpense) => (
    <View key={expense.id} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 18 }}>{expense.emoji}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {expense.name}
            </Text>
            {expense.autoDeducted && (
              <View style={{ backgroundColor: '#4CAF50', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>AUTO</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            ${expense.amount.toLocaleString()}
          </Text>
          <Text style={{ color: '#ccc', fontSize: 14 }}>
            {expense.frequency} • Due: {expense.dueDay}
            {expense.frequency === 'monthly' ? (expense.dueDay === 1 ? 'st' : expense.dueDay === 2 ? 'nd' : expense.dueDay === 3 ? 'rd' : 'th') : ''}
          </Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
            {EXPENSE_CATEGORIES.find(cat => cat.id === expense.category)?.name || 'Other'}
          </Text>
          {!expense.active && (
            <Text style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>Inactive</Text>
          )}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#2a2a2a', borderRadius: 8 }}
            onPress={() => handleEdit(expense)}
          >
            <Edit2 size={16} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#2a2a2a', borderRadius: 8 }}
            onPress={() => handleDelete(expense)}
          >
            <Trash2 size={16} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Fixed Expenses</Text>
        
        {!isCreating && !editingId && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ff6b6b',
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => {
              setIsCreating(true);
              setShowPresets(true);
            }}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add Bill</Text>
          </TouchableOpacity>
        )}
      </View>

      {(isCreating || editingId) && (
        <>
          {showPresets && renderPresets()}
          {renderForm()}
        </>
      )}

      <ScrollView>
        {fixedExpenses
          .filter(expense => expense.active)
          .map(renderFixedExpense)}
        
        {fixedExpenses.filter(expense => !expense.active).length > 0 && (
          <>
            <Text style={{ color: '#666', fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
              Inactive
            </Text>
            {fixedExpenses
              .filter(expense => !expense.active)
              .map(renderFixedExpense)}
          </>
        )}
        
        {fixedExpenses.length === 0 && !isCreating && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#666', fontSize: 16, marginBottom: 16 }}>No fixed expenses yet</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#ff6b6b',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => {
                setIsCreating(true);
                setShowPresets(true);
              }}
            >
              <Plus size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add Your First Bill</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}