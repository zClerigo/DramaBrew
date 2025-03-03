import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../utils/supabase';
import { useBrewContext } from '../../../utils/BrewContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Mod = {
  id: string;
  name: string;
  description: string;
  ticker: string;
  is_private: boolean;
  message_number?: number;
};

type RootStackParamList = {
  ModDetail: { mod: Mod };
};

type ModsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ModDetail'>;

const windowWidth = Dimensions.get('window').width;

export default function ModsScreen() {
  const [mods, setMods] = useState<Mod[]>([]);
  const { addToBrew, isInBrew } = useBrewContext();
  const navigation = useNavigation<ModsScreenNavigationProp>();

  useEffect(() => {
    fetchMods();
  }, []);

  async function fetchMods() {
    const { data, error } = await supabase
      .from('mods')
      .select('*')
      .eq('is_private', false);
    if (error) console.log('Error fetching mods:', error);
    else setMods(data || []);
  }

  const handleAddToBrew = (mod: Mod) => {
    addToBrew('mods', mod);
  };

  const renderMod = ({ item }: { item: Mod }) => {
    const isAlreadyInBrew = isInBrew('mods', item.id);
    
    return (
      <TouchableOpacity
        style={styles.modItem}
        onPress={() => navigation.navigate('ModDetail', { mod: item })}
      >
        <View style={styles.modInfo}>
          <View style={styles.leftContent}>
            <Text style={styles.ticker}>{item.ticker}</Text>
            <View style={styles.textContent}>
              <Text style={styles.modName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.modDescription} numberOfLines={2}>{item.description}</Text>
            </View>
          </View>
          <View style={styles.rightContent}>
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
            <TouchableOpacity
              style={[styles.addButton, isAlreadyInBrew && styles.addButtonDisabled]}
              onPress={() => handleAddToBrew(item)}
              disabled={isAlreadyInBrew}
            >
              <Text style={styles.addButtonText}>
                {isAlreadyInBrew ? "Added" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={mods}
        renderItem={renderMod}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
  modItem: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'rgba(44, 44, 44, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  ticker: {
    fontSize: 24,
    marginRight: 12,
    letterSpacing: 2,
  },
  textContent: {
    flex: 1,
  },
  modName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  modDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  messageCountContainer: {
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
  addButton: {
    backgroundColor: '#6C1748',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
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