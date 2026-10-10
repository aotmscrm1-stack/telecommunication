import React, { forwardRef } from 'react';
import './a4template.css';

function A4ContainerComponent({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`a4-container ${className}`} {...props}>
      {children}
    </div>
  );
}
export const A4Container = forwardRef(A4ContainerComponent);

function A4PageComponent({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`a4-page ${className}`} {...props}>
      {children}
    </div>
  );
}
export const A4Page = forwardRef(A4PageComponent);

function A4UnitComponent({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`a4-unit ${className}`} {...props}>
      {children}
    </div>
  );
}
export const A4Unit = forwardRef(A4UnitComponent);

function A4TableComponent({ children, className = '', ...props }, ref) {
  return (
    <table ref={ref} className={`a4-table ${className}`} {...props}>
      {children}
    </table>
  );
}
export const A4Table = forwardRef(A4TableComponent);

export default A4Container;
