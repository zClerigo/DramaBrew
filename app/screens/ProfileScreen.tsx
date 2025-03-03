import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../utils/supabase';

type RootStackParamList = {
  MainTabs: undefined;
  CreateCharacter: undefined;
  CreateScene: undefined;
  CreateMod: undefined;
  Chat: { brewId: string; brewName: string };
  SceneDetail: { scene: { id: string; name: string; description: string; image_url: string; max_characters: number } };
  CharacterDetail: { character: any };
  Profile: { userId: string };
  Login: undefined;
  Signup: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen = ({ route }: Props) => {
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [userId]);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile.display_name}</Text>
      <Text style={styles.text}>{profile.bio || 'No bio available'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1A1A1A',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  text: {
    fontSize: 16,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
  },
});

export default ProfileScreen;