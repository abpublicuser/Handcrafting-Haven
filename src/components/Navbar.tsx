import { auth, signIn, signOut } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';

import logo from '../assets/images/globe_trotter_logo_1781195701047.jpg';

const AUTHOR_EMAILS = ['abpublicuser@gmail.com', 'rbalaji70@gmail.com'];

export default function Navbar({ activeTab, setActiveTab }: { activeTab: 'explore' | 'my-albums', setActiveTab: (tab: 'explore' | 'my-albums') => void }) {
  const [user] = useAuthState(auth);

  const isAuthor = user?.email ? AUTHOR_EMAILS.includes(user.email) : false;

  useEffect(() => {
    if (user && user.email && !AUTHOR_EMAILS.includes(user.email)) {
      alert('Access restricted to authors only.');
      signOut();
    }
  }, [user]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-natural-border bg-natural-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 sm:h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-in-out">
        <div className="flex items-center gap-3 sm:gap-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              initial={{ rotate: -20, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              className="h-10 w-10 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-full shadow-lg"
            >
              <img
                src={logo}
                alt="Handcrafting Haven Logo"
                className="h-full w-full max-w-none object-cover scale-105"
              />
            </motion.div>
            <span className="text-lg font-semibold tracking-tight text-natural-text sm:text-3xl">
              Handcrafting Haven <span className="ml-2 text-xs font-bold uppercase tracking-widest text-natural-sage">v1.0</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 border-l border-natural-border pl-3 sm:pl-8">
            <button
              onClick={() => setActiveTab('explore')}
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] transition-colors ${activeTab === 'explore' ? 'text-natural-sage' : 'text-natural-muted hover:text-natural-text'}`}
            >
              Explore
            </button>
            {isAuthor && (
              <button
                onClick={() => setActiveTab('my-albums')}
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] transition-colors ${activeTab === 'my-albums' ? 'text-natural-sage' : 'text-natural-muted hover:text-natural-text'}`}
              >
                My Handmade Cards
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          {user && isAuthor ? (
            <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-natural-border bg-natural-border/40 px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="flex flex-col items-end">
                <span className="hidden text-sm font-medium text-natural-text sm:block">{user.displayName}</span>
                <button
                  onClick={() => signOut()}
                  className="text-[10px] font-bold uppercase tracking-widest text-natural-sage transition-colors hover:text-natural-sage-hover"
                >
                  Sign Out
                </button>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border border-white sm:border-2 ring-1 ring-natural-border"
                />
              ) : (
                <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-natural-tan border border-white sm:border-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex flex-col items-center justify-center rounded-full bg-natural-sage px-4 sm:px-6 py-1.5 sm:py-2 text-[8px] sm:text-[10px] sm:leading-tight font-bold uppercase tracking-widest text-white transition-transform hover:bg-natural-sage-hover hover:scale-105 active:scale-95 leading-none"
            >
              <span>Author</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
