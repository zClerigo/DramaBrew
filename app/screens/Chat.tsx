import React, { useState, useEffect, useRef } from "react";
import * as GoogleGenerativeAI from "@google/generative-ai";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Keyboard,
  Animated,
  UIManager,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  KeyboardAvoidingView,
  ImageBackground,
} from "react-native";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { useChat, Message, CharacterMessage } from '../../utils/ChatContext';
import { useBrewContext, Scene, Character, Mod } from '../../utils/BrewContext';
import { RouteProp, NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { incrementMessageCount } from '../../utils/supabase';
import { Tag } from '../types/character';

type RootStackParamList = {
  Chat: { brewId: string; brewName: string };
  SceneDetail: {
    scene: {
      id: string;
      name: string;
      description: string;
      image_url: string;
      max_characters: number;
    };
  };
  CharacterDetail: { character: Character };
  ModDetail: { mod: Mod };
  MainTabs: undefined;
  CreateCharacter: undefined;
  CreateScene: undefined;
  CreateMod: undefined;
  Profile: { userId: string };
  TagSelection: { selectedTags: Tag[] };
  Login: undefined;
  Signup: undefined;
};

export type ChatProps = {
  route: RouteProp<RootStackParamList, 'Chat'>;
  navigation: NavigationProp<RootStackParamList>;
};

interface BrewSettingsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  navigation: NavigationProp<RootStackParamList>;
  brew: {
    id: string;
    name: string;
    scene: Scene;
    characters: Character[];
    mods: Mod[];
  } | undefined;
}

const API_KEY = "API_KEY";

