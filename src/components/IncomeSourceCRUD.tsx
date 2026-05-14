import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react-native';
import { IncomeSource, Frequency } from '../types-new';

interface IncomeSourceCRUDProps {
  incomeSources: IncomeSource[];
  onCreateSource: (source: Omit<IncomeSource, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateSource: (id: string, updates: Partial<IncomeSource>) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  householdId: string;
  userId: string;
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function IncomeSourceCRUD({
  incomeSources,
  onCreateSource,
  onUpdateSource,
  onDeleteSource,
  householdId,
  userId
}: IncomeSourceCRUDProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as Frequency,
    dayOfWeek: 0,
    dayOfMonth: 1,
    startDate: '',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      dayOfWeek: 0,
      dayOfMonth: 1,
      startDate: '',
      active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const sourceData = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      dayOfWeek: formData.frequency === 'weekly' || formData.frequency === 'biweekly' ? formData.dayOfWeek : undefined,
      dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
      startDate: formData.frequency === 'biweekly' ? formData.startDate : undefined,
      active: formData.active,
      householdId,
      createdBy: userId,
    };

    try {
      if (editingId) {
        await onUpdateSource(editingId, sourceData);
        setEditingId(null);
      } else {
        await onCreateSource(sourceData);
        setIsCreating(false);
      }
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save income source');
    }
  };

  const handleEdit = (source: IncomeSource) => {
    setFormData({
      name: source.name,
      amount: source.amount.toString(),
      frequency: source.frequency,
      dayOfWeek: source.dayOfWeek || 0,
      dayOfMonth: source.dayOfMonth || 1,
      startDate: source.startDate || '',
      active: source.active,
    });
    setEditingId(source.id);
  };

  const handleDelete = (source: IncomeSource) => {
    Alert.alert(
      'Delete Income Source',
      `Are you sure you want to delete "${source.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSource(source.id),
        },
      ]
    );
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const renderForm = () => (
    <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
        {editingId ? 'Edit Income Source' : 'Add Income Source'}
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
          placeholder="e.g., Nathan Salary"
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

      {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#ccc', marginBottom: 6 }}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DAYS_OF_WEEK.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: formData.dayOfWeek === index ? '#4CAF50' : '#2a2a2a',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, dayOfWeek: index }))}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>{day.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {formData.frequency === 'monthly' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#ccc', marginBottom: 6 }}>Day of Month</Text>
          <TextInput
            style={{
              backgroundColor: '#2a2a2a',
              color: '#fff',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
            }}
            placeholder="1-31"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={formData.dayOfMonth.toString()}
            onChangeText={(text) => {
              const day = parseInt(text) || 1;
              setFormData(prev => ({ ...prev, dayOfMonth: Math.min(Math.max(day, 1), 31) }));
            }}
          />
        </View>
      )}

      {formData.frequency === 'biweekly' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#ccc', marginBottom: 6 }}>Start Date (for bi-weekly calculation)</Text>
          <TextInput
            style={{
              backgroundColor: '#2a2a2a',
              color: '#fff',
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
            value={formData.startDate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, startDate: text }))}
          />
        </View>
      )}

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

  const renderIncomeSource = (source: IncomeSource) => (
    <View key={source.id} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
            {source.name}
          </Text>
          <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
            ${source.amount.toLocaleString()}
          </Text>
          <Text style={{ color: '#ccc', fontSize: 14 }}>
            {source.frequency}
            {source.dayOfWeek !== undefined && ` • ${DAYS_OF_WEEK[source.dayOfWeek]}`}
            {source.dayOfMonth && ` • ${source.dayOfMonth}${source.dayOfMonth === 1 ? 'st' : source.dayOfMonth === 2 ? 'nd' : source.dayOfMonth === 3 ? 'rd' : 'th'}`}
          </Text>
          {!source.active && (
            <Text style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>Inactive</Text>
          )}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#2a2a2a', borderRadius: 8 }}
            onPress={() => handleEdit(source)}
          >
            <Edit2 size={16} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#2a2a2a', borderRadius: 8 }}
            onPress={() => handleDelete(source)}
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
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Income Sources</Text>
        
        {!isCreating && !editingId && (
          <TouchableOpacity
            style={{
              backgroundColor: '#4CAF50',
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => setIsCreating(true)}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add Income</Text>
          </TouchableOpacity>
        )}
      </View>

      {(isCreating || editingId) && renderForm()}

      <ScrollView>
        {incomeSources.map(renderIncomeSource)}
        
        {incomeSources.length === 0 && !isCreating && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#666', fontSize: 16, marginBottom: 16 }}>No income sources yet</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => setIsCreating(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add Your First Income Source</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}