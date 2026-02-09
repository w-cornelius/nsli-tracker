import React, { useState, useEffect, useMemo } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { 
  Activity, Calendar, Target, TrendingUp, Trash2, 
  Plus, Calculator, Settings, Save, Menu, X
} from 'lucide-react';

// IMPORT YOUR FIREBASE INSTANCE
import { auth, db } from './firebase';

// Hardcoded ID for your specific app data structure
const APP_ID = 'nsli-tracker-production';

// --- Helper Functions ---
const getFiscalYearRange = (today = new Date()) => {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); 
  let startYear = currentMonth >= 10 ? currentYear : currentYear - 1;
  let endYear = startYear + 1;
  const start = new Date(startYear, 10, 1); 
  const end = new Date(endYear, 9, 31); 
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMTDRange = (today = new Date()) => {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getRolling30Range = (today = new Date()) => {
  const end = new Date(today);
  end.setDate(today.getDate() - 1); 
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 29); 
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const getWTDRange = (today = new Date()) => {
  const currentDay = today.getDay(); 
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; 
  const start = new Date(today);
  start.setDate(today.getDate() + diffToMonday); 
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() - 1); 
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

// --- Components ---

const AuthScreen = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NSLI Tracker</h1>
          <p className="text-slate-400">Track your performance, crush your goals.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, data, goals, subtext, icon: Icon }) => {
  const { sales, leads, cancellations } = data;
  const netSales = sales - cancellations;
  const nsli = leads > 0 ? netSales / leads : 0;
  
  let colorClass = 'text-red-400';
  let bgClass = 'bg-red-500/10 border-red-500/20';
  
  if (nsli >= goals.high) {
    colorClass = 'text-emerald-400';
    bgClass = 'bg-emerald-500/10 border-emerald-500/20';
  } else if (nsli >= goals.medium) {
    colorClass = 'text-yellow-400';
    bgClass = 'bg-yellow-500/10 border-yellow-500/20';
  }

  return (
    <div className={`p-6 rounded-2xl border ${bgClass} transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
          <p className="text-slate-500 text-xs mt-1">{subtext}</p>
        </div>
        {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
      </div>
      
      <div className="flex items-baseline space-x-2">
        <h2 className={`text-3xl font-bold ${colorClass}`}>
          {formatCurrency(nsli)}
        </h2>
        <span className="text-slate-500 text-sm">NSLI</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400">Net Sales</div>
          <div className="font-semibold text-white">{formatCurrency(netSales)}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400">Leads</div>
          <div className="font-semibold text-white">{leads}</div>
        </div>
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400">Cancels</div>
          <div className="font-semibold text-red-400">{formatCurrency(cancellations)}</div>
        </div>
      </div>
    </div>
  );
};

const CalculatorSection = ({ goals }) => {
  const [mode, setMode] = useState('daily'); 
  const [apptCount, setApptCount] = useState(2);
  const [targetNsli, setTargetNsli] = useState(goals.high);
  
  const [currentSales, setCurrentSales] = useState(0);
  const [currentLeads, setCurrentLeads] = useState(0);
  const [newSaleAmount, setNewSaleAmount] = useState(0);

  const neededSales = apptCount * targetNsli;
  const scenarioNetSales = parseFloat(currentSales) + parseFloat(newSaleAmount);
  const scenarioNsli = currentLeads > 0 ? scenarioNetSales / currentLeads : 0;

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <div className="flex items-center space-x-2 mb-6">
        <Calculator className="text-blue-400 w-6 h-6" />
        <h2 className="text-xl font-bold text-white">Calculators</h2>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-slate-700">
        <button 
          onClick={() => setMode('daily')}
          className={`pb-2 text-sm font-medium transition-colors ${mode === 'daily' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
        >
          Daily Target
        </button>
        <button 
          onClick={() => setMode('scenario')}
          className={`pb-2 text-sm font-medium transition-colors ${mode === 'scenario' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
        >
          What If?
        </button>
      </div>

      {mode === 'daily' ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Calculate required sales based on today's appointments.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Appointments Today</label>
              <input 
                type="number" 
                value={apptCount}
                onChange={(e) => setApptCount(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target NSLI</label>
              <input 
                type="number" 
                value={targetNsli}
                onChange={(e) => setTargetNsli(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
            </div>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl text-center">
            <div className="text-slate-400 text-sm mb-1">You need to sell</div>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(neededSales)}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">See how a new sale affects your current stats.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Net Sales</label>
              <input 
                type="number" 
                value={currentSales}
                onChange={(e) => setCurrentSales(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Leads</label>
              <input 
                type="number" 
                value={currentLeads}
                onChange={(e) => setCurrentLeads(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
            </div>
          </div>
          <div>
             <label className="block text-xs text-slate-400 mb-1">New Sale Amount (Add)</label>
             <input 
                type="number" 
                value={newSaleAmount}
                onChange={(e) => setNewSaleAmount(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white font-bold"
              />
          </div>
          <div className="bg-emerald-900/30 border border-emerald-500/30 p-4 rounded-xl text-center">
            <div className="text-slate-400 text-sm mb-1">New NSLI</div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(scenarioNsli)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [entries, setEntries] = useState([]);
  const [goals, setGoals] = useState({ high: 5000, medium: 3000 });
  const [loading, setLoading] = useState(true);
  
  const [entryDate, setEntryDate] = useState(formatDate(new Date()));
  const [entrySales, setEntrySales] = useState('');
  const [entryLeads, setEntryLeads] = useState('');
  const [entryCancels, setEntryCancels] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const settingsUnsub = onSnapshot(
      doc(db, 'nsli_tracker', APP_ID, 'users', user.uid, 'settings', 'config'),
      (docSnap) => {
        if (docSnap.exists()) {
          setGoals(docSnap.data().goals || { high: 5000, medium: 3000 });
        }
      },
      (err) => console.error("Settings error", err)
    );

    const q = query(collection(db, 'nsli_tracker', APP_ID, 'users', user.uid, 'entries'), orderBy('date', 'desc'));
    const entriesUnsub = onSnapshot(q, (snapshot) => {
      const loadedEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(loadedEntries);
      setLoading(false);
    }, (err) => {
      console.error("Entries error", err);
      setLoading(false);
    });

    return () => {
      settingsUnsub();
      entriesUnsub();
    };
  }, [user]);

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'nsli_tracker', APP_ID, 'users', user.uid, 'entries'), {
        date: entryDate,
        sales: Number(entrySales) || 0,
        leads: Number(entryLeads) || 0,
        cancellations: Number(entryCancels) || 0,
        timestamp: serverTimestamp()
      });
      setEntrySales('');
      setEntryLeads('');
      setEntryCancels('');
      setView('dashboard');
    } catch (err) {
      console.error("Error saving entry:", err);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'nsli_tracker', APP_ID, 'users', user.uid, 'entries', id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleSaveGoals = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'nsli_tracker', APP_ID, 'users', user.uid, 'settings', 'config'), {
        goals
      }, { merge: true });
      setView('dashboard');
    } catch (err) {
      console.error("Error saving goals:", err);
    }
  };

  const calculateMetrics = (entryList) => {
    const today = new Date();
    const ytdRange = getFiscalYearRange(today);
    const mtdRange = getMTDRange(today);
    const rollRange = getRolling30Range(today);
    const wtdRange = getWTDRange(today);

    const aggregates = {
      ytd: { sales: 0, leads: 0, cancellations: 0 },
      mtd: { sales: 0, leads: 0, cancellations: 0 },
      rolling: { sales: 0, leads: 0, cancellations: 0 },
      wtd: { sales: 0, leads: 0, cancellations: 0 }
    };

    entryList.forEach(entry => {
      const entryDateObj = new Date(entry.date + 'T00:00:00'); 
      const time = entryDateObj.getTime();

      if (time >= ytdRange.start.getTime() && time <= ytdRange.end.getTime()) {
        aggregates.ytd.sales += entry.sales;
        aggregates.ytd.leads += entry.leads;
        aggregates.ytd.cancellations += entry.cancellations;
      }
      
      if (time >= mtdRange.start.getTime() && time <= mtdRange.end.getTime()) {
        aggregates.mtd.sales += entry.sales;
        aggregates.mtd.leads += entry.leads;
        aggregates.mtd.cancellations += entry.cancellations;
      }

      if (time >= rollRange.start.getTime() && time <= rollRange.end.getTime()) {
        aggregates.rolling.sales += entry.sales;
        aggregates.rolling.leads += entry.leads;
        aggregates.rolling.cancellations += entry.cancellations;
      }

      if (time >= wtdRange.start.getTime() && time <= wtdRange.end.getTime()) {
        aggregates.wtd.sales += entry.sales;
        aggregates.wtd.leads += entry.leads;
        aggregates.wtd.cancellations += entry.cancellations;
      }
    });

    return aggregates;
  };

  const stats = useMemo(() => calculateMetrics(entries), [entries]);

  if (!user) return <AuthScreen setUser={setUser} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2" onClick={() => setView('dashboard')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block">NSLI Tracker</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => setView('dashboard')}
              className={`text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('entry')}
              className={`text-sm font-medium transition-colors ${view === 'entry' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              History & Entry
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`text-sm font-medium transition-colors ${view === 'settings' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Goals
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">{user.displayName || 'User'}</div>
              <button onClick={() => signOut(auth)} className="text-xs text-red-400 hover:text-red-300">Sign Out</button>
            </div>
            {/* Mobile Menu Toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden bg-slate-800 border-b border-slate-700 p-4 space-y-4">
          <button onClick={() => { setView('dashboard'); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Dashboard</button>
          <button onClick={() => { setView('entry'); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">History & Entry</button>
          <button onClick={() => { setView('settings'); setMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Goals</button>
          <button onClick={() => signOut(auth)} className="block w-full text-left text-red-400 py-2">Sign Out</button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 pb-20">
        
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Overview</h2>
              <button 
                onClick={() => setView('entry')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Year to Date" 
                subtext="Fiscal (Nov 1 - Oct 31)"
                data={stats.ytd} 
                goals={goals} 
                icon={TrendingUp}
              />
              <StatCard 
                title="Month to Date" 
                subtext="Current Month"
                data={stats.mtd} 
                goals={goals}
                icon={Calendar}
              />
              <StatCard 
                title="Rolling 30" 
                subtext="Last 30 Days (Lagging)"
                data={stats.rolling} 
                goals={goals}
                icon={Activity}
              />
              <StatCard 
                title="Week to Date" 
                subtext="Mon - Yesterday"
                data={stats.wtd} 
                goals={goals}
                icon={Target}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                 <h3 className="font-bold text-lg mb-4 text-white">Goal Reference</h3>
                 <div className="space-y-4">
                    <div className="flex items-center">
                        <div className="w-24 text-sm text-slate-400">High</div>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 w-full opacity-80"></div>
                        </div>
                        <div className="w-24 text-right font-mono text-emerald-400">{formatCurrency(goals.high)}+</div>
                    </div>
                    <div className="flex items-center">
                        <div className="w-24 text-sm text-slate-400">Medium</div>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-yellow-500 w-3/4 opacity-80"></div>
                        </div>
                        <div className="w-24 text-right font-mono text-yellow-400">{formatCurrency(goals.medium)}</div>
                    </div>
                    <div className="flex items-center">
                        <div className="w-24 text-sm text-slate-400">Low</div>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 w-1/4 opacity-80"></div>
                        </div>
                        <div className="w-24 text-right font-mono text-red-400">&lt; {formatCurrency(goals.medium)}</div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-1">
                <CalculatorSection goals={goals} />
              </div>
            </div>
          </div>
        )}

        {view === 'entry' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-900/50 p-2 rounded-lg">
                  <Plus className="text-blue-400 w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">New Entry</h2>
              </div>
              
              <form onSubmit={handleSaveEntry} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                   <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Gross Sales</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400">$</span>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={entrySales}
                        onChange={(e) => setEntrySales(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cancellations</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-red-400">$</span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={entryCancels}
                        onChange={(e) => setEntryCancels(e.target.value)}
                        className="w-full bg-slate-700 border border-red-900/50 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Leads Issued (Appointments)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    placeholder="0"
                    value={entryLeads}
                    onChange={(e) => setEntryLeads(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save Entry</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-300 pl-1">Recent History</h3>
              {entries.length === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                  No entries found. Start tracking today!
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map(entry => {
                     const net = entry.sales - entry.cancellations;
                     const dailyNsli = entry.leads > 0 ? net / entry.leads : 0;
                     return (
                      <div key={entry.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-slate-600 transition-all">
                        <div>
                          <div className="font-bold text-white">{entry.date}</div>
                          <div className="text-xs text-slate-400 mt-1 flex space-x-3">
                             <span>Sales: <span className="text-slate-200">{formatCurrency(entry.sales)}</span></span>
                             <span>Leads: <span className="text-slate-200">{entry.leads}</span></span>
                             {entry.cancellations > 0 && <span className="text-red-400">Cancel: {formatCurrency(entry.cancellations)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                             <div className={`font-bold ${dailyNsli >= goals.high ? 'text-emerald-400' : dailyNsli >= goals.medium ? 'text-yellow-400' : 'text-red-400'}`}>
                                {formatCurrency(dailyNsli)}
                             </div>
                             <div className="text-[10px] text-slate-500 uppercase">NSLI</div>
                          </div>
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-slate-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                     );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-xl mx-auto">
             <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
               <div className="flex items-center space-x-3 mb-8">
                  <Settings className="text-blue-400 w-6 h-6" />
                  <h2 className="text-2xl font-bold">Goals & Settings</h2>
               </div>
               
               <div className="space-y-6">
                 <div>
                   <label className="block text-sm font-medium text-emerald-400 mb-2">High Goal (5000+)</label>
                   <div className="relative">
                      <span className="absolute left-3 top-3 text-emerald-500/50">$</span>
                      <input 
                        type="number" 
                        value={goals.high}
                        onChange={(e) => setGoals({...goals, high: Number(e.target.value)})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                   </div>
                   <p className="text-xs text-slate-500 mt-1">Metrics above this are colored green.</p>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-yellow-400 mb-2">Medium Goal (3000 - 4999)</label>
                   <div className="relative">
                      <span className="absolute left-3 top-3 text-yellow-500/50">$</span>
                      <input 
                        type="number" 
                        value={goals.medium}
                        onChange={(e) => setGoals({...goals, medium: Number(e.target.value)})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                      />
                   </div>
                   <p className="text-xs text-slate-500 mt-1">Metrics above this are colored yellow.</p>
                 </div>

                 <div className="pt-4 border-t border-slate-700">
                    <button 
                      onClick={handleSaveGoals}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all"
                    >
                      Save Preferences
                    </button>
                 </div>
               </div>
             </div>

             <div className="mt-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
               <h3 className="font-bold text-slate-300 mb-2">How Metrics Work</h3>
               <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                 <li><span className="text-white font-medium">YTD:</span> Fiscal year starting Nov 1st.</li>
                 <li><span className="text-white font-medium">MTD:</span> Current calendar month.</li>
                 <li><span className="text-white font-medium">Rolling 30:</span> Last 30 days (excluding today).</li>
                 <li><span className="text-white font-medium">WTD:</span> Monday of current week through Yesterday.</li>
               </ul>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