const BrewSettingsMenu: React.FC<BrewSettingsMenuProps> = ({ 
  isVisible, 
  onClose, 
  navigation,
  brew 
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      Keyboard.dismiss();
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [isVisible]);

  const handleScenePress = () => {
    onClose();
    navigation.navigate('SceneDetail', { 
      scene: {
        id: brew?.scene.id || '',
        name: brew?.scene.name || '',
        description: brew?.scene.description || '',
        image_url: brew?.scene.image_url || '',
        max_characters: brew?.scene.max_characters || 0
      }
    });
  };

  const handleCharacterPress = (character: Character) => {
    onClose();
    navigation.navigate('CharacterDetail', { character });
  };

  const handleModPress = (mod: Mod) => {
    onClose();
    navigation.navigate('ModDetail', { mod });
  };

  if (!brew || !shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.menuOverlayContainer,
        {
          opacity: fadeAnim,
          pointerEvents: isVisible ? 'auto' : 'none',
        }
      ]}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.settingsMenu,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >

          <ScrollView
            style={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.menuTitle}>Brew Details</Text>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Scene</Text>
              <TouchableOpacity onPress={handleScenePress}>
                <View style={styles.sceneInfo}>
                  <Image
                    source={{ uri: brew.scene.image_url }}
                    style={styles.sceneImage}
                  />
                  <Text style={styles.sceneName}>{brew.scene.name}</Text>
                  <Text style={styles.sceneDescription}>{brew.scene.description}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Characters ({brew.characters.length}/{brew.scene.max_characters})</Text>
              {brew.characters.map((character) => (
                <TouchableOpacity 
                  key={character.id} 
                  onPress={() => handleCharacterPress(character)}
                >
                  <View style={styles.characterCard}>
                    <Image
                      source={{ uri: character.avatar_url }}
                      style={styles.characterAvatar}
                    />
                    <View style={styles.characterInfo}>
                      <Text style={styles.characterMenuName}>{character.name}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {brew.mods && brew.mods.length > 0 && (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Mods</Text>
      {brew.mods.map((mod) => (
        <TouchableOpacity 
          key={mod.id} 
          onPress={() => handleModPress(mod)}
        >
          <View style={styles.modCard}>
              <Text style={styles.modName}>{mod.name}</Text>
              <Text style={styles.modDescription}>{mod.description}</Text>
              {mod.ticker && (
                <Text style={styles.modTicker}>{mod.ticker}</Text>
              )}
            </View>
        </TouchableOpacity>
      ))}
    </View>
  )}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const Chat: React.FC<ChatProps> = ({ route, navigation }) => {
  const { brewId, brewName } = route.params;
  const { conversations, addMessage, updateConversationHistory, clearAndRestartChat } = useChat();
  const { brews } = useBrewContext();
  const [userInput, setUserInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const lastContentOffset = useRef<number>(0);
  const isScrollingUp = useRef<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const brew = brews.find(b => b.id === brewId);

  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialLoad) {
        if (conversations[brewId]?.messages?.length > 0) {
          setTimeout(() => {
            scrollToBottom(false);
            setIsInitialLoad(false);
          }, 100);
        } else if (brew && brew.characters && brew.characters.length === 1) {
          setLoading(true);
          const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
          
          try {
            await incrementMessageCount({
              characterIds: brew.characters.map(char => char.id.toString()),
              sceneId: brew.scene.id.toString(),
              modIds: brew.mods?.map(mod => mod.id.toString()) || []
            });
          } catch (error) {
            console.error('Error incrementing message counts:', error);
          }

          const character = brew.characters[0];
          const sceneDescription = `Scene: ${brew.scene.name}. ${brew.scene.description}`;
          
          const prompt = `You are roleplaying a character in an interactive scene. This is the start of the conversation.

${sceneDescription}

Character Profile - ${character.name}:
Background: ${character.background}
Personality: ${character.personality_traits}
Motivations: ${character.motivations}
Fears: ${character.fears}
Typical Introduction: ${character.intro_text}
Speech Pattern: ${character.dialogue_style}

${brew.mods && brew.mods.length > 0 ? `Active Mods:
${brew.mods.map(mod => `${mod.name}: ${mod.description}`).join('\n')}` : ''}

Roleplay Instructions:
- Respond as the character and a narrator, showing their unique personality
- Use their established dialogue style and speech patterns
- Show their motivations and fears through their responses
- Use *asterisks* to indicate character actions/emotes
- Actions should be in third-person
- Dialogue should feel natural and in-character
${brew.mods && brew.mods.length > 0 ? '- Incorporate the themes and elements from the active mods' : ''}

Format response like this:

${character.name}: Character response and actions if necessary (ONE LINE)

Narrator: What happens in the scene that is not a character's response or a character's actions

Generate a response that introduces the character in their signature style:`;

          try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            const characterResponses = text.split('\n').filter(line => line.trim() !== '');
            const characterMessages: CharacterMessage[] = characterResponses.map(response => {
              const [character, ...messageParts] = response.split(':');
              const fullMessage = messageParts.join(':').trim();
              
              return {
                character: character.trim(),
                text: fullMessage
              };
            });

            const aiMessage: Message = { 
              text: characterMessages.map(cm => `${cm.text}`).join('\n'), 
              user: false,
              characterMessages: characterMessages
            };
            
            addMessage(brewId, aiMessage);
            updateConversationHistory(brewId, `${text}\n`);
          } catch (error) {
            console.error('Error generating AI response:', error);
          }
          setLoading(false);
          setIsInitialLoad(false);
          setTimeout(() => scrollToBottom(false), 100);
        } else {
          setIsInitialLoad(false);
        }
      }
    };

    initializeChat();
  }, [brewId, conversations, isInitialLoad, brew]);

  useEffect(() => {
    navigation.setOptions({ 
      title: brewName,
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            setIsSettingsVisible(prev => !prev);
          }}
          style={styles.headerButton}
        >
          <Ionicons 
            name={isSettingsVisible ? "close" : "list-outline"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      ),
    });

    const handleKeyboardEvent = (event: KeyboardEvent, visible: boolean) => {
      setIsKeyboardVisible(visible);
      const height = visible ? event.endCoordinates.height : 0;
      
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardHeight, {
          toValue: height - (visible ? 23 : 0),
          duration: event.duration,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.spring(keyboardHeight, {
          toValue: height,
          useNativeDriver: false,
          speed: 20,
          bounciness: 0,
        }).start();
      }
    };

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => handleKeyboardEvent(e, true)
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => handleKeyboardEvent(e, false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [brewName, navigation, isSettingsVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    isScrollingUp.current = currentOffset < lastContentOffset.current;
    
    if (isScrollingUp.current && isKeyboardVisible) {
      Keyboard.dismiss();
    }
    
    lastContentOffset.current = currentOffset;
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

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: 999999,
          animated: animated
        });
      }, 100);
    }
  };

  const handleUserMessage = async () => {
    if (!userInput.trim() || !brew) return;
    
    const userMessage: Message = { 
      text: userInput, 
      user: true
    };
    addMessage(brewId, userMessage);

    if (brew.characters && brew.characters.length === 1) {
      await sendMessage(brew.characters[0].name);
    } else {
      setUserInput("");
    }
  };

  const sendMessage = async (specificCharacter: string) => {
    if (!brew) return;

    setLoading(true);
    Keyboard.dismiss();

    try {
      await incrementMessageCount({
        characterIds: brew.characters.map(char => char.id.toString()),
        sceneId: brew.scene.id.toString(),
        modIds: brew.mods?.map(mod => mod.id.toString()) || []
      });
    } catch (error) {
      console.error('Error incrementing message counts:', error);
    }

    const currentConversation = conversations[brewId] || { messages: [], conversationHistory: '' };
    const updatedHistory = `${currentConversation.conversationHistory}User: ${userInput}\n`;
    updateConversationHistory(brewId, updatedHistory);

    const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const character = brew.characters.find(char => char.name === specificCharacter);
    const sceneDescription = `Scene: ${brew.scene.name}. ${brew.scene.description}`;
    
    const prompt = `You are roleplaying as ${specificCharacter} in an interactive scene.

${sceneDescription}

Character Profile - ${character?.name}:
Background: ${character?.background}
Personality: ${character?.personality_traits}
Motivations: ${character?.motivations}
Fears: ${character?.fears}
Speech Pattern: ${character?.dialogue_style}

${brew.mods && brew.mods.length > 0 ? `Active Mods:
  ${brew.mods.map(mod => `${mod.name}: ${mod.description}`).join('\n')}` : ''}
  
  You must respond as ${specificCharacter} with dialogue and actions that reflect their:
  - Unique personality traits and background
  - Established speech patterns and mannerisms
  - Personal motivations and fears
  - Character development based on the conversation history
  
  Roleplay Instructions:
  - Respond only as ${specificCharacter} and optionally a narrator
  - Use *asterisks* to indicate character actions/emotes
  - Actions should be in third-person
  - Dialogue should feel natural and match their established style
  - Consider the context of the previous messages
  ${brew.mods && brew.mods.length > 0 ? '- Incorporate the themes and elements from the active mods' : ''}
  
  Format response like this:
  
  ${specificCharacter}: Character response and actions (ONE LINE)
  
  Narrator (OPTIONAL | DO NOT SHOW NARRATOR NAME IF NARRATOR IS NOT RESPONDING): What happens in the scene that is not a character's response or a character's actions (USE IF NEEDED)
  
  Conversation history:
  ${updatedHistory}
  
  Generate a response that stays true to the character's established personality:`;
  
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        const characterResponses = text.split('\n').filter(line => line.trim() !== '');
        const characterMessages: CharacterMessage[] = characterResponses.map(response => {
          const [character, ...messageParts] = response.split(':');
          const fullMessage = messageParts.join(':').trim();
          
          return {
            character: character.trim(),
            text: fullMessage
          };
        });
  
        const aiMessage: Message = { 
          text: characterMessages.map(cm => `${cm.text}`).join('\n'), 
          user: false,
          characterMessages: characterMessages
        };
        
        addMessage(brewId, aiMessage);
        updateConversationHistory(brewId, `${updatedHistory}${text}\n`);
      } catch (error) {
        console.error('Error generating AI response:', error);
        addMessage(brewId, { 
          text: "Sorry, I couldn't generate a response. Please try again.", 
          user: false 
        });
      }
  
      setLoading(false);
      setUserInput("");
    };
  
    const handleClearAndRestartChat = () => {
      clearAndRestartChat(brewId);
      setUserInput("");
    };
  
    const parseMessageText = (text: string) => {
      const parts = text.split(/(\*[^*]+\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={index} style={{ fontStyle: 'italic', color: 'rgba(169, 169, 169, 0.7)' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      });
    };
  
    const renderMessage = ({ item, index }: { item: Message, index: number }) => {
      return (
        <View style={[
          styles.messageContainer, 
          item.user ? styles.userMessageContainer : styles.characterMessageContainer
        ]}>
          {item.user ? (
            <View style={[
              styles.messageBubble, 
              styles.userMessageBubble
            ]}>
              <Text style={[
                styles.messageText, 
                styles.userMessageText
              ]}>
                {parseMessageText(item.text)}
              </Text>
            </View>
          ) : (
            <View style={styles.characterMessageWrapper}>
              <View style={styles.messageColumn}>
                {item.characterMessages?.map((charMessage, msgIndex) => (
                  <React.Fragment key={msgIndex}>
                    {charMessage.character === 'Narrator' ? (
                      <View style={styles.narratorContainer}>
                        <Text style={styles.narratorText}>
                          {parseMessageText(charMessage.text)}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.characterInfo}>
                          <Image 
                            source={{ uri: brew?.characters.find(c => c.name === charMessage.character)?.avatar_url }} 
                            style={styles.avatar} 
                          />
                          <Text style={styles.characterName}>{charMessage.character}</Text>
                        </View>
                        <View style={[
                          styles.messageBubble,
                          styles.characterMessageBubble
                        ]}>
                          <Text style={[
                            styles.messageText,
                            styles.characterMessageText
                          ]}>
                            {parseMessageText(charMessage.text)}
                          </Text>
                        </View>
                      </>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </View>
      );
    };
  
    useEffect(() => {
      if (!isInitialLoad && conversations[brewId]?.messages?.length > 0) {
        scrollToBottom();
      }
    }, [conversations[brewId]?.messages, isKeyboardVisible, isInitialLoad]);
  
    const renderCharacterButtons = () => {
      if (!brew || brew.characters.length <= 1) return null;
  
      return (
        <View style={styles.characterButtonsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.characterButtonsScroll}
          >
            {brew.characters.map((character) => (
              <TouchableOpacity 
                key={character.id} 
                style={[
                  styles.characterButton,
                  { opacity: loading ? 0.5 : 1 }
                ]}
                onPress={() => sendMessage(character.name)}
                disabled={loading}
              >
                <Image 
                  source={{ uri: character.avatar_url }} 
                  style={styles.characterButtonAvatar} 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    };
  
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: brew?.scene?.image_url }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.chatContainer}>
              <FlatList
                ref={flatListRef}
                data={conversations[brewId]?.messages || []}
                renderItem={renderMessage}
                keyExtractor={(item, index) => index.toString()}
                style={styles.flatList}
                contentContainerStyle={[
                  styles.flatListContent,
                  { 
                    paddingBottom: isKeyboardVisible ? 
                      (brew && brew.characters && brew.characters.length > 1 ? 485 : 420) : 
                      (brew && brew.characters && brew.characters.length > 1 ? 160 : 95) 
                  }
                ]}
                keyboardShouldPersistTaps="handled"
                onScrollToIndexFailed={() => {}}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10
                }}
                onLayout={() => {
                  if (isInitialLoad) {
                    scrollToBottom(false);
                  }
                }}
              />
              <Animated.View
                style={[
                  styles.inputWrapper,
                  { 
                    transform: [{ translateY: Animated.multiply(keyboardHeight, -1) }],
                    paddingBottom: Platform.OS === 'ios' ? 0 : 10
                  }
                ]}
              >
                {renderCharacterButtons()}
                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Type a message or *action*"
                    onChangeText={setUserInput}
                    value={userInput}
                    onSubmitEditing={handleUserMessage}
                    style={styles.input}
                    placeholderTextColor="#999"
                    multiline={false}
                    returnKeyType="send"
                  />
                  <TouchableOpacity 
                    style={styles.sendButton} 
                    onPress={handleUserMessage}
                    disabled={loading}
                  >
                    <Entypo name="paper-plane" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={handleClearAndRestartChat}
                  >
                    <Entypo name="trash" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </View>
        </ImageBackground>
        <BrewSettingsMenu 
  isVisible={isSettingsVisible}
  onClose={() => setIsSettingsVisible(false)}
  navigation={navigation}
  brew={brew}
/>
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundImage: {
      flex: 1,
      width: '100%',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    chatContainer: {
      flex: 1,
      position: 'relative',
    },
    flatList: {
      flex: 1,
    },
    flatListContent: {
      paddingTop: 10,
    },
    messageBubble: {
      padding: 10,
      borderRadius: 20,
      maxWidth: '100%',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    userMessageBubble: {
      backgroundColor: 'rgba(108, 23, 72, 0.9)', // More transparent purple
      borderBottomRightRadius: 0,
    },
    characterMessageBubble: {
      backgroundColor: 'rgba(44, 44, 44, 0.85)', // More transparent dark
      borderBottomLeftRadius: 0,
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      paddingBottom: 40,
      backgroundColor: 'rgba(32, 32, 32, 0.9)', // More transparent dark
    },
    input: {
      flex: 1,
      padding: 10,
      backgroundColor: "rgba(42, 42, 42, 0.9)", // More transparent input
      borderRadius: 20,
      marginRight: 10,
      color: "#FFFFFF",
      maxHeight: 100,
    },
    sendButton: {
      padding: 10,
      backgroundColor: "rgba(108, 23, 72, 0.9)",
      borderRadius: 20,
      marginRight: 10,
    },
    clearButton: {
      padding: 10,
      backgroundColor: "rgba(139, 30, 63, 0.9)",
      borderRadius: 20,
    },
    narratorContainer: {
      width: '100%',
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginVertical: 5,
      alignItems: 'center',
    },
    narratorText: {
      color: '#E0E0E0',
      fontSize: 14,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 20,
    },
    characterButtonsContainer: {
      backgroundColor: 'rgba(26, 26, 26, 0.9)',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(44, 44, 44, 0.9)',
    },
    messageText: { 
      fontSize: 16,
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowRadius: 10
    },
    characterName: {
      fontSize: 12,
      color: '#E0E0E0',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10
    },
    characterMenuName: {
      fontSize: 15,
      color: '#E0E0E0',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10,
      marginLeft: 10,
    },
    messageContainer: { 
      marginVertical: 5,
      paddingHorizontal: 10,
    },
    userMessageContainer: {
      alignItems: 'flex-end',
    },
    characterMessageContainer: {
      alignItems: 'flex-start',
    },
    characterMessageWrapper: {
      marginBottom: 5,
      maxWidth: '80%',
    },
    messageColumn: {
      alignItems: 'flex-start',
    },
    userMessageText: {
      color: '#FFFFFF',
    },
    characterMessageText: {
      color: '#E0E0E0',
    },
    inputWrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 100,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 6,
    },
    characterInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    characterButtonsScroll: {
      paddingHorizontal: 10,
    },
    characterButton: {
      marginRight: 10,
      padding: 2,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#6C1748',
    },
    characterButtonAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerButton: {
      paddingHorizontal: 15,
    },
    settingsMenu: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 300,
      backgroundColor: 'rgba(26, 26, 26, 0.95)',
      zIndex: 1001,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 1002,
      padding: 10,
    },
    menuContent: {
      flex: 1,
      padding: 20,
      paddingTop: 60,
    },
    menuTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 20,
    },
    sectionContainer: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      paddingBottom: 5,
    },
    sceneInfo: {
      backgroundColor: 'rgba(44, 44, 44, 0.5)',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sceneImage: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      marginBottom: 10,
    },
    sceneName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 5,
    },
    sceneDescription: {
      fontSize: 14,
      color: '#E0E0E0',
      lineHeight: 20,
    },
    characterCard: {
      flexDirection: 'row',
      backgroundColor: 'rgba(44, 44, 44, 0.5)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    characterAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: 'rgba(108, 23, 72, 0.9)',
    },
    characterDetail: {
      fontSize: 12,
      color: '#E0E0E0',
      marginBottom: 8,
    },
    expandButton: {
      backgroundColor: 'rgba(108, 23, 72, 0.9)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    expandButtonText: {
      color: 'white',
      fontSize: 12,
    },
    modCard: {
      backgroundColor: 'rgba(44, 44, 44, 0.5)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 5,
    },
    modDescription: {
      fontSize: 12,
      color: '#E0E0E0',
      marginBottom: 5,
    },
    modTicker: {
      fontSize: 12,
      color: '#6C1748',
      fontStyle: 'italic',
    },
    menuOverlayContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    cardArrow: {
      marginLeft: 'auto',
      opacity: 0.8,
    },
  });
  
  export default Chat;