import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type SearchItem = {
  id: string;
  name: string;
  description: string;
  type: 'scene' | 'character' | 'mod';
  ticker?: string; // Optional for mods
};

type RootStackParamList = {
  SceneDetail: { scene: SearchItem };
  CharacterDetail: { character: SearchItem };
  ModDetail: { mod: SearchItem };
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<SearchScreenNavigationProp>();

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const [sceneResults, characterResults, modResults] = await Promise.all([
        supabase
          .from('scenes')
          .select('id, name, description')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('characters')
          .select('id, name, description')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('mods')
          .select('id, name, description, ticker')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
      ]);

      const combinedResults: SearchItem[] = [
        ...(sceneResults.data?.map(item => ({ ...item, type: 'scene' as const })) || []),
        ...(characterResults.data?.map(item => ({ ...item, type: 'character' as const })) || []),
        ...(modResults.data?.map(item => ({ ...item, type: 'mod' as const })) || []),
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: SearchItem) => {
    switch (item.type) {
      case 'scene':
        navigation.navigate('SceneDetail', { scene: item });
        break;
      case 'character':
        navigation.navigate('CharacterDetail', { character: item });
        break;
      case 'mod':
        navigation.navigate('ModDetail', { mod: item });
        break;
    }
  };

  const renderSearchItem = ({ item }: { item: SearchItem }) => (
    <TouchableOpacity 
      style={[
        styles.searchItem,
        item.type === 'scene' ? styles.sceneItem : 
        item.type === 'character' ? styles.characterItem : 
        styles.modItem
      ]} 
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemContent}>
        {item.type === 'mod' && item.ticker && (
          <Text style={styles.ticker}>{item.ticker}</Text>
        )}
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={[
          styles.typeTag,
          item.type === 'scene' ? styles.sceneTag : 
          item.type === 'character' ? styles.characterTag :
          styles.modTag
        ]}>
          <Text style={styles.itemType}>{item.type}</Text>
        </View>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search scenes, characters, and mods..."
        placeholderTextColor="#808080"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#6C1748" style={styles.loader} />
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderSearchItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.length > 2 ? 'No results found' : 'Start typing to search'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  searchInput: {
    height: 50,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    margin: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  searchItem: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  sceneItem: {
    borderLeftColor: '#6C1748',
  },
  characterItem: {
    borderLeftColor: '#8B1E3F',
  },
  modItem: {
    borderLeftColor: '#4A90E2',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticker: {
    fontSize: 20,
    marginRight: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
    flex: 1,
    marginRight: 12,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sceneTag: {
    backgroundColor: '#6C1748',
  },
  characterTag: {
    backgroundColor: '#8B1E3F',
  },
  modTag: {
    backgroundColor: '#4A90E2',
  },
  itemType: {
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  itemDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#808080',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loader: {
    marginTop: 20,
  },
});

export default SearchScreen;