
import React, { useState } from 'react';

interface ClientSettingsViewProps {
  onBack: () => void;
  userRole: 'client' | 'expert';
  isLocked: boolean;
  setIsLocked: (v: boolean) => void;
  notificationPrefs: boolean[];
  setNotificationPrefs: (v: boolean[]) => void;
}

interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
  isDefault: boolean;
  nickname?: string;
}

const DEFAULT_NOTIFICATIONS = [true, false, true, true];

export const ClientSettingsView: React.FC<ClientSettingsViewProps> = ({ 
  onBack, 
  userRole,
  isLocked,
  setIsLocked,
  notificationPrefs,
  setNotificationPrefs
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    { id: 'c1', brand: 'visa', last4: '4242', expiry: '12/25', isDefault: true, nickname: 'Main Workspace Card' },
    { id: 'c2', brand: 'mastercard', last4: '8812', expiry: '08/24', isDefault: false, nickname: 'Supplies Card' }
  ]);

  const [cardFormData, setCardFormData] = useState({ number: '', expiry: '', cvv: '', nickname: '' });

  const handleOpenAddForm = () => {
    setEditingCardId(null);
    setCardFormData({ number: '', expiry: '', cvv: '', nickname: '' });
    setShowForm(true);
  };

  const handleEditCard = (card: SavedCard) => {
    setEditingCardId(card.id);
    setCardFormData({
      number: `•••• •••• •••• ${card.last4}`,
      expiry: card.expiry,
      cvv: '•••',
      nickname: card.nickname || ''
    });
    setShowForm(true);
  };

  const handleSaveCard = () => {
    if (editingCardId) {
      setSavedCards(prev => prev.map(c => {
        if (c.id === editingCardId) {
          const isNewNumber = !cardFormData.number.includes('•');
          return {
            ...c,
            last4: isNewNumber ? cardFormData.number.slice(-4) : c.last4,
            expiry: cardFormData.expiry,
            nickname: cardFormData.nickname || undefined
          };
        }
        return c;
      }));
    } else {
      if (cardFormData.number.length < 16) return;
      const card: SavedCard = {
        id: `c-${Date.now()}`,
        brand: 'visa',
        last4: cardFormData.number.slice(-4),
        expiry: cardFormData.expiry,
        isDefault: false,
        nickname: cardFormData.nickname || undefined
      };
      setSavedCards([...savedCards, card]);
    }
    
    setShowForm(false);
    setEditingCardId(null);
    setCardFormData({ number: '', expiry: '', cvv: '', nickname: '' });
  };

  const handleDeleteCard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedCards(prev => prev.filter(card => card.id !== id));
    if (editingCardId === id) {
      setShowForm(false);
      setEditingCardId(null);
    }
  };

  const handleApplePay = () => {
    window.open('https://www.apple.com/apple-pay/', '_blank');
  };

  const handleGooglePay = () => {
    window.open('https://pay.google.com/', '_blank');
  };

  const handleTogglePref = (index: number) => {
    if (isLocked) return;
    const newPrefs = [...notificationPrefs];
    newPrefs[index] = !newPrefs[index];
    setNotificationPrefs(newPrefs);
  };

  const handleSavePreferences = () => {
    setIsLocked(true);
  };

  const handleResetDefaults = () => {
    setNotificationPrefs(DEFAULT_NOTIFICATIONS);
    setIsLocked(false);
  };

  const CardIcon = ({ brand }: { brand: SavedCard['brand'] }) => (
    <div className="w-10 h-6 bg-slate-100 rounded flex items-center justify-center text-[8px] font-black uppercase tracking-tighter text-slate-400 border border-slate-200">
      {brand}
    </div>
  );

  const notifications = [
    { label: 'Broadcast Responses', desc: 'Alert me when an expert responds to my build signal.' },
    { label: 'AI Progress Summaries', desc: 'Weekly digests of your project milestones.' },
    { label: 'Security Alerts', desc: 'Immediate notification of new login attempts.' },
    { label: 'Expert Chat Messages', desc: 'Real-time push notifications for active links.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600"
            aria-label="Back to workspace"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Details</h2>
            <p className="text-slate-500 font-medium">Manage your security, contact information, and preferences.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Account Center */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Account Center</h3>
          </div>
          
          <div className="space-y-4">
            <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">Password & Security</p>
                <p className="text-xs text-slate-400">Update your credentials and manage sessions.</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">Two-Factor Authentication</p>
                <p className="text-xs text-slate-400">Add an extra layer of protection to your account.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full">Active</span>
            </button>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Contact Information</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Email Address</label>
              <div className="relative">
                <input type="email" defaultValue="sarah.jenkins@buildsync.com" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 uppercase">Change</button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Phone Number</label>
              <div className="relative">
                <input type="tel" defaultValue="+1 (555) 234-5678" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 uppercase">Change</button>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods - ONLY VISIBLE FOR CLIENTS */}
        {userRole === 'client' && (
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Payment Methods</h3>
              </div>
              <button 
                onClick={handleOpenAddForm}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                + Add Card
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {showForm ? (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{editingCardId ? 'Edit Card Details' : 'Add New Card'}</p>
                      <button onClick={() => setShowForm(false)} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-600">Cancel</button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nickname</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Supplies Card" 
                          value={cardFormData.nickname}
                          onChange={(e) => setCardFormData({...cardFormData, nickname: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Card Number</label>
                        <input 
                          type="text" 
                          placeholder="Card Number" 
                          value={cardFormData.number}
                          onChange={(e) => setCardFormData({...cardFormData, number: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Expiry</label>
                          <input 
                            type="text" 
                            placeholder="MM/YY" 
                            value={cardFormData.expiry}
                            onChange={(e) => setCardFormData({...cardFormData, expiry: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CVV</label>
                          <input 
                            type="text" 
                            placeholder="CVV" 
                            value={cardFormData.cvv}
                            onChange={(e) => setCardFormData({...cardFormData, cvv: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleSaveCard}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100"
                      >
                        {editingCardId ? 'Save Changes' : 'Save Card Method'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedCards.length > 0 ? savedCards.map(card => (
                      <button 
                        key={card.id} 
                        onClick={() => handleEditCard(card)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border transition-all text-left group ${editingCardId === card.id ? 'border-indigo-400 ring-2 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-4">
                          <CardIcon brand={card.brand} />
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {card.nickname || `Card ending in ${card.last4}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">•••• {card.last4}</p>
                              <span className="text-[10px] text-slate-300">•</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Exp {card.expiry}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {card.isDefault && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Default</span>}
                          <div 
                            onClick={(e) => handleDeleteCard(e, card.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50"
                            title="Delete card"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                         <p className="text-xs font-bold uppercase tracking-widest">No cards saved</p>
                         <button onClick={handleOpenAddForm} className="mt-2 text-[10px] font-black text-indigo-600 uppercase">Click to add one</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Express Checkout</p>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleApplePay}
                    className="flex items-center justify-center gap-2 w-full h-14 bg-black rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98] group"
                  >
                     <svg width="20" height="24" viewBox="0 0 170 200">
                       <path fill="#fff" d="M150.37,130.25c-2.45,5.66-5.35,10.87-8.71,15.66c-8.58,12.23-17.45,24.37-31.29,24.37c-13.37,0-17.69-8.2-33.21-8.2c-15.52,0-20.13,8.02-33.03,8.39c-12.9,0.37-23.09-12.98-31.74-25.3c-17.69-25.21-31.13-71.19-12.71-103.11c9.14-15.84,25.48-25.89,43.34-26.17c13.73-0.21,26.68,9.28,35.12,9.28c8.44,0,24.13-11.49,40.58-9.84c6.88,0.28,26.21,2.77,38.64,20.94c-1.01,0.62-23,13.41-22.72,39.32C135.03,98.6,146.95,116.1,150.37,130.25z M119.11,32.64c7.34-8.9,12.23-21.25,10.87-33.64c-10.63,0.43-23.49,7.09-31.13,16c-6.84,7.86-12.83,20.5-11.23,32.48C98.98,48.24,111.47,41.9,119.11,32.64z"/>
                     </svg>
                     <span className="text-white font-black text-xl tracking-tight">Apple Pay</span>
                  </button>
                  <button 
                    onClick={handleGooglePay}
                    className="flex items-center justify-center gap-3 w-full h-14 bg-white border-2 border-slate-200 rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98] group"
                  >
                     <div className="flex items-center gap-3">
                       <svg width="24" height="24" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          <path fill="none" d="M0 0h48v48H0z"/>
                       </svg>
                       <span className="font-black text-slate-800 uppercase tracking-widest text-xs">Google Pay</span>
                     </div>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase">Secure payment processing powered by BuildSync Vault. Your financial details are encrypted and never stored on our local build servers.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Notifications */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Notification Preferences</h3>
              {isLocked && (
                <span className="px-3 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-full flex items-center gap-1 border border-slate-200 animate-in fade-in zoom-in duration-300">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Locked
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {notifications.map((pref, i) => (
              <div key={pref.label} className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 transition-opacity duration-500 ${isLocked ? 'opacity-40' : 'opacity-100'}`}>
                <div className="max-w-[80%]">
                  <p className="text-sm font-bold text-slate-700">{pref.label}</p>
                  <p className="text-xs text-slate-400">{pref.desc}</p>
                </div>
                <label className={`relative inline-flex items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="checkbox" 
                    checked={notificationPrefs[i]} 
                    onChange={() => handleTogglePref(i)}
                    disabled={isLocked}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-4">
        <button 
          onClick={handleResetDefaults}
          className="px-8 py-3 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          Reset Defaults
        </button>
        <button 
          onClick={handleSavePreferences}
          disabled={isLocked}
          className={`px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${isLocked ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200'}`}
        >
          {isLocked ? 'Preferences Saved' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};
