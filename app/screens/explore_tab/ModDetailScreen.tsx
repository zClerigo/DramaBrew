import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useBrewContext } from '../../../utils/BrewContext';
import { supabase } from '../../../utils/supabase';

export type Mod = {
  id: string;
  name: string;
  description: string;
  ticker: string;
  message_number?: number;
  user_id?: string;
};

type RootStackParamList = {
  ModDetail: { mod: Mod };
  Profile: { userId: string };
  MainTabs: undefined;
};

type Props = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, 'ModDetail'>,
  BottomTabScreenProps<RootStackParamList>
>;

const ModDetailScreen = ({ route, navigation }: Props) => {
  const { mod } = route.params;
  const { addToBrew, isInBrew } = useBrewContext();
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreatorName = async () => {
      if (mod.user_id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', mod.user_id)
          .single();
        
        if (data?.display_name) {
          setCreatorName(data.display_name);
        }
      }
    };

    fetchCreatorName();
  }, [mod.user_id]);

  const handleCreatorPress = () => {
    if (mod.user_id) {
      navigation.navigate('Profile', { userId: mod.user_id });
    }
  };

  const isAlreadyInBrew = isInBrew('mods', mod.id);

  const handleAddToBrew = () => {
    addToBrew('mods', mod);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.tickerContainer}>
          <Text style={styles.ticker}>{mod.ticker}</Text>
          <View style={styles.messageCountContainer}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color="#FFFFFF"
              style={styles.messageIcon}
            />
            <Text style={styles.messageCountText}>
              {mod.message_number || 0}
            </Text>
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{mod.name}</Text>

          {creatorName && (
            <TouchableOpacity 
              style={styles.creatorContainer}
              onPress={handleCreatorPress}
            >
              <Ionicons name="person-outline" size={16} color="#B0B0B0" />
              <Text style={styles.creatorText}>Created by {creatorName}</Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.description}>{mod.description}</Text>
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
  tickerContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    position: 'relative',
  },
  ticker: {
    fontSize: 48,
    letterSpacing: 8,
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

export default ModDetailScreen;