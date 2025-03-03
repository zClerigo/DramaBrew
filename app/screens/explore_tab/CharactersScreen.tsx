import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Platform,
  Dimensions
} from 'react-native';
import { supabase } from '../../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useBrewContext } from '../../../utils/BrewContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Character, Tag } from '../../types/character';

type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
};

type RootStackParamList = {
  CharacterDetail: { character: Character };
};

type CharactersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CharacterDetail'>;

const windowWidth = Dimensions.get('window').width;
const itemWidth = (windowWidth - 48) / 2;

export default function CharactersScreen() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const { addToBrew, isInBrew, scenes } = useBrewContext();
  const navigation = useNavigation<CharactersScreenNavigationProp>();

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    const { data, error } = await supabase
      .from('characters')
      .select(`
        *,
        tags:character_tags(
          tag:tags(
            id,
            name
          )
        )
      `)
      .eq('is_private', false);
    
    if (error) {
      console.log('Error fetching characters:', error);
    } else {
      // Transform the data to match our Character type
      const transformedData = (data || []).map(char => ({
        ...char,
        tags: char.tags.map((t: any) => t.tag)
      }));
      setCharacters(transformedData);
    }
  }

  const handleAddToBrew = (character: Character) => {
    const selectedScene = scenes[0] as Scene;
    if (selectedScene && selectedScene.max_characters > 0) {
      const currentCharacterCount = scenes.filter(c => c.id === selectedScene.id).length;
      if (currentCharacterCount < selectedScene.max_characters) {
        addToBrew('characters', character);
      } else {
        alert(`This scene can only have ${selectedScene.max_characters} character(s).`);
      }
    } else {
      addToBrew('characters', character);
    }
  };

  const renderTag = ({ item }: { item: Tag }) => (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{item.name}</Text>
    </View>
  );

  const renderCharacter = ({ item }: { item: Character }) => {
    const isAlreadyInBrew = isInBrew('characters', item.id);

    return (
      <TouchableOpacity
        style={styles.characterItem}
        onPress={() => navigation.navigate('CharacterDetail', { character: item })}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.avatar_url }} 
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.messageCountContainer}>
            <Ionicons 
              name="chatbubble-outline" 
              size={14} 
              color="#FFFFFF" 
              style={styles.messageIcon}
            />
            <Text style={styles.messageCountText}>
              {item.message_number || 0}
            </Text>
          </View>
          {isAlreadyInBrew && (
            <View style={styles.addedOverlay}>
              <Text style={styles.addedText}>Added</Text>
            </View>
          )}
        </View>
        <View style={styles.characterInfo}>
          <Text style={styles.characterName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.characterDescription} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.tagsContainer}>
            <FlatList
              data={item.tags}
              renderItem={renderTag}
              keyExtractor={(tag) => tag.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsList}
            />
          </View>

          <TouchableOpacity
            style={[styles.addButton, isAlreadyInBrew && styles.addButtonDisabled]}
            onPress={() => handleAddToBrew(item)}
            disabled={isAlreadyInBrew}
          >
            <Text style={styles.addButtonText}>
              {isAlreadyInBrew ? "Added" : "Add to Brew"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={characters}
        renderItem={renderCharacter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    marginBottom: 70,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  characterItem: {
    width: itemWidth,
    marginBottom: 16,
    backgroundColor: 'rgba(44, 44, 44, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    aspectRatio: 1,
  },
  addedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(108, 23, 72, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  characterInfo: {
    padding: 12,
  },
  characterName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  characterDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagsList: {
    flexGrow: 0,
  },
  tag: {
    backgroundColor: '#404040',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
  },
  addButton: {
    backgroundColor: '#6C1748',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#404040',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  messageCountContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageIcon: {
    marginRight: 2,
  },
  messageCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
});