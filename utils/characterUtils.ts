import { supabase } from './supabase';

export interface Character {
  id: number;
  name: string;
  description: string;
  avatar_url: string;
  intro_text: string;
  dialogue_style: string;
  motivations: string;
  background: string;
  personality_traits: string;
  fears: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export async function fetchCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('name');
  if (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
  return data as Character[];
}

export async function fetchCharacterById(id: number): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching character:', error);
    return null;
  }
  return data as Character;
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, created_at')
    .order('name');
  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
  return data;
}

export async function fetchCharacterTags(characterId: number): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('character_tags')
    .select(`
      tag:tags (
        id,
        name,
        created_at
      )
    `)
    .eq('character_id', characterId);
  
  if (error) {
    console.error('Error fetching character tags:', error);
    return [];
  }
  
  return data.map(item => item.tag) as unknown as Tag[];
}