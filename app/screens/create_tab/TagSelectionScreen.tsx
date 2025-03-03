import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { supabase } from '../../../utils/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NavigationParams, Tag } from './types';

type NavigationProp = NativeStackNavigationProp<NavigationParams, 'TagSelection'>;
type ScreenRouteProp = RouteProp<NavigationParams, 'TagSelection'>;

const TagSelectionScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { selectedTags: initialSelectedTags } = route.params;

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialSelectedTags);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagPress = (tag: Tag) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleDone = () => {
    navigation.navigate({
      name: route.params.returnScreen,
      params: { selectedTags },
      merge: true
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C1748" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Tags</Text>
        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={availableTags}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          const isSelected = selectedTags.some(tag => tag.id === item.id);
          return (
            <TouchableOpacity
              style={[styles.tagOption, isSelected && styles.tagOptionSelected]}
              onPress={() => handleTagPress(item)}
            >
              <Text style={styles.tagOptionText}>{item.name}</Text>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color="#E0E0E0" />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  doneButton: {
    backgroundColor: '#6C1748',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  tagOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  tagOptionSelected: {
    backgroundColor: '#2C2C2C',
  },
  tagOptionText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default TagSelectionScreen;