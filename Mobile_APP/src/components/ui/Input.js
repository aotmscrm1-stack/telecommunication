// src/components/ui/Input.js
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEIGHT, CORNERS, FONT_SIZE } from '../../theme/globals';
import { useColor } from '../../hooks/useColor';

export function Input({
  value, onChangeText, placeholder, icon,
  secure, showToggle, onToggle, valid, keyboardType,
}) {
  const secondary = useColor('secondary');
  const border = useColor('border');
  const muted = useColor('muted');
  const primary = useColor('primary');

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: secondary, borderColor: valid ? primary : border },
      ]}
    >
      {icon && <Ionicons name={icon} size={19} color={valid ? primary : muted} style={{ marginRight: 10 }} />}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={{ padding: 6 }}>
          <Ionicons
            name={secure ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={muted}
          />
        </TouchableOpacity>
      )}
      {valid && (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEIGHT,
    borderRadius: CORNERS,
    paddingHorizontal: 18,
    borderWidth: 1.2,
  },
  input: { flex: 1, fontSize: FONT_SIZE - 2, fontWeight: '500' },
  check: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
});
