import React from 'react';

export function GradientText({
  children,
  className = '',
  colors = ['#0284c7', '#2563eb', '#7c3aed'],
  animationSpeed = 6,
  showBorder = false,
}) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: `gradientMove ${animationSpeed}s ease infinite alternate`,
  };

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span style={gradientStyle} className="font-extrabold tracking-tight">
        {children}
      </span>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </span>
  );
}

export default GradientText;
