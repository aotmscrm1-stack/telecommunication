import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ icon, label, value, sub, bg, iconColor }) => (
  <motion.div 
    whileHover={{ y: -3, scale: 1.01 }}
    transition={{ duration: 0.2 }}
    className="relative overflow-hidden rounded-2xl p-5 border border-[#72ff47]/20 shadow-xl"
    style={{
      background: 'linear-gradient(135deg, rgba(30, 68, 30, 0.85) 0%, rgba(15, 38, 20, 0.95) 100%)',
      backdropFilter: 'blur(12px)',
    }}
  >
    {/* Subtle Glow Background Overlay */}
    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#72ff47]/10 blur-xl pointer-events-none" />

    <div className="flex items-center gap-4 relative z-10">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-[#72ff47]/30 shadow-inner"
        style={{ background: bg || 'rgba(53, 96, 51, 0.5)' }}
      >
        <span style={{ color: iconColor || '#72ff47', fontSize: '20px' }}>{icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-normal text-[#8bc088] uppercase tracking-wider truncate">{label}</div>
        <div className="text-2xl font-medium text-white tracking-tight leading-tight mt-1 truncate">
          {value}
        </div>
        {sub && <div className="text-[11px] font-normal text-[#c5e0c4] mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  </motion.div>
);

export default StatCard;
