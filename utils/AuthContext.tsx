import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatProvider } from './ChatContext';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const storedSession = await AsyncStorage.getItem('supabase_session');
      if (storedSession) {
        setSession(JSON.parse(storedSession));
      }
      setLoading(false);
    };

    checkSession();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        AsyncStorage.setItem('supabase_session', JSON.stringify(session));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        AsyncStorage.setItem('supabase_session', JSON.stringify(session));
      } else {
        AsyncStorage.removeItem('supabase_session');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error: signUpError, data } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    if (signUpError) throw signUpError;
  
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id,
            email: email,
            display_name: displayName || email.split('@')[0]
          }
        ]);
      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
      setSession(data.session);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await AsyncStorage.removeItem('supabase_session');
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signUp, signIn, signOut }}>
      <ChatProvider>
        {children}
      </ChatProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};