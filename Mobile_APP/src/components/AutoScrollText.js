import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';

/**
 * AutoScrollText for React Native
 * Automatically measures text overflow within maxWidth.
 * If text exceeds maxWidth, smoothly auto-scrolls horizontally with pause.
 */
export default function AutoScrollText({
  text = '',
  maxWidth = 135,
  style = {},
  duration,
  delay = 1400,
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const overflowDistance = Math.max(0, textWidth - containerWidth);
  const isOverflowing = overflowDistance > 4;

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animatedValue.setValue(0);

    if (isOverflowing && containerWidth > 0 && textWidth > 0) {
      const scrollDuration = duration || Math.max(2600, overflowDistance * 50);

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -overflowDistance - 8,
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
        { maxWidth },
        style && style.maxWidth ? { maxWidth: style.maxWidth } : null,
      ]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== containerWidth) setContainerWidth(w);
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateX: isOverflowing ? animatedValue : 0 }],
          flexDirection: 'row',
        }}
      >
        <Text
          numberOfLines={1}
          style={[style, styles.text]}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== textWidth) setTextWidth(w);
          }}
        >
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
  },
  text: {
    flexShrink: 0,
  },
});

