import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  Alert,
  FlatList,
  Image,
  Dimensions,
  Animated
} from 'react-native';
import { useAuth } from '../../utils/AuthContext';
import { Ionicons } from "@expo/vector-icons";
import { supabase } from '../../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  CharacterDetail: { character: Creation };
  SceneDetail: { 
    scene: {
      id: string;
      name: string;
      description: string;
      image_url: string;
      max_characters: number;
    }
  };
  ModDetail: { mod: Creation };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const windowWidth = Dimensions.get('window').width;
const itemWidth = (windowWidth - 48) / 2;

const CATEGORIES = ['Characters', 'Scenes', 'Mods'];

interface Creation {
  id: string;
  name: string;
  description: string;
  is_private?: boolean;
  created_at: string;
  image_url?: string;
  avatar_url?: string;
  max_characters?: number;
  ticker?: string;
  message_number?: number;
}

interface Profile {
  id: string;
  email: string;
  display_name: string;
}

const AccountScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signOut, session } = useAuth();
  const [characters, setCharacters] = useState<Creation[]>([]);
  const [scenes, setScenes] = useState<Creation[]>([]);
  const [mods, setMods] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (session?.user.id) {
      fetchUserProfile();
      fetchUserCreations();
    }
  }, [session?.user.id]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', session?.user.id);
      
      if (error) throw error;
      setIsEditing(false);
      await fetchUserProfile();
    } catch (error) {
      Alert.alert('Error updating profile');
      console.error(error);
    }
  };

  const fetchUserCreations = async () => {
    try {
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (charactersError) throw charactersError;
      setCharacters(charactersData || []);

      const { data: scenesData, error: scenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (scenesError) throw scenesError;
      setScenes(scenesData || []);

      const { data: modsData, error: modsError } = await supabase
        .from('mods')
        .select('*')
        .eq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (modsError) throw modsError;
      setMods(modsData || []);
    } catch (error) {
      console.error('Error fetching user creations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({
      x: index * windowWidth,
      animated: true
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: new Animated.Value(0) } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
        if (activeTab !== newIndex) {
          setActiveTab(newIndex);
        }
      },
    }
  );

  const handleCharacterPress = (character: Creation) => {
    navigation.navigate('CharacterDetail', { character });
  };

  const handleScenePress = (scene: Creation) => {
    navigation.navigate('SceneDetail', {
      scene: {
        id: scene.id,
        name: scene.name,
        description: scene.description,
        image_url: scene.image_url || '',
        max_characters: scene.max_characters || 0
      }
    });
  };

  const handleModPress = (mod: Creation) => {
    navigation.navigate('ModDetail', { mod });
  };

  const renderCharacter = ({ item }: { item: Creation }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => handleCharacterPress(item)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.avatar_url }} 
          style={styles.gridImage}
          resizeMode="cover"
        />
        <View style={styles.messageCountContainer}>
          <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
          <Text style={styles.messageCountText}>{item.message_number || 0}</Text>
        </View>
        {item.is_private && (
          <View style={styles.privateContainer}>
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderScene = ({ item }: { item: Creation }) => (
    <TouchableOpacity 
      style={styles.gridItem}
      onPress={() => handleScenePress(item)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.image_url }} 
          style={[styles.gridImage, styles.sceneImage]}
          resizeMode="cover"
        />
        <View style={styles.messageCountContainer}>
          <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
          <Text style={styles.messageCountText}>{item.message_number || 0}</Text>
        </View>
        {item.is_private && (
          <View style={styles.privateContainer}>
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.maxCharacters}>Max Characters: {item.max_characters}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMod = ({ item }: { item: Creation }) => (
    <TouchableOpacity 
      style={styles.modItem}
      onPress={() => handleModPress(item)}
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
          <View style={styles.modStatusContainer}>
            <View style={styles.modMessageCountContainer}>
              <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
              <Text style={styles.messageCountText}>{item.message_number || 0}</Text>
            </View>
            {item.is_private && (
              <View style={styles.modPrivateContainer}>
                <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <View style={styles.infoSection}>
            <Text style={styles.title}>Account</Text>
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Email Address</Text>
              <Text style={styles.email}>{session?.user.email}</Text>
            </View>
            
            <View style={styles.displayNameContainer}>
              <Text style={styles.displayNameLabel}>Display Name</Text>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.displayNameInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter display name"
                    placeholderTextColor="#808080"
                  />
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={updateProfile}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditing(false);
                      setDisplayName(profile?.display_name || '');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.displayNameRow}>
                  <Text style={styles.displayName}>
                    {profile?.display_name || 'Set display name'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Ionicons name="pencil" size={20} color="#6C1748" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6C1748" style={styles.loader} />
          ) : (
            <View style={styles.creationsContainer}>
              <View style={styles.tabsContainer}>
                {CATEGORIES.map((category, index) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.tab,
                      activeTab === index && styles.activeTab
                    ]}
                    onPress={() => handleTabPress(index)}
                  >
                    <Text style={[
                      styles.tabText,
                      activeTab === index && styles.activeTabText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.categoriesScrollView}
              >
                {/* Characters Tab */}
                <View style={styles.categoryPage}>
                  {characters.length > 0 ? (
                    <FlatList
                      data={characters}
                      renderItem={renderCharacter}
                      keyExtractor={(item) => item.id}
                      numColumns={2}
                      columnWrapperStyle={styles.row}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.noCreationsText}>No characters yet</Text>
                  )}
                </View>

                {/* Scenes Tab */}
                <View style={styles.categoryPage}>
                  {scenes.length > 0 ? (
                    <FlatList
                      data={scenes}
                      renderItem={renderScene}
                      keyExtractor={(item) => item.id}
                      numColumns={2}
                      columnWrapperStyle={styles.row}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.noCreationsText}>No scenes yet</Text>
                  )}
                </View>

                {/* Mods Tab */}
                <View style={styles.categoryPage}>
                  {mods.length > 0 ? (
                    <FlatList
                      data={mods}
                      renderItem={renderMod}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  ) : (
                    <Text style={styles.noCreationsText}>No mods yet</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={signOut}
      >
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
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
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  infoSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  emailContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6C1748',
  },
  emailLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  email: {
    fontSize: 18,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  displayNameContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6C1748',
  },
  displayNameLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  displayNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 18,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  displayNameInput: {
    fontSize: 18,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#6C1748',
    marginRight: 8,
    padding: 4,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#6C1748',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  cancelButton: {
    backgroundColor: '#4A4A4A',
    padding: 8,
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  creationsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  row: {
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  sceneImage: {
    aspectRatio: 16/9,
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  itemDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  maxCharacters: {
    fontSize: 12,
    color: '#808080',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Light' : 'Roboto-Light',
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
  messageCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  privateContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 6,
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
    alignItems: 'flex-end',
    minWidth: 80, // Ensure minimum width for the status container
  },
  modStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modMessageCountContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modPrivateContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 6,
  },
  ticker: {
    fontSize: 24,
    marginRight: 12,
    color: '#E0E0E0',
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
  noCreationsText: {
    color: '#808080',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
  },
  loader: {
    marginTop: 32,
  },
  signOutButton: {
    backgroundColor: '#8B1E3F',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    marginBottom: 70
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  creationsContainer: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#6C1748',
  },
  tabText: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  categoriesScrollView: {
    flexGrow: 0,
  },
  categoryPage: {
    width: windowWidth - 32,
    paddingHorizontal: 0,
  },
  gridItem: {
    width: itemWidth,
    marginBottom: 16,
    backgroundColor: 'rgba(44, 44, 44, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
});

export default AccountScreen;