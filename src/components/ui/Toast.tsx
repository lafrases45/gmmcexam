'use client'

import React from 'react'
import { useToastStore, ToastType } from '@/lib/store/useToastStore'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: any, onRemove: () => void }) {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} color="#10b981" />
      case 'error': return <AlertCircle size={20} color="#ef4444" />
      case 'warning': return <AlertTriangle size={20} color="#f59e0b" />
      default: return <Info size={20} color="#3b82f6" />
    }
  }

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success': return { bg: '#ecfdf5', border: '#10b981', accent: '#059669' }
      case 'error': return { bg: '#fef2f2', border: '#ef4444', accent: '#dc2626' }
      case 'warning': return { bg: '#fffbeb', border: '#f59e0b', accent: '#d97706' }
      default: return { bg: '#eff6ff', border: '#3b82f6', accent: '#2563eb' }
    }
  }

  const colors = getColors(toast.type)

  return (
    <div 
      onClick={onRemove}
      style={{
        pointerEvents: 'auto',
        minWidth: '320px',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors.border}20`,
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        animation: 'toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: colors.border
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${colors.bg}`,
        borderRadius: '12px',
        width: '40px',
        height: '40px',
        flexShrink: 0
      }}>
        {getIcon(toast.type)}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ 
          color: '#1e293b', 
          fontSize: '0.9rem', 
          fontWeight: 600,
          lineHeight: 1.5
        }}>
          {toast.message}
        </div>
      </div>

      <button 
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
      >
        <X size={16} />
      </button>

      <style jsx>{`
        @keyframes toast-in {
          from { transform: translateX(100%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
