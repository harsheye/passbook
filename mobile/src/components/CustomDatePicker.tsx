import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarIcon } from './SvgIcons';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  dark?: boolean;
  style?: any;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, dark = false, style }) => {
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(value ? new Date(value) : new Date());

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Hide picker for Android right away
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[
          styles.button,
          dark ? styles.buttonDark : styles.buttonLight,
          style
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, dark ? styles.textDark : styles.textLight]}>
          {formatDateString(value)}
        </Text>
        <CalendarIcon color={dark ? '#94a3b8' : '#64748b'} size={14} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    minWidth: 140,
  },
  buttonLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  buttonDark: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textLight: {
    color: '#334155',
  },
  textDark: {
    color: '#e2e8f0',
  },
});
