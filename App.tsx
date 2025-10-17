import React, { useState, useEffect, useRef } from 'react';
import CalendarView from './components/CalendarView';
import MacroTracker from './components/MacroTracker';
import Insights from './components/Insights';
import LogFoodModal from './components/LogFoodModal';
import LogFoodActions from './components/LogFoodActions';
import BottomNav from './components/BottomNav';
import AuthPage from './components/AuthPage';
import SignupModal from './components/SignupModal';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { FoodItem, MacroGoals } from './types';
import { auth } from './services/firebase';
import {
  getLogEntries,
  addLogEntry,
  deleteLogEntry,
  subscribeToLogEntries,
  getUserProfile,
  setUserProfile
} from './services/firestoreService';
import { getFormattedDate, isSameDay } from './utils/dateUtils';
import { XIcon, PlusIcon } from './components/Icons';

type ModalTab = 'camera' | 'upload' | 'search';

const App: React.FC = () => {
  const [userInitialized, setUserInitialized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAnonymousUser, setIsAnonymousUser] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loggedFoods, setLoggedFoods] = useState<FoodItem[]>([]);
  const [goals, setGoals] = useState<MacroGoals>({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; initialTab: ModalTab }>({ isOpen: false, initialTab: 'camera' });
  const [activeSection, setActiveSection] = useState<'main' | 'insights' | 'calendar' | 'profile'>('main');
  const [showSignupModal, setShowSignupModal] = useState(false);

  const formattedDate = getFormattedDate(selectedDate);
  const lastMigratedUid = useRef<string | null>(null);
  const unsubRef = useRef<() => void | null>(null);

  // --- local fallback load/save ---
  useEffect(() => {
    try {
      const savedGoals = localStorage.getItem('macroGoals');
      if (savedGoals) setGoals(JSON.parse(savedGoals));

      if (!auth.currentUser) {
        const savedFoods = localStorage.getItem(`foodLog-${formattedDate}`);
        if (savedFoods) setLoggedFoods(JSON.parse(savedFoods));
        else setLoggedFoods([]);
      }
    } catch (e) {
      console.error('Failed to load local data', e);
      setLoggedFoods([]);
    }
  }, [selectedDate, formattedDate]);

  useEffect(() => {
    try {
      localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(loggedFoods));
    } catch (e) {
      console.error('Failed to save local logs', e);
    }
  }, [loggedFoods, formattedDate]);

  // --- migrate localStorage per-day logs into Firestore (dedupe) ---
  const migrateLocalToFirestore = async (uid: string) => {
    if (!uid) return;
    if (lastMigratedUid.current === uid) return;
    try {
      const remoteEntries = await getLogEntries(uid).catch(() => []);
      const remoteSet = new Set<string>();
      remoteEntries.forEach(e => {
        const key = `${(e as any).name}::${(e as any).timestamp || ''}`;
        remoteSet.add(key);
      });

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (!key.startsWith('foodLog-')) continue;
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]') as FoodItem[];
          for (const item of arr) {
            const ts = (item as any).timestamp || Date.now();
            const keyHash = `${item.name}::${ts}`;
            if (remoteSet.has(keyHash)) continue;
            await addLogEntry(uid, {
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              portion: item.portion,
              timestamp: ts
            });
          }
          keysToRemove.push(key);
        } catch (e) {
          console.warn('Skipping invalid local key during migration', key, e);
        }
      }

      for (const k of keysToRemove) {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      }

      lastMigratedUid.current = uid;
    } catch (e) {
      console.error('Local -> Firestore migration failed', e);
    }
  };

  // --- migrate Firestore logs from an anonymous uid (if present) into the newly signed-in uid ---
  const migrateAnonFirestoreToUid = async (anonUid: string, newUid: string) => {
    if (!anonUid || !newUid || anonUid === newUid) return;
    try {
      const anonEntries = await getLogEntries(anonUid).catch(() => []);
      if (!anonEntries.length) return;
      const remoteNew = await getLogEntries(newUid).catch(() => []);
      const remoteSet = new Set(remoteNew.map(e => `${(e as any).name}::${(e as any).timestamp || ''}`));
      for (const e of anonEntries) {
        const key = `${(e as any).name}::${(e as any).timestamp || ''}`;
        if (remoteSet.has(key)) continue;
        await addLogEntry(newUid, {
          name: e.name,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          portion: e.portion,
          timestamp: e.timestamp
        });
      }
      // remove stored pending anon marker
      try { localStorage.removeItem('pendingAnonUid'); } catch { /* ignore */ }
    } catch (err) {
      console.error('Failed to migrate anon firestore to new uid', err);
    }
  };

  // --- auth listener: ensure user doc, perform migration, subscribe to logs ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setUserInitialized(true);
      const uid = user ? user.uid : null;
      setCurrentUserId(uid);
      setIsAnonymousUser(!!(user && user.isAnonymous));

      // store pending anonymous uid if user is anonymous so we can migrate later if they create a new account
      if (user && user.isAnonymous) {
        try { localStorage.setItem('pendingAnonUid', user.uid); } catch { /* ignore */ }
      }

      if (uid) {
        // ensure user doc exists
        try {
          await setUserProfile(uid, { email: user?.email ?? null });
        } catch (e) {
          console.warn('setUserProfile failed', e);
        }

        // migrate any localStorage logs into this uid
        await migrateLocalToFirestore(uid);

        // if there was an anonymous uid saved previously (user used app anon then created new account),
        // migrate Firestore docs from that anonymous uid into the current uid
        try {
          const pendingAnonUid = localStorage.getItem('pendingAnonUid');
          if (pendingAnonUid && pendingAnonUid !== uid) {
            await migrateAnonFirestoreToUid(pendingAnonUid, uid);
          }
        } catch (e) {
          console.warn('anon -> uid migration check failed', e);
        }

        // subscribe to remote logs for this user
        if (unsubRef.current) {
          try { unsubRef.current(); } catch { /* ignore */ }
          unsubRef.current = null;
        }
        unsubRef.current = subscribeToLogEntries(uid, (entries) => {
          setLoggedFoods(entries as FoodItem[]);
        });
      } else {
        // user signed out; cleanup subscription and show local fallback
        if (unsubRef.current) {
          try { unsubRef.current(); } catch { /* ignore */ }
          unsubRef.current = null;
        }
        setLoggedFoods([]);
      }
    });

    return () => {
      try { unsubAuth(); } catch { /* ignore */ }
      if (unsubRef.current) {
        try { unsubRef.current(); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- UI actions ---
  const handleOpenModal = (tab: ModalTab) => setModalConfig({ isOpen: true, initialTab: tab });
  const handleCloseModal = () => setModalConfig({ isOpen: false, initialTab: 'camera' });

  const handleAddFood = async (foodItems: FoodItem[]) => {
    // optimistic update
    setLoggedFoods(prev => [...prev, ...foodItems]);

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      for (const item of foodItems) {
        try {
          await addLogEntry(uid, {
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            portion: item.portion,
            timestamp: (item as any).timestamp || selectedDate.getTime() || Date.now()
          });
        } catch (e) {
          console.error('Failed to persist to Firestore', e);
        }
      }
    } else {
      // saved locally by effect already
    }

    handleCloseModal();
  };

  const handleRemoveFood = async (foodId: string) => {
    setLoggedFoods(prev => prev.filter(item => item.id !== foodId));
    if (auth.currentUser) {
      try {
        await deleteLogEntry(auth.currentUser.uid, foodId);
      } catch (e) {
        console.error('Failed to delete remote entry', e);
      }
    } else {
      try {
        const updated = loggedFoods.filter(item => item.id !== foodId);
        localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update localStorage after delete', e);
      }
    }
  };

  // navigation guard
  const handleNavChange = (s: 'main' | 'insights' | 'calendar' | 'profile') => {
    if (s === 'calendar' && isAnonymousUser) {
      setShowSignupModal(true);
      return;
    }
    setActiveSection(s);
  };

  const handleCloseSignupModal = () => {
    setShowSignupModal(false);
    if (activeSection === 'calendar') setActiveSection('main');
  };

  const handleGoToAuth = async () => {
    try {
      await signOut(auth); // this will surface the AuthPage so user can sign up
    } catch (e) {
      console.error('Failed to sign out anonymous user', e);
    } finally {
      setShowSignupModal(false);
    }
  };

  // --- render ---
  if (!userInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="loader mb-4" />
          <div>Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return <AuthPage onSignedIn={() => { /* auth listener will update state */ }} />;
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans pb-24">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-emerald-400">NutriSnap AI</h1>
          <p className="text-slate-400 mt-2">Your AI-powered nutrition companion.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {activeSection === 'main' && (
            <div className="lg:col-span-2 flex items-center justify-center min-h-[60vh]">
              <LogFoodActions onAction={handleOpenModal} />
            </div>
          )}

          {activeSection === 'insights' && (
            <div className="lg:col-span-2">
              <Insights loggedFoods={loggedFoods} goals={goals} />
            </div>
          )}

          {activeSection === 'calendar' && (
            <>
              <div className="lg:col-span-2">
                <CalendarView selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </div>

              <div className="lg:col-span-1">
                <MacroTracker
                  loggedFoods={loggedFoods.filter(item => {
                    const ts = (item as any).timestamp;
                    if (typeof ts === 'number') return isSameDay(new Date(ts), selectedDate);
                    return true;
                  })}
                  goals={goals}
                />

                <div className="bg-slate-800 p-6 rounded-2xl shadow-lg mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-emerald-400">Food Log</h2>
                    <button
                      onClick={() => handleOpenModal('search')}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1 px-3 rounded-lg text-sm"
                    >
                      <PlusIcon className="w-4 h-4 inline-block mr-1" /> Add
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {loggedFoods.filter(item => {
                      const ts = (item as any).timestamp;
                      if (typeof ts === 'number') return isSameDay(new Date(ts), selectedDate);
                      return true;
                    }).length > 0 ? (
                      loggedFoods.filter(item => {
                        const ts = (item as any).timestamp;
                        if (typeof ts === 'number') return isSameDay(new Date(ts), selectedDate);
                        return true;
                      }).map(item => (
                        <div key={(item as any).id} className="bg-slate-700 p-3 rounded-lg grid grid-cols-3 items-center gap-2">
                          <div className="col-span-2">
                            <p className="font-semibold text-white truncate">{(item as any).name}</p>
                            <p className="text-xs text-slate-400">{(item as any).portion} - {(item as any).calories} kcal</p>
                          </div>
                          <div className="text-right text-xs text-slate-300 flex items-center justify-end">
                            P:{(item as any).protein} C:{(item as any).carbs} F:{(item as any).fat}
                            <button onClick={() => handleRemoveFood((item as any).id)} className="text-slate-500 hover:text-red-400 ml-3 transition-colors flex-shrink-0">
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-8">No food logged for this day yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'profile' && (
            <div className="lg:col-span-2">
              <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-emerald-400 mb-4">Profile</h2>
                <p className="text-slate-300 mb-2">{currentUserId ? `Signed in (uid: ${currentUserId})` : 'Not signed in'}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { signOut(auth); }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          {(activeSection === 'main' || activeSection === 'insights') && (
            <div className="space-y-8">
              <MacroTracker loggedFoods={loggedFoods} goals={goals} />
            </div>
          )}
        </main>

        {modalConfig.isOpen && (
          <LogFoodModal
            onClose={handleCloseModal}
            onAddFood={handleAddFood}
            initialTab={modalConfig.initialTab}
          />
        )}

        <BottomNav active={activeSection} onChange={handleNavChange} />

        <SignupModal
          open={showSignupModal}
          onClose={handleCloseSignupModal}
          onSignedIn={() => {
            setShowSignupModal(false);
            setActiveSection('calendar');
          }}
        />
      </div>
    </div>
  );
};

export default App;