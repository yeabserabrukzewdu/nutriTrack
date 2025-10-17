// ...existing code...
import React, { useState, useEffect, useRef } from 'react';
import CalendarView from './components/CalendarView';
import MacroTracker from './components/MacroTracker';
import Insights from './components/Insights';
import LogFoodModal from './components/LogFoodModal';
import LogFoodActions from './components/LogFoodActions';
import BottomNav from './components/BottomNav';
import AuthPage from './components/AuthPage';
import SignupModal from './components/SignupModal';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { FoodItem, MacroGoals } from './types';
import { auth } from './services/firebase';
import { getLogEntries, addLogEntry, deleteLogEntry, subscribeToLogEntries } from './services/firestoreService';
import { getFormattedDate, isSameDay } from './utils/dateUtils';
import { XIcon, PlusIcon } from './components/Icons';
// ...existing code...

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

  // Load local fallback (goals + today's logs) when no user
  useEffect(() => {
    const loadLocal = () => {
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
    };

    loadLocal();
  }, [selectedDate, formattedDate]);

  // Save local per-day logs as an offline fallback
  useEffect(() => {
    try {
      localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(loggedFoods));
    } catch (e) {
      console.error('Failed to save local logs', e);
    }
  }, [loggedFoods, formattedDate]);

  // migrate local per-day logs into Firestore for the signed-in user, with dedupe
  const migrateLocalToFirestore = async (uid: string) => {
    if (!uid) return;
    if (lastMigratedUid.current === uid) return; // already migrated for this user during this session
    try {
      // fetch remote entries once to compare
      const remoteEntries = await getLogEntries(uid).catch(() => [] as FoodItem[]);
      const remoteSet = new Set<string>();
      remoteEntries.forEach(e => {
        const key = `${(e as any).name}::${(e as any).timestamp || ''}`;
        remoteSet.add(key);
      });

      // iterate local storage keys
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
            if (remoteSet.has(keyHash)) {
              // already exists remotely, skip
              continue;
            }
            // write to Firestore
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
          // mark local key for removal after migration
          keysToRemove.push(key);
        } catch (e) {
          console.warn('Skipping invalid local key during migration', key, e);
        }
      }

      // remove migrated local keys to avoid re-migration and duplicates
      for (const k of keysToRemove) {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      }

      lastMigratedUid.current = uid;
    } catch (e) {
      console.error('Local -> Firestore migration failed', e);
    }
  };

  // Listen for auth state changes: initialize, set uid and anonymous flag, and migrate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUserInitialized(true);
      const uid = user ? user.uid : null;
      setCurrentUserId(uid);
      setIsAnonymousUser(!!(user && user.isAnonymous));

      if (uid) {
        // perform migration the moment a non-null user signs in
        await migrateLocalToFirestore(uid);
      } else {
        // if user signed out, keep local fallback visible
        setLoggedFoods([]);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // subscribe to Firestore logs when signed in
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToLogEntries(currentUserId, (entries) => {
      setLoggedFoods(entries as FoodItem[]);
    });
    return () => unsub();
  }, [currentUserId]);

  const handleOpenModal = (tab: ModalTab) => {
    setModalConfig({ isOpen: true, initialTab: tab });
  };

  const handleCloseModal = () => {
    setModalConfig({ isOpen: false, initialTab: 'camera' });
  };

  const handleAddFood = async (foodItems: FoodItem[]) => {
    // optimistic local update for immediate UX
    setLoggedFoods(prev => [...prev, ...foodItems]);

    // persist to Firestore if signed-in; remote subscription will reconcile ids/state
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
          // keep local copy as fallback (already added)
        }
      }
    }
    // if not signed-in, localStorage effect saves the items automatically
    handleCloseModal();
  };

  const handleRemoveFood = async (foodId: string) => {
    setLoggedFoods(prev => prev.filter(item => item.id !== foodId));
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      try {
        await deleteLogEntry(uid, foodId);
      } catch (e) {
        console.error('Failed to delete remote entry', e);
      }
    } else {
      // update local fallback for current date
      try {
        const updated = loggedFoods.filter(item => item.id !== foodId);
        localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update localStorage after delete', e);
      }
    }
  };

  // Navigation guard that blocks anonymous users from calendar view
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
      // sign out anonymous user so AuthPage / signup flow appears
      await signOut(auth);
    } catch (e) {
      console.error('Failed to sign out anonymous user', e);
    } finally {
      setShowSignupModal(false);
    }
  };

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
    return <AuthPage onSignedIn={() => { /* auth listener updates state */ }} />;
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

        {/* Bottom navigation bar */}
        <BottomNav active={activeSection} onChange={handleNavChange} />

        <SignupModal
          open={showSignupModal}
          onClose={() => setShowSignupModal(false)}
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
// ...existing code...