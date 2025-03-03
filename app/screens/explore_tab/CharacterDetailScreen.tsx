import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBrewContext } from '../../../utils/BrewContext';
import { supabase } from '../../../utils/supabase';
import { Character } from '../../types/character';

type RootStackParamList = {
  CharacterDetail: { character: Character };
  Profile: { userId: string };
  MainTabs: undefined;
  CreateCharacter: undefined;
  CreateScene: undefined;
  CreateMod: undefined;
  Chat: { brewId: string; brewName: string };
  SceneDetail: { scene: { id: string; name: string; description: string; image_url: string; max_characters: number } };
  Login: undefined;
  Signup: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CharacterDetail'>;

const CharacterDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { character } = route.params;
  const { addToBrew, isInBrew, scenes } = useBrewContext();
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatorName = async () => {
      if (character.user_id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', character.user_id)
          .single();
        
        if (data?.display_name) {
          setCreatorName(data.display_name);
        }
      }
    };

    fetchCreatorName();
  }, [character.user_id]);

  const handleCreatorPress = () => {
    if (character.user_id) {
      navigation.navigate('Profile', { userId: character.user_id });
    }
  };

  const handleAddToBrew = () => {
    const selectedScene = scenes[0];
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

  const isAlreadyInBrew = isInBrew('characters', character.id);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: character.avatar_url }} 
            style={styles.avatar}
          />
          <View style={styles.messageCountContainer}>
            <Ionicons 
              name="chatbubble-outline" 
              size={14} 
              color="#FFFFFF" 
              style={styles.messageIcon}
            />
            <Text style={styles.messageCountText}>
              {character.message_number || 0}
            </Text>
          </View>
          {isAlreadyInBrew && (
            <View style={styles.addedOverlay}>
              <Text style={styles.addedText}>Added to Brew</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{character.name}</Text>
          
          {creatorName && (
            <TouchableOpacity 
              style={styles.creatorContainer}
              onPress={handleCreatorPress}
            >
              <Ionicons name="person-outline" size={16} color="#B0B0B0" />
              <Text style={styles.creatorText}>Created by {creatorName}</Text>
            </TouchableOpacity>
          )}

          {character.tags && character.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {character.tags.map(tag => (
                <View key={tag.id} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
          
          <Text style={styles.description}>{character.description}</Text>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.addButton,
            isAlreadyInBrew && styles.addButtonDisabled
          ]}
          onPress={handleAddToBrew}
          disabled={isAlreadyInBrew}
        >
          <Text style={styles.addButtonText}>
            {isAlreadyInBrew ? 'Added to Brew' : 'Add to Brew'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  creatorText: {
    color: '#B0B0B0',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#404040',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
  },
  description: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    backgroundColor: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#6C1748',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 70,
  },
  addButtonDisabled: {
    backgroundColor: '#404040',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
});

export default CharacterDetailScreen;