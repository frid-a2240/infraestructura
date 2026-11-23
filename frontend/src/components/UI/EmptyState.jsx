import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon size={20} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}
