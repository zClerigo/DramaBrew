import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBrewContext } from '../../../utils/BrewContext';
import { supabase } from '../../../utils/supabase';

export type RootStackParamList = {
  SceneDetail: { scene: Scene };
  Profile: { userId: string };
};

export type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
  message_number?: number;
  user_id?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SceneDetail'>;

const SceneDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { scene } = route.params;
  const { addToBrew, isInBrew } = useBrewContext();
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatorName = async () => {
      if (scene.user_id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', scene.user_id)
          .single();
        
        if (data?.display_name) {
          setCreatorName(data.display_name);
        }
      }
    };

    fetchCreatorName();
  }, [scene.user_id]);

  const handleCreatorPress = () => {
    if (scene.user_id) {
      navigation.navigate('Profile', { userId: scene.user_id });
    }
  };

  const isAlreadyInBrew = isInBrew('scenes', scene.id);

  const handleAddToBrew = () => {
    addToBrew('scenes', scene);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: scene.image_url }} style={styles.image} />
          <View style={styles.messageCountContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" style={styles.messageIcon} />
            <Text style={styles.messageCountText}>{scene.message_number || 0}</Text>
          </View>
          {isAlreadyInBrew && (
            <View style={styles.addedOverlay}>
              <Text style={styles.addedText}>Added to Brew</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{scene.name}</Text>
          
          {creatorName && (
    <TouchableOpacity 
      style={styles.creatorContainer}
      onPress={handleCreatorPress}
    >
      <Ionicons name="person-outline" size={16} color="#B0B0B0" />
      <Text style={styles.creatorText}>Created by {creatorName}</Text>
    </TouchableOpacity>
  )}

          <Text style={styles.description}>{scene.description}</Text>
          <View style={styles.maxCharactersContainer}>
            <Text style={styles.maxCharactersLabel}>Maximum Characters:</Text>
            <Text style={styles.maxCharactersValue}>{scene.max_characters}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.addButton, isAlreadyInBrew && styles.addButtonDisabled]}
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
  image: {
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
  description: {
    fontSize: 16,
    marginBottom: 24,
    color: '#B0B0B0',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  maxCharactersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    padding: 12,
    borderRadius: 8,
  },
  maxCharactersLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginRight: 8,
  },
  maxCharactersValue: {
    fontSize: 16,
    color: '#E0E0E0',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
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

export default SceneDetailScreen;