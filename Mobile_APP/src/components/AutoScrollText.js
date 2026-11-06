import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';

/**
 * AutoScrollText for React Native
 * Measures text width against container width.
 * When text exceeds container width, smoothly scrolls back and forth horizontally.
 * The text is GUARANTEED to be 100% visible from frame 1 without collapsing.
 */
export default function AutoScrollText({
  text = '',
  maxWidth,
  style = {},
  containerStyle = {},
  duration,
  delay = 1400,
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const overflowDistance = Math.max(0, textWidth - containerWidth);
  const isOverflowing = overflowDistance > 6 && containerWidth > 0 && textWidth > 0;

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animatedValue.setValue(0);

    if (isOverflowing) {
      const scrollDuration = duration || Math.max(2600, overflowDistance * 45);

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -overflowDistance - 6,
            duration: scrollDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(1200),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: Math.max(1600, scrollDuration * 0.7),
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ])
      );
      animationRef.current = anim;
      anim.start();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [text, containerWidth, textWidth, isOverflowing, overflowDistance]);

  return (
    <View
      style={[
        styles.container,
        maxWidth ? { maxWidth } : null,
        containerStyle,
      ]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== containerWidth) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Off-screen single-line row measurement to accurately obtain unwrapped width */}
      <View style={styles.measureContainer} pointerEvents="none">
        <Text
          style={[styles.baseText, style]}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== textWidth) {
              setTextWidth(w);
            }
          }}
        >
          {text}
        </Text>
      </View>

      {/* Visible animated text: Always rendered visibly with 1 line */}
      <Animated.View
        style={{
          transform: [{ translateX: isOverflowing ? animatedValue : 0 }],
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text numberOfLines={1} style={[styles.baseText, style]}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    flexShrink: 1,
  },
  baseText: {
    fontSize: 11,
    color: '#1E293B',
  },
  measureContainer: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    opacity: 0,
    flexDirection: 'row',
  },
});
