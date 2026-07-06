import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
interface Owner {
  id: string;
  name: string;
  shareNumerator: number;
  shareDenominator: number;
  acquisitionDate: string;
  notes: string;
}

interface Transfer {
  id: string;
  sellerName: string;
  buyerName: string;
  transferredNumerator: number;
  transferredDenominator: number;
  transferDate: string;
  notes: string;
}

interface FinalOwner {
  name: string;
  shareNumerator: number;
  shareDenominator: number;
  area: number;
  percentage: number;
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const gcd = (a: number, b: number): number => {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
};

const simplify = (n: number, d: number) => {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};

const fmtFrac = (n: number, d: number) => {
  const s = simplify(n, d);
  return `${s.n} از ${s.d}`;
};

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'ok' ? '#059669' : type === 'err' ? '#dc2626' : '#4f46e5';
  const icon = type === 'ok' ? '✅' : type === 'err' ? '❌' : 'ℹ️';
  return (
    <div className="toast-enter" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: bg, color: '#fff', padding: '12px 24px', borderRadius: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 600, maxWidth: '90vw', direction: 'rtl'
    }}>
      <span>{icon}</span><span>{msg}</span>
    </div>
  );
}

// ═══════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════
function Confirm({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
  return (
    <div onClick={onNo} style={{
      position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 24, padding: 32, maxWidth: 380, width: '100%',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', marginBottom: 28, lineHeight: 1.7 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onYes} style={{
            flex: 1, padding: '14px 0', background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer'
          }}>بله، حذف شود</button>
          <button onClick={onNo} style={{
            flex: 1, padding: '14px 0', background: '#f3f4f6', color: '#374151',
            border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer'
          }}>انصراف</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState<1 | 2 | 3 | 4>(1);
  const [area, setArea] = useState(0);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [finals, setFinals] = useState<FinalOwner[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);

  // Form 1
  const [f1n, setF1n] = useState('');
  const [f1num, setF1num] = useState('');
  const [f1den, setF1den] = useState('');
  const [f1date, setF1date] = useState('');
  const [f1note, setF1note] = useState('');

  // Form 2
  const [f2seller, setF2seller] = useState('');
  const [f2buyer, setF2buyer] = useState('');
  const [f2num, setF2num] = useState('');
  const [f2den, setF2den] = useState('');
  const [f2date, setF2date] = useState('');
  const [f2note, setF2note] = useState('');

  // All names ever seen
  const allNames = Array.from(new Set([
    ...owners.map(o => o.name),
    ...transfers.map(t => t.sellerName),
    ...transfers.map(t => t.buyerName),
  ])).filter(Boolean).sort();

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mlk_data');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.area != null) setArea(d.area);
        if (d.owners) setOwners(d.owners);
        if (d.transfers) setTransfers(d.transfers);
      }
    } catch { /* */ }
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem('mlk_data', JSON.stringify({ area, owners, transfers }));
  }, [area, owners, transfers]);

  // Current fraction for a person
  const getFrac = useCallback((name: string) => {
    let f = 0;
    owners.forEach(o => { if (o.name === name) f += o.shareNumerator / o.shareDenominator; });
    transfers.forEach(t => {
      const tf = t.transferredNumerator / t.transferredDenominator;
      if (t.sellerName === name) f -= tf;
      if (t.buyerName === name) f += tf;
    });
    return Math.max(0, f);
  }, [owners, transfers]);

  // Calculate finals
  useEffect(() => {
    const ownership = new Map<string, number>();
    owners.forEach(o => {
      ownership.set(o.name, (ownership.get(o.name) || 0) + o.shareNumerator / o.shareDenominator);
    });
    transfers.forEach(t => {
      const f = t.transferredNumerator / t.transferredDenominator;
      ownership.set(t.sellerName, (ownership.get(t.sellerName) || 0) - f);
      ownership.set(t.buyerName, (ownership.get(t.buyerName) || 0) + f);
    });
    const res: FinalOwner[] = [];
    ownership.forEach((frac, name) => {
      if (frac > 0.00001) {
        const d = 10000;
        const n = Math.round(frac * d);
        const s = simplify(n, d);
        res.push({
          name,
          shareNumerator: s.n,
          shareDenominator: s.d,
          area: Math.round(frac * (area || 0) * 100) / 100,
          percentage: Math.round(frac * 10000) / 100,
        });
      }
    });
    res.sort((a, b) => b.percentage - a.percentage);
    setFinals(res);
  }, [owners, transfers, area]);

  const currentOwners = allNames.filter(n => getFrac(n) > 0.00001);

  const showToast = (msg: string, type: 'ok' | 'err' | 'info') => setToast({ msg, type });

  // Add Owner
  const addOwner = () => {
    const name = f1n.trim();
    const num = parseInt(f1num) || 0;
    const den = parseInt(f1den) || 0;
    if (!name) return showToast('نام مالک را وارد کنید', 'err');
    if (num <= 0 || den <= 0) return showToast('سهم جزء و کل باید بزرگتر از صفر باشند', 'err');
    if (num > den) return showToast('سهم جزء نمی‌تواند بیشتر از سهم کل باشد', 'err');
    setOwners(p => [...p, { id: makeId(), name, shareNumerator: num, shareDenominator: den, acquisitionDate: f1date || '-', notes: f1note.trim() }]);
    setF1n(''); setF1num(''); setF1den(''); setF1date(''); setF1note('');
    showToast(`«${name}» با سهم ${num} از ${den} ثبت شد`, 'ok');
  };

  // Add Transfer
  const addTransfer = () => {
    const seller = f2seller.trim();
    const buyer = f2buyer.trim();
    const num = parseInt(f2num) || 0;
    const den = parseInt(f2den) || 0;
    if (!seller) return showToast('فروشنده را انتخاب کنید', 'err');
    if (!buyer) return showToast('نام خریدار را وارد کنید', 'err');
    if (seller === buyer) return showToast('فروشنده و خریدار نمی‌توانند یکی باشند', 'err');
    if (num <= 0 || den <= 0) return showToast('سهم انتقال باید بزرگتر از صفر باشد', 'err');
    if (num > den) return showToast('سهم جزء نمی‌تواند بیشتر از سهم کل باشد', 'err');
    const tf = num / den;
    const sf = getFrac(seller);
    if (tf > sf + 0.00001) return showToast(`سهم فروشنده کافی نیست! (${(sf * 100).toFixed(2)}%)`, 'err');
    setTransfers(p => [...p, { id: makeId(), sellerName: seller, buyerName: buyer, transferredNumerator: num, transferredDenominator: den, transferDate: f2date || '-', notes: f2note.trim() }]);
    setF2seller(''); setF2buyer(''); setF2num(''); setF2den(''); setF2date(''); setF2note('');
    showToast(`انتقال ${num} از ${den} از «${seller}» به «${buyer}» ثبت شد`, 'ok');
  };

  // ═══════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════
  const card = "bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden";
  const label = "block text-sm font-semibold text-gray-600 mb-1.5";
  const input = "w-full px-4 py-3.5 border-2 border-gray-100 focus:border-indigo-400 rounded-2xl text-base focus:outline-none transition-all bg-white";
  const inputCenter = input + " text-center text-lg";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <Confirm msg={confirm.msg} onYes={() => { confirm.fn(); setConfirm(null); }} onNo={() => setConfirm(null)} />}

      {/* ───── HEADER ───── */}
      <header style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)' }} className="text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏠</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">سامانه مالکیت املاک</h1>
                <p className="text-indigo-200 text-xs mt-0.5">ثبت • انتقال • محاسبه</p>
              </div>
            </div>
            <button
              onClick={() => setConfirm({ msg: 'تمام اطلاعات پاک شوند؟', fn: () => { setOwners([]); setTransfers([]); setArea(0); localStorage.removeItem('mlk_data'); showToast('همه اطلاعات پاک شد', 'info'); } })}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
              title="پاک کردن همه"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-6xl mx-auto px-2">
          <div className="flex gap-1 bg-white/10 p-1 rounded-t-2xl">
            {([
              [1, '📋', 'ثبت مالکین'],
              [2, '🔄', 'انتقال سهم'],
              [3, '📊', 'گزارش نهایی'],
              [4, '❓', 'راهنما'],
            ] as const).map(([k, icon, lbl]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
                  tab === k ? 'bg-white text-indigo-700 shadow-lg' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span className="text-sm sm:text-base">{icon}</span>
                <span>{lbl}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ───── MAIN ───── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6">

        {/* ════════════ TAB 1: OWNERS ════════════ */}
        {tab === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <div className={card + " p-6 sm:p-8"}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-100 text-emerald-700 w-10 h-10 flex items-center justify-center rounded-2xl text-lg font-bold">۱</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">ثبت مالکین اولیه</h2>
                    <p className="text-gray-400 text-xs">مالکین ملک و سهم هر کدام</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={label}>مساحت کل ملک (متر مربع)</label>
                    <input type="number" inputMode="decimal" value={area || ''} onChange={e => setArea(parseFloat(e.target.value) || 0)} placeholder="مثلاً ۵۰۰" className={inputCenter} />
                  </div>

                  <div style={{ borderTop: '2px dashed #e5e7eb', margin: '8px 0' }}></div>

                  <div>
                    <label className={label}>نام مالک</label>
                    <input type="text" value={f1n} onChange={e => setF1n(e.target.value)} placeholder="مثلاً: علی رضایی" list="dl1" className={input} />
                    <datalist id="dl1">{allNames.map(n => <option key={n} value={n} />)}</datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>سهم جزء (صورت)</label>
                      <input type="number" inputMode="numeric" value={f1num} onChange={e => setF1num(e.target.value)} placeholder="مثلاً ۳" className={inputCenter} />
                    </div>
                    <div>
                      <label className={label}>سهم کل (مخرج)</label>
                      <input type="number" inputMode="numeric" value={f1den} onChange={e => setF1den(e.target.value)} placeholder="مثلاً ۶" className={inputCenter} />
                    </div>
                  </div>

                  {f1num && f1den && parseInt(f1num) > 0 && parseInt(f1den) > 0 && (
                    <div className="text-center bg-indigo-50 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold">
                      ✨ {((parseInt(f1num) / parseInt(f1den)) * 100).toFixed(2)}% مالکیت
                      {area > 0 && ` = ${((parseInt(f1num) / parseInt(f1den)) * area).toFixed(2)} متر مربع`}
                    </div>
                  )}

                  <div>
                    <label className={label}>تاریخ مالکیت</label>
                    <input type="text" value={f1date} onChange={e => setF1date(e.target.value)} placeholder="مثلاً ۱۴۰۲/۰۶/۱۵" className={input} />
                  </div>

                  <div>
                    <label className={label}>توضیحات (اختیاری)</label>
                    <textarea value={f1note} onChange={e => setF1note(e.target.value)} rows={2} placeholder="..." className={input + " resize-none"} />
                  </div>

                  <button onClick={addOwner}
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                    className="w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                  >
                    <span className="text-xl">+</span> افزودن مالک
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-3">
              <div className={card}>
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    لیست مالکین ثبت‌شده
                  </span>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">{owners.length} نفر</span>
                </div>

                {owners.length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <div className="text-6xl mb-4 opacity-30">🏡</div>
                    <p className="font-medium">هنوز مالکی ثبت نشده</p>
                    <p className="text-sm mt-1">از فرم کنار مالکین اولیه را اضافه کنید</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[70vh] overflow-auto custom-scroll">
                    {owners.map((o, i) => (
                      <div key={o.id} className="px-5 py-4 flex items-center gap-3 hover:bg-blue-50/40 transition-all group">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 truncate">{o.name}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold">
                              {fmtFrac(o.shareNumerator, o.shareDenominator)}
                            </span>
                            {o.acquisitionDate !== '-' && <span>📅 {o.acquisitionDate}</span>}
                            {o.notes && <span className="text-amber-600 truncate max-w-[120px]">💬 {o.notes}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirm({ msg: `مالک «${o.name}» حذف شود؟`, fn: () => { setOwners(p => p.filter(x => x.id !== o.id)); showToast(`«${o.name}» حذف شد`, 'info'); } })}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                          title="حذف"
                        >🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TAB 2: TRANSFERS ════════════ */}
        {tab === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <div className={card + " p-6 sm:p-8"}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-amber-100 text-amber-700 w-10 h-10 flex items-center justify-center rounded-2xl text-lg font-bold">۲</div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">انتقال مالکیت</h2>
                    <p className="text-gray-400 text-xs">ثبت خرید و فروش سهم</p>
                  </div>
                </div>

                {currentOwners.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <div className="text-5xl mb-3 opacity-30">⚠️</div>
                    <p className="font-medium">ابتدا مالکین را در تب اول ثبت کنید</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={label}>فروشنده (انتقال‌دهنده)</label>
                      <select value={f2seller} onChange={e => setF2seller(e.target.value)} className={input}>
                        <option value="">انتخاب کنید...</option>
                        {currentOwners.map(name => (
                          <option key={name} value={name}>{name} — {(getFrac(name) * 100).toFixed(2)}%</option>
                        ))}
                      </select>
                      {f2seller && (
                        <div className="mt-2 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-2 rounded-xl">
                          سهم فعلی «{f2seller}»: {(getFrac(f2seller) * 100).toFixed(2)}%
                          {area > 0 && ` = ${(getFrac(f2seller) * area).toFixed(2)} متر`}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={label}>خریدار (انتقال‌گیرنده)</label>
                      <input type="text" value={f2buyer} onChange={e => setF2buyer(e.target.value)} list="dl2" placeholder="نام خریدار" className={input} />
                      <datalist id="dl2">{allNames.filter(n => n !== f2seller).map(n => <option key={n} value={n} />)}</datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label}>سهم جزء انتقال</label>
                        <input type="number" inputMode="numeric" value={f2num} onChange={e => setF2num(e.target.value)} placeholder="صورت" className={inputCenter} />
                      </div>
                      <div>
                        <label className={label}>سهم کل انتقال</label>
                        <input type="number" inputMode="numeric" value={f2den} onChange={e => setF2den(e.target.value)} placeholder="مخرج" className={inputCenter} />
                      </div>
                    </div>

                    {f2num && f2den && parseInt(f2num) > 0 && parseInt(f2den) > 0 && (
                      <div className="text-center bg-amber-50 text-amber-700 py-2.5 rounded-xl text-sm font-semibold">
                        🔄 انتقال {((parseInt(f2num) / parseInt(f2den)) * 100).toFixed(2)}%
                        {area > 0 && ` = ${((parseInt(f2num) / parseInt(f2den)) * area).toFixed(2)} متر`}
                      </div>
                    )}

                    <div>
                      <label className={label}>تاریخ انتقال</label>
                      <input type="text" value={f2date} onChange={e => setF2date(e.target.value)} placeholder="مثلاً ۱۴۰۳/۰۱/۲۰" className={input} />
                    </div>

                    <div>
                      <label className={label}>توضیحات (اختیاری)</label>
                      <textarea value={f2note} onChange={e => setF2note(e.target.value)} rows={2} placeholder="..." className={input + " resize-none"} />
                    </div>

                    <button onClick={addTransfer}
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                      className="w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                    >
                      🔄 ثبت انتقال مالکیت
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transfers List */}
            <div className="lg:col-span-3">
              <div className={card}>
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    تاریخچه انتقال‌ها
                  </span>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{transfers.length} مورد</span>
                </div>

                {transfers.length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <div className="text-6xl mb-4 opacity-30">🔄</div>
                    <p className="font-medium">هنوز انتقالی ثبت نشده</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[70vh] overflow-auto custom-scroll">
                    {transfers.map((t, i) => (
                      <div key={t.id} className="px-5 py-4 hover:bg-orange-50/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg">{t.sellerName}</span>
                              <span className="text-gray-400">←</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{t.buyerName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-semibold">
                                {fmtFrac(t.transferredNumerator, t.transferredDenominator)}
                              </span>
                              <span>({((t.transferredNumerator / t.transferredDenominator) * 100).toFixed(2)}%)</span>
                              {t.transferDate !== '-' && <span>📅 {t.transferDate}</span>}
                              {t.notes && <span className="text-amber-600 truncate max-w-[100px]">💬 {t.notes}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => setConfirm({ msg: 'این انتقال حذف شود؟', fn: () => { setTransfers(p => p.filter(x => x.id !== t.id)); showToast('انتقال حذف شد', 'info'); } })}
                            className="p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                          >🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TAB 3: REPORT ════════════ */}
        {tab === 3 && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                ['مساحت کل', area || '—', 'متر مربع', '#4f46e5'],
                ['مالکین فعال', finals.length, 'نفر', '#059669'],
                ['ثبت اولیه', owners.length, 'نفر', '#7c3aed'],
                ['انتقال‌ها', transfers.length, 'مورد', '#d97706'],
              ].map(([title, val, unit, color], i) => (
                <div key={i} className={card + " p-4 sm:p-5 text-center"}>
                  <div className="text-gray-400 text-xs mb-1">{title as string}</div>
                  <div className="text-2xl sm:text-3xl font-bold" style={{ color: color as string }}>{val as string}</div>
                  <div className="text-gray-400 text-[10px]">{unit as string}</div>
                </div>
              ))}
            </div>

            <div className={card}>
              <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} className="text-white px-6 py-4 flex items-center justify-between">
                <span className="font-bold text-lg flex items-center gap-2">📊 گزارش نهایی</span>
                <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold no-print transition-all">
                  🖨️ چاپ
                </button>
              </div>

              {finals.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <div className="text-7xl mb-4 opacity-20">📊</div>
                  <p className="text-lg font-medium">هنوز اطلاعاتی وجود ندارد</p>
                  <p className="text-sm mt-2">ابتدا مالکین را در تب اول ثبت کنید</p>
                </div>
              ) : (
                <div>
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs font-semibold">
                          <th className="py-3 px-4 text-right w-12">ردیف</th>
                          <th className="py-3 px-4 text-right">نام مالک</th>
                          <th className="py-3 px-4 text-center">سهم</th>
                          <th className="py-3 px-4 text-center">درصد</th>
                          <th className="py-3 px-4 text-center">مساحت (متر²)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {finals.map((f, i) => (
                          <tr key={f.name} className="hover:bg-indigo-50/30">
                            <td className="py-4 px-4">
                              <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">{i + 1}</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-gray-800 text-base">{f.name}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold">{fmtFrac(f.shareNumerator, f.shareDenominator)}</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, f.percentage)}%` }}></div>
                                </div>
                                <span className="text-emerald-700 font-bold text-sm">{f.percentage}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-violet-700">{f.area}</span>
                              <span className="text-gray-400 text-xs mr-0.5">م²</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-violet-50 border-t-2 border-violet-200">
                          <td colSpan={2} className="py-4 px-4 font-bold text-violet-800">جمع کل</td>
                          <td className="py-4 px-4 text-center text-violet-500">—</td>
                          <td className="py-4 px-4 text-center font-bold text-violet-700">{finals.reduce((s, o) => s + o.percentage, 0).toFixed(2)}%</td>
                          <td className="py-4 px-4 text-center font-bold text-violet-700">{finals.reduce((s, o) => s + o.area, 0).toFixed(2)} م²</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {finals.map((f, i) => (
                      <div key={f.name} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm">{i + 1}</span>
                          <span className="font-bold text-gray-800 text-lg">{f.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-blue-400 mb-1">سهم</div>
                            <div className="text-blue-700 font-bold text-sm">{fmtFrac(f.shareNumerator, f.shareDenominator)}</div>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-emerald-400 mb-1">درصد</div>
                            <div className="text-emerald-700 font-bold text-sm">{f.percentage}%</div>
                          </div>
                          <div className="bg-violet-50 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-violet-400 mb-1">مساحت</div>
                            <div className="text-violet-700 font-bold text-sm">{f.area} م²</div>
                          </div>
                        </div>
                        <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, f.percentage)}%` }}></div>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-violet-50 text-center">
                      <div className="text-sm text-violet-500 mb-1">جمع کل</div>
                      <div className="flex justify-center gap-6">
                        <span className="text-violet-700 font-bold text-lg">{finals.reduce((s, o) => s + o.percentage, 0).toFixed(2)}%</span>
                        <span className="text-violet-700 font-bold text-lg">{finals.reduce((s, o) => s + o.area, 0).toFixed(2)} م²</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ TAB 4: HELP ════════════ */}
        {tab === 4 && (
          <div className="max-w-3xl mx-auto space-y-6">

            {/* How to run */}
            <div className={card + " p-6 sm:p-8"}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                📱 اجرا روی همه دستگاه‌ها (بدون نصب)
              </h2>

              <div className="space-y-5">
                {([
                  ['🤖', 'اندروید', '#059669', '#ecfdf5', '#d1fae5', [
                    'فایل index.html را با تلگرام، واتساپ یا ایمیل به گوشی بفرستید',
                    'فایل را دانلود کنید و از File Manager با Chrome باز کنید',
                    'اختیاری: سه‌نقطه ⋮ ← «افزودن به صفحه اصلی» (مثل اپ واقعی!)',
                  ]],
                  ['🍎', 'آیفون / آیپد', '#0284c7', '#f0f9ff', '#e0f2fe', [
                    'فایل را با تلگرام/واتساپ/ایمیل بفرستید',
                    'با Safari باز کنید',
                    'دکمه اشتراک‌گذاری ← "Add to Home Screen"',
                  ]],
                  ['🪟', 'ویندوز', '#4f46e5', '#eef2ff', '#e0e7ff', [
                    'فایل index.html را ذخیره کنید',
                    'روی فایل دابل‌کلیک کنید — در مرورگر باز می‌شود!',
                  ]],
                  ['💻', 'مک', '#374151', '#f9fafb', '#f3f4f6', [
                    'فایل را ذخیره و دابل‌کلیک کنید',
                  ]],
                  ['🐧', 'لینوکس', '#d97706', '#fffbeb', '#fef3c7', [
                    'فایل را با Firefox باز کنید',
                  ]],
                ] as const).map(([icon, title, color, bg, border, steps]) => (
                  <div key={title} style={{ background: bg, borderColor: border }} className="rounded-2xl p-5 border">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{icon}</span>
                      <h3 className="text-lg font-bold" style={{ color }}>{title}</h3>
                    </div>
                    <div className="space-y-2">
                      {(steps as readonly string[]).map((step, i) => (
                        <div key={i} className="flex gap-2 items-start text-sm text-gray-700">
                          <span style={{ background: color, color: '#fff' }} className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <p>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">💡 نکات مهم</h3>
              <div className="space-y-3 text-gray-300 text-sm">
                {[
                  ['✅', 'بدون اینترنت کار می‌کند (آفلاین)'],
                  ['✅', 'بدون نصب — فقط مرورگر لازم است'],
                  ['✅', 'ذخیره خودکار اطلاعات در مرورگر'],
                  ['✅', 'یک فایل HTML — قابل کپی و اشتراک‌گذاری'],
                  ['✅', 'قابلیت چاپ گزارش نهایی'],
                  ['⚠️', 'اگر حافظه مرورگر پاک شود، اطلاعات هم پاک می‌شود'],
                ].map(([icon, text], i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span>{icon}</span><p>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub & Download Section */}
            <div className={card + " p-6 sm:p-8"}>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                📥 دانلود فایل و انتشار در گیت‌هاب
              </h2>
              <p className="text-gray-400 text-sm mb-6">فایل HTML را دانلود یا کپی کنید و در GitHub Pages منتشر کنید</p>

              {/* Big Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚨</span>
                  <div>
                    <h4 className="font-bold text-red-800 text-base mb-1">مهم: فایل App.tsx را کپی نکنید!</h4>
                    <p className="text-red-700 text-sm leading-relaxed">
                      فایل <code className="bg-red-100 px-1 rounded text-xs">App.tsx</code> کد سورس است و مرورگر نمی‌تواند آن را اجرا کند.
                      شما باید فایل <strong>بیلد‌شده</strong> (<code className="bg-red-100 px-1 rounded text-xs">dist/index.html</code>) را استفاده کنید.
                      <br />
                      از دکمه‌های زیر استفاده کنید تا فایل صحیح را دریافت کنید:
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Download Button */}
                <button
                  onClick={() => {
                    const html = (window as any).__ORIGINAL_HTML__ || ('<!DOCTYPE html>\n' + document.documentElement.outerHTML);
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'index.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('فایل index.html دانلود شد! حالا آن را به GitHub آپلود کنید', 'ok');
                  }}
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                  className="text-white font-bold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-lg active:scale-[0.97] transition-transform"
                >
                  <span className="text-2xl">💾</span>
                  دانلود فایل index.html
                </button>

                {/* Copy Button */}
                <button
                  onClick={async () => {
                    const html = (window as any).__ORIGINAL_HTML__ || ('<!DOCTYPE html>\n' + document.documentElement.outerHTML);
                    try {
                      await navigator.clipboard.writeText(html);
                      showToast('کد HTML کامل کپی شد! در GitHub پیست کنید ✅', 'ok');
                    } catch {
                      const ta = document.createElement('textarea');
                      ta.value = html;
                      ta.style.cssText = 'position:fixed;opacity:0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      showToast('کد HTML کامل کپی شد! در GitHub پیست کنید ✅', 'ok');
                    }
                  }}
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                  className="text-white font-bold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-lg active:scale-[0.97] transition-transform"
                >
                  <span className="text-2xl">📋</span>
                  کپی کل کد HTML
                </button>
              </div>

              {/* GitHub Guide */}
              <div className="bg-gray-900 text-white rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">🐙</span>
                  انتشار در GitHub Pages — مثال: absa90.github.io/Saham
                </h4>

                <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-4 text-red-200 text-sm mb-4">
                  <strong className="text-red-300">⛔ اشتباه رایج:</strong> فایل <code className="bg-red-800 px-1 rounded">App.tsx</code> را در GitHub نگذارید! آن کد سورس React است. 
                  فقط فایل <strong className="text-white">index.html</strong> که با دکمه بالا دانلود می‌کنید را آپلود کنید.
                </div>

                <div className="space-y-4 text-gray-300 text-sm">

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۱</span>
                      <div>
                        <p className="text-white font-semibold">دانلود فایل صحیح</p>
                        <p className="mt-1">دکمه سبز <strong className="text-emerald-400">«💾 دانلود فایل index.html»</strong> بالا را بزنید.</p>
                        <p className="text-gray-500 text-xs mt-1">⚠️ این فایل حدود ۲۵۰ کیلوبایت است و شامل تمام CSS و JavaScript است.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۲</span>
                      <div>
                        <p className="text-white font-semibold">ریپازیتوری Saham را باز کنید</p>
                        <p className="mt-1">بروید به <a href="https://github.com/absa90/Saham" target="_blank" rel="noopener" className="text-emerald-400 underline">github.com/absa90/Saham</a></p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۳</span>
                      <div>
                        <p className="text-white font-semibold">فایل قبلی را حذف کنید (اگر وجود دارد)</p>
                        <p className="mt-1">اگر قبلاً فایل index.html اشتباهی آپلود کرده‌اید:
                        روی فایل کلیک → آیکون 🗑️ (Delete) → Commit changes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۴</span>
                      <div>
                        <p className="text-white font-semibold">فایل جدید را آپلود کنید</p>
                        <p className="mt-1">
                          دکمه <strong className="text-white">«Add file»</strong> → <strong className="text-white">«Upload files»</strong><br/>
                          فایل <code className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">index.html</code> دانلود شده را بکشید (Drag) یا Choose کنید<br/>
                          دکمه سبز <strong className="text-white">«Commit changes»</strong> را بزنید
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۵</span>
                      <div>
                        <p className="text-white font-semibold">GitHub Pages را فعال کنید</p>
                        <p className="mt-1">
                          <strong className="text-white">Settings</strong> (تب بالا) → 
                          <strong className="text-white">Pages</strong> (منوی سمت چپ) →<br/>
                          Source: <strong className="text-white">Deploy from a branch</strong><br/>
                          Branch: <strong className="text-white">main</strong> — Folder: <strong className="text-white">/ (root)</strong><br/>
                          دکمه <strong className="text-white">Save</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex gap-3 items-start">
                      <span className="bg-emerald-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">۶</span>
                      <div>
                        <p className="text-white font-semibold">۲ دقیقه صبر کنید و تست کنید!</p>
                        <p className="mt-1">بروید به: <code className="bg-emerald-900 text-emerald-300 px-2 py-1 rounded text-sm font-bold">absa90.github.io/Saham</code></p>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-4 mt-4 text-emerald-300 text-sm">
                  🎉 <strong>تمام!</strong> حالا لینک <code className="bg-emerald-900 px-1 rounded">absa90.github.io/Saham</code> روی هر گوشی و کامپیوتری کار می‌کند!
                </div>
              </div>

              {/* Alternative: paste code directly */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mt-6">
                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <span>💡</span> روش جایگزین: پیست مستقیم کد
                </h4>
                <div className="text-amber-700 text-sm space-y-2">
                  <p>اگر آپلود فایل کار نکرد، می‌توانید کد را مستقیماً پیست کنید:</p>
                  <ol className="space-y-1 pr-4">
                    <li>۱. دکمه بنفش <strong>«📋 کپی کل کد HTML»</strong> بالا را بزنید</li>
                    <li>۲. در GitHub روی <strong>Add file → Create new file</strong> کلیک کنید</li>
                    <li>۳. اسم فایل را <code className="bg-amber-100 px-1 rounded">index.html</code> بگذارید</li>
                    <li>۴. در قسمت محتوا <strong>Ctrl+V</strong> (یا Paste) بزنید</li>
                    <li>۵. <strong>Commit changes</strong> را بزنید</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Usage Guide */}
            <div className={card + " p-6 sm:p-8"}>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">📖 راهنمای استفاده</h3>

              <div className="space-y-5">
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-2">مرحله ۱: ثبت مالکین</h4>
                  <ul className="space-y-1 text-sm text-gray-700 pr-3">
                    <li>• مساحت ملک را وارد کنید (مثلاً ۶۰۰ متر)</li>
                    <li>• نام مالک + سهم جزء (صورت) + سهم کل (مخرج)</li>
                    <li>• مثال: ۳ از ۶ یعنی ۵۰ درصد</li>
                  </ul>
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <h4 className="font-bold text-amber-800 mb-2">مرحله ۲: انتقال سهم</h4>
                  <ul className="space-y-1 text-sm text-gray-700 pr-3">
                    <li>• فروشنده را از لیست انتخاب کنید</li>
                    <li>• نام خریدار (جدید یا موجود)</li>
                    <li>• سهم انتقال به صورت کسری</li>
                  </ul>
                </div>

                <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
                  <h4 className="font-bold text-violet-800 mb-2">مرحله ۳: گزارش نهایی</h4>
                  <ul className="space-y-1 text-sm text-gray-700 pr-3">
                    <li>• محاسبه خودکار سهم و مساحت هر مالک</li>
                    <li>• حذف خودکار مالکین بدون سهم</li>
                    <li>• قابلیت چاپ</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <h4 className="font-bold text-gray-700 mb-2">مثال عملی:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>🔹 ملک ۶۰۰ متری، ۳ مالک:</p>
                    <p className="pr-4">علی: ۳ از ۶ (۳۰۰م) • حسن: ۲ از ۶ (۲۰۰م) • رضا: ۱ از ۶ (۱۰۰م)</p>
                    <p className="mt-2">🔹 علی ۱ از ۶ را به محمد می‌فروشد:</p>
                    <p className="pr-4">→ علی ۲/۶ • حسن ۲/۶ • رضا ۱/۶ • محمد ۱/۶</p>
                    <p className="mt-2">🔹 رضا کل سهمش (۱/۶) را به حسن می‌فروشد:</p>
                    <p className="pr-4">→ علی ۲/۶ • حسن ۳/۶ • محمد ۱/۶ (رضا حذف شد!)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400 no-print">
        سامانه مالکیت املاک — تحت وب — بدون نیاز به نصب
      </footer>
    </div>
  );
}
