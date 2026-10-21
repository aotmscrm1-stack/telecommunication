import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function AnimatedNumber({ value = 0, duration = 0.8, className = '' }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));
  const [currentVal, setCurrentVal] = useState(0);

  useEffect(() => {
    spring.set(numericValue);
  }, [spring, numericValue]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setCurrentVal(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return <span className={className}>{currentVal}</span>;
}

export default AnimatedNumber;
