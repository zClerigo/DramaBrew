import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
};

export type Character = {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  intro_text: string;
  dialogue_style: string;
  motivations: string;
  background: string;
  personality_traits: string;
  fears: string;
  is_private?: boolean;
  user_id?: string;
};

export type Mod = {
  id: string;
  name: string;
  description: string;
  ticker: string;
};

type Brew = {
  id: string;
  name: string;
  scene: Scene;
  characters: Character[];
  mods: Mod[];
};

type BrewContextType = {
  scenes: Scene[];
  characters: Character[];
  mods: Mod[];
  brews: Brew[];
  addToBrew: (type: 'scenes' | 'characters' | 'mods', item: Scene | Character | Mod) => void;
  removeFromBrew: (type: 'scenes' | 'characters' | 'mods', id: string) => void;
  isInBrew: (type: 'scenes' | 'characters' | 'mods', id: string) => boolean;
  deleteBrew: (id: string) => Promise<void>;
};

const BrewContext = createContext<BrewContextType | undefined>(undefined);

export const BrewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [brews, setBrews] = useState<Brew[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.user.id) {
      fetchBrews();
    }
  }, [session?.user.id]);

  interface BrewJoinResponse {
    id: string;
    name: string;
    brew_scenes: {
      scene: Scene;
    }[];
    brew_characters: {
      character: Character;
    }[];
    brew_mods: {
      mod: Mod;
    }[];
  }
  
    const fetchBrews = async () => {
      try {
        const { data, error } = await supabase
          .from('brews')
          .select(`
            id,
            name,
            brew_scenes (
              scene:scenes (*)
            ),
            brew_characters (
              character:characters (*)
            ),
            brew_mods (
              mod:mods (*)
            )
          `)
          .eq('user_id', session?.user.id);
  
        if (error) throw error;
  
        const formattedBrews: Brew[] = (data as unknown as BrewJoinResponse[]).map(brew => ({
          id: brew.id,
          name: brew.name,
          scene: brew.brew_scenes[0]?.scene,
          characters: brew.brew_characters.map(bc => bc.character),
          mods: brew.brew_mods.map(bm => bm.mod)
        }));
  
        setBrews(formattedBrews);
      } catch (error) {
        console.error('Error fetching brews:', error);
      }
    };

  const addToBrew = (type: 'scenes' | 'characters' | 'mods', item: Scene | Character | Mod) => {
    if (type === 'scenes') {
      setScenes([item as Scene]);
    } else if (type === 'characters') {
      setCharacters(prev => [...prev, item as Character]);
    } else {
      setMods(prev => [...prev, item as Mod]);
    }
  };

  const removeFromBrew = (type: 'scenes' | 'characters' | 'mods', id: string) => {
    if (type === 'scenes') {
      setScenes([]);
    } else if (type === 'characters') {
      setCharacters(prev => prev.filter(character => character.id !== id));
    } else {
      setMods(prev => prev.filter(mod => mod.id !== id));
    }
  };

  const isInBrew = (type: 'scenes' | 'characters' | 'mods', id: string): boolean => {
    if (type === 'scenes') {
      return scenes.some(scene => scene.id === id);
    } else if (type === 'characters') {
      return characters.some(character => character.id === id);
    } else {
      return mods.some(mod => mod.id === id);
    }
  };

  const deleteBrew = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchBrews();
    } catch (error) {
      console.error('Error deleting brew:', error);
    }
  };

  return (
    <BrewContext.Provider value={{
      scenes,
      characters,
      mods,
      brews,
      addToBrew,
      removeFromBrew,
      isInBrew,
      deleteBrew
    }}>
      {children}
    </BrewContext.Provider>
  );
};

export const useBrewContext = () => {
  const context = useContext(BrewContext);
  if (context === undefined) {
    throw new Error('useBrewContext must be used within a BrewProvider');
  }
  return context;
};