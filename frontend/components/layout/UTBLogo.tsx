import React from 'react';

export const UTBLogo: React.FC<{ className?: string }> = ({ className = "h-10" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="bg-[#0B4FC4] text-white font-black text-2xl tracking-tighter px-3 py-1 rounded-md shadow-sm">
        UTB
      </div>
      <div className="flex flex-col border-l border-gray-300 pl-3 leading-tight">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Universidad</span>
        <span className="text-[13px] font-bold text-[#0B4FC4]">Tecnológica de Bolívar</span>
      </div>
    </div>
  );
};
