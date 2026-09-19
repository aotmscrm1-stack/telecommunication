import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

export const StatCard = ({ icon, label, value, sub, bg, iconColor, growth }) => (
  <motion.div 
    whileHover={{ y: -3 }}
    transition={{ duration: 0.2 }}
    className="bg-white rounded-[28px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between transition-all"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: bg || '#e6f4ea', color: iconColor || '#0d6537' }}
          >
            {icon}
          </div>
        )}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <button className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center text-gray-600 transition-colors">
        <FaArrowUpRightFromSquare className="w-3 h-3" />
      </button>
    </div>

    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-gray-900 tracking-tight">{value}</span>
        {growth && (
          <span className="bg-[#e6f4ea] text-[#0d6537] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {growth}
          </span>
        )}
      </div>
      {sub && <div className="text-xs font-medium text-gray-400 mt-1">{sub}</div>}
    </div>
  </motion.div>
);

export default StatCard;
