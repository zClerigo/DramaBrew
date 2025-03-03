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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { useBrewContext } from '../../../utils/BrewContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
  is_private: boolean;
  message_number?: number;
};

type RootStackParamList = {
  SceneDetail: { scene: Scene };
};

type ScenesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SceneDetail'>;

const windowWidth = Dimensions.get('window').width;
const itemWidth = (windowWidth - 48) / 2;

export default function ScenesScreen() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const { addToBrew, isInBrew } = useBrewContext();
  const navigation = useNavigation<ScenesScreenNavigationProp>();

  useEffect(() => {
    fetchScenes();
  }, []);

  async function fetchScenes() {
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('is_private', false);
      
    if (error) console.log('Error fetching scenes:', error);
    else setScenes(data || []);
  }

  const handleAddToBrew = (scene: Scene) => {
    addToBrew('scenes', scene);
  };

  const renderScene = ({ item }: { item: Scene }) => {
    const isAlreadyInBrew = isInBrew('scenes', item.id);

    return (
      <TouchableOpacity
        style={styles.sceneItem}
        onPress={() => navigation.navigate('SceneDetail', { scene: item })}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.sceneImage}
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
        <View style={styles.sceneInfo}>
          <Text style={styles.sceneName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sceneDescription} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.maxCharacters}>Max Characters: {item.max_characters}</Text>
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
        data={scenes}
        renderItem={renderScene}
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
  sceneItem: {
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
  sceneImage: {
    width: '100%',
    aspectRatio: 16/9,
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
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  sceneInfo: {
    padding: 12,
  },
  sceneName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  sceneDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  maxCharacters: {
    fontSize: 12,
    color: '#808080',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Light' : 'Roboto-Light',
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
});