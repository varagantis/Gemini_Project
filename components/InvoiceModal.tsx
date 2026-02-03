
import React, { useState } from 'react';
import { Invoice } from '../types';

interface InvoiceModalProps {
  onClose: () => void;
  onSubmit: (invoice: Omit<Invoice, 'id' | 'status' | 'createdAt'>) => void;
  expertName: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ onClose, onSubmit, expertName }) => {
  const [type, setType] = useState<'hourly' | 'fixed'>('fixed');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    onSubmit({
      amount: parseFloat(amount),
      type,
      rateLabel: type === 'hourly' ? `$${amount}/hr` : 'Total Project Fee',
      description
    });
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
        <header className="bg-slate-900 p-8 text-white">
          <h3 className="text-2xl font-black tracking-tight">Create Invoice</h3>
          <p className="text-slate-400 text-sm font-medium">Issue a billing request to your client.</p>
        </header>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              type="button"
              onClick={() => setType('fixed')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'fixed' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Fixed Price
            </button>
            <button 
              type="button"
              onClick={() => setType('hourly')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === 'hourly' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Hourly Rate
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">
              {type === 'fixed' ? 'Total Project Amount ($)' : 'Hourly Rate ($)'}
            </label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Work Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Design consultation and material procurement..."
              required
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" 
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 transition-all"
            >
              Send Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
