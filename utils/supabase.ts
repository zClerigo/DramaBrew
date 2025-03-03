import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ztowwcsmvgexzcxqygwv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0b3d3Y3NtdmdleHpjeHF5Z3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODQ4NDQsImV4cCI6MjA0ODU2MDg0NH0.rhrMZb-fsA3ku8-nFu_0zzmaoQyDesxWYn1rJn9CXzc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function incrementMessageCount(ids: {
  characterIds?: string[];
  sceneId?: string;
  modIds?: string[];
}): Promise<void> {
  const { characterIds, sceneId, modIds } = ids;
  
  // Update characters
  if (characterIds && characterIds.length > 0) {
    const numericCharIds = characterIds.map(id => parseInt(id));
    const { error: charError } = await supabase
      .rpc('increment_message_count', {
        character_ids: numericCharIds
      });
    if (charError) console.error('Error updating character message counts:', charError);
  }

  // Update scene
  if (sceneId) {
    const numericSceneId = parseInt(sceneId);
    const { error: sceneError } = await supabase
      .rpc('increment_scene_message_count', {
        scene_ids: [numericSceneId]
      });
    if (sceneError) console.error('Error updating scene message count:', sceneError);
  }

  // Update mods
  if (modIds && modIds.length > 0) {
    const numericModIds = modIds.map(id => parseInt(id));
    const { error: modError } = await supabase
      .rpc('increment_mod_message_count', {
        mod_ids: numericModIds
      });
    if (modError) console.error('Error updating mod message counts:', modError);
  }
}