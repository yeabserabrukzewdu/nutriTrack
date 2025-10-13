import React, { useState, useEffect } from 'react';
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
import { signInAnonymously } from 'firebase/auth';
import { getLogEntries, addLogEntry, deleteLogEntry, subscribeToLogEntries } from './services/firestoreService';
import { getFormattedDate, isSameDay } from './utils/dateUtils';
import { XIcon, PlusIcon } from './components/Icons';

type ModalTab = 'camera' | 'upload' | 'search';

const App: React.FC = () => {
  const [userInitialized, setUserInitialized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loggedFoods, setLoggedFoods] = useState<FoodItem[]>([]);
  const [goals, setGoals] = useState<MacroGoals>({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; initialTab: ModalTab }>({ isOpen: false, initialTab: 'camera' });
  const [activeSection, setActiveSection] = useState<'main' | 'insights' | 'calendar' | 'profile'>('main');
  const [showSignupModal, setShowSignupModal] = useState(false);

  const formattedDate = getFormattedDate(selectedDate);

  // Load and save data from localStorage
  useEffect(() => {
    // Try to load from Firestore if signed in, otherwise fall back to localStorage
    let isMounted = true;
    const load = async () => {
      try {
        const savedGoals = localStorage.getItem('macroGoals');
        if (savedGoals) setGoals(JSON.parse(savedGoals));

        if (auth.currentUser) {
          // When signed in, we'll subscribe to realtime updates below when currentUserId changes
          setLoggedFoods([]);
        } else {
          const savedFoods = localStorage.getItem(`foodLog-${formattedDate}`);
          if (savedFoods) setLoggedFoods(JSON.parse(savedFoods));
          else setLoggedFoods([]);
        }
      } catch (error) {
        console.error("Failed to load data", error);
        setLoggedFoods([]);
      }
    };

    load();

    return () => { isMounted = false };
  }, [selectedDate, formattedDate]);

  // Subscribe to Firestore logs when user signs in
  useEffect(() => {
    if (!currentUserId) return;

    // Migrate local storage logs into Firestore (safely)
    const migrateLocalToFirestore = async () => {
      try {
        // iterate over keys matching foodLog-YYYY-MM-DD
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (!key.startsWith('foodLog-')) continue;
          try {
            const arr = JSON.parse(localStorage.getItem(key) || '[]') as FoodItem[];
            for (const item of arr) {
              // create firestore entry only if item doesn't already have an id that matches a remote doc
              await addLogEntry(currentUserId, {
                name: item.name,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                portion: item.portion,
                timestamp: (item as any).timestamp || Date.now()
              });
            }
          } catch (e) {
            // skip parse errors
          }
        }
        // Optionally clear local logs after migration; here we keep them but they will be superseded by Firestore view
      } catch (e) {
        console.error('Local -> Firestore migration failed', e);
      }
    };

    migrateLocalToFirestore();

    const unsub = subscribeToLogEntries(currentUserId, (entries) => {
      setLoggedFoods(entries as FoodItem[]);
    });

    return () => unsub();
  }, [currentUserId]);

  useEffect(() => {
  try {
    localStorage.setItem(`foodLog-${formattedDate}`, JSON.stringify(loggedFoods));
  } catch (error) {
    console.error("Failed to save data to local storage", error);
  }
  }, [loggedFoods, formattedDate]);
  
  const handleOpenModal = (tab: ModalTab) => {
    setModalConfig({ isOpen: true, initialTab: tab });
  };
  
  const handleCloseModal = () => {
    setModalConfig({ isOpen: false, initialTab: 'camera' });
  };

  const handleAddFood = (foodItems: FoodItem[]) => {
    // Add to local state immediately
    setLoggedFoods(prev => [...prev, ...foodItems]);
    // Persist to Firestore if signed in
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      foodItems.forEach(async item => {
        try {
          await addLogEntry(userId, {
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            portion: item.portion,
            // use selectedDate so added items map to the calendar date
            timestamp: selectedDate.getTime()
          });
        } catch (e) {
          console.error('Failed to add log entry to Firestore', e);
        }
      });
    }

    handleCloseModal();
  };

  const handleRemoveFood = (foodId: string) => {
    setLoggedFoods(prev => prev.filter(item => item.id !== foodId));
    // Delete from Firestore if signed in
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      deleteLogEntry(userId, foodId).catch(e => console.error('Failed to delete log entry', e));
    }
  };

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserInitialized(true);
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  if (!userInitialized) {
    // while auth initializes, show a minimal loading state
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
              {/* Right column: show macros and food log for selected date */}
              <div className="lg:col-span-1">
                {/** Macros for selected date */}
                <MacroTracker loggedFoods={loggedFoods.filter(item => {
                  const ts = (item as any).timestamp;
                  if (typeof ts === 'number') return isSameDay(new Date(ts), selectedDate);
                  // If no timestamp (local-only items), include them (they're saved per-date)
                  return true;
                })} goals={goals} />

                <div className="bg-slate-800 p-6 rounded-2xl shadow-lg mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-emerald-400">Food Log</h2>
                    <button onClick={() => handleOpenModal('search')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1 px-3 rounded-lg text-sm">
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
        <BottomNav
          active={activeSection}
          onChange={(s) => {
            // If user is anonymous (guest) and trying to access calendar, show signup modal instead
            if (s === 'calendar' && auth.currentUser && auth.currentUser.isAnonymous) {
              setShowSignupModal(true);
              return;
            }
            setActiveSection(s);
          }}
        />

        <SignupModal open={showSignupModal} onClose={() => setShowSignupModal(false)} onSignedIn={() => {
          // when signed in, switch to calendar view
          setShowSignupModal(false);
          setActiveSection('calendar');
        }} />
      </div>
    </div>
  );
};

export default App;
