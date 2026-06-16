// 수정/삭제 등 되돌릴 수 없는 액션 전 사용자 확인용 모달
export default function ConfirmModal({
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '24px 28px',
          minWidth: 280,
          maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#111',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              fontSize: 13,
              padding: '7px 16px',
              borderRadius: 6,
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: 6,
              background: '#111',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
