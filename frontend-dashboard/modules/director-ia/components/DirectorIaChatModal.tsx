"use client";

import { DirectorIaChatPanel } from "@/modules/director-ia/components/DirectorIaChatPanel";

type DirectorIaChatModalProps = {
  open: boolean;
  onClose: () => void;
  token: string;
  plantaId: number;
  plantaNombre?: string;
};

export function DirectorIaChatModal({
  open,
  onClose,
  token,
  plantaId,
  plantaNombre,
}: DirectorIaChatModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col w-full max-w-lg max-h-[85vh] rounded-xl border border-cyan-800/60 bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="director-ia-chat-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 shrink-0">
          <div>
            <h2 id="director-ia-chat-title" className="text-base font-semibold text-white">
              Chat Director IA
            </h2>
            {plantaNombre ? (
              <p className="text-xs text-slate-400 mt-0.5">Planta: {plantaNombre}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
            aria-label="Cerrar chat"
          >
            Cerrar
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 px-4 py-3">
          <DirectorIaChatPanel
            key={`${plantaId}-${open}`}
            token={token}
            plantaId={plantaId}
            plantaNombre={plantaNombre}
            chatMode
            className="flex-1 min-h-[320px]"
          />
        </div>
      </div>
    </div>
  );
}
