// src/components/ui/Button.js
import React from 'react';
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { HEIGHT, CORNERS, FONT_SIZE } from '../../theme/globals';
import { useColor, usePalette } from '../../hooks/useColor';

export function Button({ title, onPress, variant = 'primary', loading, icon, disabled }) {
  const palette = usePalette();
  const primary = useColor('primary');
  const primaryFg = useColor('primaryForeground');
  const border = useColor('border');

  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const bg = isOutline || isGhost ? 'transparent' : primary;
  const fg = isOutline ? primary : isGhost ? palette.foreground : primaryFg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
        (isOutline || isGhost) && { borderWidth: 1.5, borderColor: isOutline ? primary : border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
          {icon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: HEIGHT,
    borderRadius: CORNERS,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: FONT_SIZE - 1, fontWeight: '700', letterSpacing: 0.3 },
});
