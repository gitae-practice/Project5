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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-w-[280px] max-w-[360px] flex-col gap-5 rounded-[10px] bg-white px-7 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      >
        <p className="m-0 whitespace-pre-line text-sm leading-[1.6] text-[#111]">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-gray-200 bg-gray-100 px-4 py-[7px] text-[13px] text-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-md border-none bg-[#111] px-4 py-[7px] text-[13px] font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
