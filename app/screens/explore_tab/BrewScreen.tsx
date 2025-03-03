import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, TextInput, 
  Alert, Platform, ScrollView, Keyboard, Animated 
} from 'react-native';
import { useBrewContext } from '../../../utils/BrewContext';
import { useAuth } from '../../../utils/AuthContext';
import { supabase } from '../../../utils/supabase';
import * as GoogleGenerativeAI from "@google/generative-ai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

const API_KEY = "AIzaSyAfUJbHB5Kr7oL0kvY00FuLo9aEuaE0uYM";

export default function BrewScreen() {
  const { scenes, characters, mods, removeFromBrew } = useBrewContext();
  const { session } = useAuth();
  const [brewName, setBrewName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    validateCharacterCount();

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height - 85,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const validateCharacterCount = () => {
    if (scenes.length > 0) {
      const selectedScene = scenes[0];
      if (characters.length > selectedScene.max_characters) {
        setErrorMessage(`This scene allows a maximum of ${selectedScene.max_characters} character(s). Please remove ${characters.length - selectedScene.max_characters} character(s).`);
      } else {
        setErrorMessage('');
      }
    }
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  const generateBrewName = async () => {
    if (scenes.length === 0 || characters.length === 0) {
      Alert.alert('Error', 'Please add at least one scene and character before generating a name');
      return;
    }

    setIsGeneratingName(true);
    const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const selectedScene = scenes[0];
    const characterDescriptions = characters.map(char => 
      `${char.name}: ${char.description}`
    ).join('\n');

    const prompt = `Generate a creative and memorable name for a roleplay scenario with the following elements:

Scene: ${selectedScene.name}
Scene Description: ${selectedScene.description}

Characters:
${characterDescriptions}

${mods.length > 0 ? `Mods/Modifications:
${mods.map(mod => `${mod.name}: ${mod.description}`).join('\n')}` : ''}

Please generate a short name (2-6 words) that captures the essence of this scene and its characters.

Return only the name, nothing else.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const generatedName = response.text().trim();
      setBrewName(generatedName);
    } catch (error) {
      console.error('Error generating brew name:', error);
      Alert.alert('Error', 'Failed to generate brew name. Please try again or enter one manually.');
    }
    setIsGeneratingName(false);
  };

  const createBrew = async () => {
    if (!brewName.trim() || scenes.length === 0 || characters.length === 0) return;

    try {
      const selectedScene = scenes[0];
      if (characters.length > selectedScene.max_characters) {
        Alert.alert('Error', 'Too many characters for this scene');
        return;
      }

      const { data: brew, error: brewError } = await supabase
        .from('brews')
        .insert([{
          name: brewName.trim(),
          user_id: session?.user.id
        }])
        .select()
        .single();

      if (brewError) throw brewError;

      // Add scene
      const { error: sceneError } = await supabase
        .from('brew_scenes')
        .insert([{
          brew_id: brew.id,
          scene_id: scenes[0].id
        }]);

      if (sceneError) throw sceneError;

      // Add characters
      const characterInserts = characters.map(char => ({
        brew_id: brew.id,
        character_id: char.id
      }));

      const { error: characterError } = await supabase
        .from('brew_characters')
        .insert(characterInserts);

      if (characterError) throw characterError;

      // Add mods
      if (mods.length > 0) {
        const modInserts = mods.map(mod => ({
          brew_id: brew.id,
          mod_id: mod.id
        }));

        const { error: modError } = await supabase
          .from('brew_mods')
          .insert(modInserts);

        if (modError) throw modError;
      }

      setBrewName('');
      Keyboard.dismiss();
      Alert.alert('Success', 'Brew created successfully!');
    } catch (error) {
      console.error('Error creating brew:', error);
      Alert.alert('Error', 'Failed to create brew');
    }
  };

  const isCreateBrewDisabled = () => {
    if (scenes.length === 0 || characters.length === 0 || !brewName.trim()) {
      return true;
    }
    const selectedScene = scenes[0];
    return characters.length > selectedScene.max_characters;
  };

  const renderContent = () => {
    if (scenes.length === 0 && characters.length === 0 && mods.length === 0) {
      return (
        <Text style={styles.emptyMessage}>
          Your brew is empty. Add scenes, characters, and mods from their respective screens.
        </Text>
      );
    }

    return (
      <>
        {scenes.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Scenes</Text>
            {scenes.map((scene) => (
              <View key={scene.id} style={styles.item}>
                <Image source={{ uri: scene.image_url }} style={styles.sceneImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{scene.name}</Text>
                  <Text style={styles.itemDescription}>{scene.description}</Text>
                  <Text style={styles.maxCharacters}>Max Characters: {scene.max_characters}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromBrew('scenes', scene.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {characters.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Characters</Text>
            {characters.map((character) => (
              <View key={character.id} style={styles.item}>
                <Image source={{ uri: character.avatar_url }} style={styles.avatar} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{character.name}</Text>
                  <Text style={styles.itemDescription}>{character.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromBrew('characters', character.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {mods.length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Mods</Text>
            {mods.map((mod) => (
              <View key={mod.id} style={styles.item}>
                <View style={styles.tickerContainer}>
                  <Text style={styles.ticker}>{mod.ticker}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{mod.name}</Text>
                  <Text style={styles.itemDescription}>{mod.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromBrew('mods', mod.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Your Brew</Text>
        {renderContent()}
      </ScrollView>
      
      <Animated.View 
        style={[
          styles.createBrewContainer,
          {
            transform: [{
              translateY: keyboardHeight.interpolate({
                inputRange: [0, 1000],
                outputRange: [0, -1000],
              })
            }]
          }
        ]}
      >
        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={brewName}
            onChangeText={setBrewName}
            placeholder="Enter brew name"
            placeholderTextColor="#808080"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[
              styles.generateButton,
              (isGeneratingName || scenes.length === 0 || characters.length === 0) && styles.generateButtonDisabled
            ]}
            onPress={generateBrewName}
            disabled={isGeneratingName || scenes.length === 0 || characters.length === 0}
          >
            <Text style={styles.generateButtonText}>
              {isGeneratingName ? 'Generating...' : 'Generate Name'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.createButton,
            isCreateBrewDisabled() && styles.createButtonDisabled
          ]}
          onPress={createBrew}
          disabled={isCreateBrewDisabled()}
        >
          <Text style={styles.createButtonText}>Brew it!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 200,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  subSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6C1748',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  sceneImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  itemDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  maxCharacters: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Light' : 'Roboto-Light',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#808080',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  createBrewContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 80,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  errorMessage: {
    color: '#FF6B6B',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  removeButton: {
    backgroundColor: '#8B1E3F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  generateButton: {
    backgroundColor: '#6C1748',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#404040',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  createButton: {
    backgroundColor: '#6C1748',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#404040',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  tickerContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#404040',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ticker: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});