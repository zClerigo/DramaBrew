import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ImageBackground, Image } from 'react-native';
import { useAuth } from '../../utils/AuthContext';
import { supabase } from '../../utils/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Character } from '../../utils/characterUtils';

type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
  message_number?: number;
  user_id?: string;
};

interface Mod {
  id: string;
  name: string;
  ticker: string;
}

interface Brew {
  id: string;
  name: string;
  scene?: Scene;
  characters: Character[];
  mods: Mod[];
}

interface BrewSceneJoin {
  scene: Scene;
}

interface BrewCharacterJoin {
  character: Character;
}

interface BrewModJoin {
  mod: Mod;
}

interface SupabaseBrew {
  id: string;
  name: string;
  brew_scenes: BrewSceneJoin[];
  brew_characters: BrewCharacterJoin[];
  brew_mods: BrewModJoin[];
}

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { session } = useAuth();
  const [brews, setBrews] = useState<Brew[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user.id) {
      fetchBrews();
    }
  }, [session?.user.id]);

  const fetchBrews = async () => {
    try {
      const { data, error } = await supabase
        .from('brews')
        .select(`
          id,
          name,
          brew_scenes (
            scene:scenes ( 
              id, 
              name, 
              description, 
              image_url, 
              max_characters 
            )
          ),
          brew_characters (
            character:characters ( 
              id, 
              name, 
              description, 
              avatar_url, 
              intro_text, 
              dialogue_style, 
              motivations, 
              background, 
              personality_traits, 
              fears 
            )
          ),
          brew_mods (
            mod:mods ( id, name, ticker )
          )
        `)
        .eq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBrews: Brew[] = (data as unknown as SupabaseBrew[]).map(brew => ({
        id: brew.id,
        name: brew.name,
        scene: brew.brew_scenes[0]?.scene,
        characters: brew.brew_characters.map(bc => bc.character),
        mods: brew.brew_mods.map(bm => bm.mod)
      }));

      setBrews(formattedBrews);
    } catch (error) {
      console.error('Error fetching brews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCharacterAvatars = (characters: Character[]) => (
    <View style={styles.avatarContainer}>
      {characters.map((character, index) => (
        <View key={character.id} style={styles.avatarWrapper}>
          <Image
            source={{ uri: character.avatar_url }}
            style={[
              styles.avatar,
              index > 0 && { marginLeft: -15 }
            ]}
          />
          <View style={styles.avatarOverlay} />
        </View>
      ))}
    </View>
  );

  const renderMods = (mods: Mod[]) => (
    <View style={styles.modsContainer}>
      {mods.map((mod) => (
        <View key={mod.id} style={styles.modBadge}>
          <Text style={styles.modEmoji}>
            {[...mod.ticker][0]}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBrew = ({ item }: { item: Brew }) => {
    const BrewContent = (
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.brewContent}
          onPress={() => navigation.navigate('Chat', { brewId: item.id, brewName: item.name })}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              {item.characters.length > 0 && renderCharacterAvatars(item.characters)}
            </View>
            <View style={styles.headerRight}>
              {item.mods.length > 0 && renderMods(item.mods)}
            </View>
          </View>
          
          <Text style={styles.brewName}>{item.name}</Text>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.brewDescription}>
              {item.scene ? `Scene: ${item.scene.name}` : ''}
              {item.characters.length > 0 && (
                `${item.scene ? '\n' : ''}Characters: ${item.characters.map(c => c.name).join(', ')}`
              )}
              {item.mods.length > 0 && (
                `\nMods: ${item.mods.map(m => m.name).join(', ')}`
              )}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );

    if (item.scene?.image_url) {
      return (
        <View style={styles.brewItem}>
          <ImageBackground
            source={{ uri: item.scene.image_url }}
            style={styles.brewBackground}
            imageStyle={styles.brewBackgroundImage}
          >
            {BrewContent}
          </ImageBackground>
        </View>
      );
    }
  
    return (
      <View style={styles.brewItem}>
        <View style={[styles.brewBackground, styles.defaultBackground]}>
          {BrewContent}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6C1748" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Brews</Text>
      {brews.length === 0 ? (
        <Text style={styles.emptyMessage}>
          You haven't created any brews yet. Go to the Brew screen to create one!
        </Text>
      ) : (
        <FlatList
          data={brews}
          renderItem={renderBrew}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1A1A1A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  brewItem: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    height: 160,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  brewBackground: {
    flex: 1,
  },
  defaultBackground: {
    backgroundColor: '#2C2C2C',
  },
  brewBackgroundImage: {
    resizeMode: 'cover',
  },
  brewContent: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 8,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderLeftWidth: 4,
    borderLeftColor: '#6C1748',
  },
  brewName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 8,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  brewDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    lineHeight: 20,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  avatarContainer: {
    flexDirection: 'row',
    height: 32,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.2)',
  },
  modsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
  },
  modBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderWidth: 2,
    borderColor: '#6C1748',
  },
  modEmoji: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  }
});