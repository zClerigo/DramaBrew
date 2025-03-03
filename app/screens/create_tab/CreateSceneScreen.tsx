import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { supabase } from '../../../utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../utils/AuthContext';
import {
  generateImage,
  uploadImage,
  validateBaseData,
  getImageDimensions,
  getPromptAdditions,
  getImageAspectRatio,
  type SceneData
} from '../../../utils/createUtils';

const STEPS = {
  NAME: 0,
  DETAILS: 1,
  IMAGE: 2,
  TAGS: 3
} as const;

type Step = typeof STEPS[keyof typeof STEPS];

const CreateSceneScreen: React.FC = () => {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.NAME);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxCharacters, setMaxCharacters] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const descriptionRef = useRef<TextInput>(null);

  const handleCharacterInsert = (index: number) => {
    const insert = `(CHARACTER ${index + 1})`;
    const newDescription = 
      description.slice(0, cursorPosition) + 
      insert + 
      description.slice(cursorPosition);
    
    setDescription(newDescription);
    
    // Update cursor position after insert
    const newPosition = cursorPosition + insert.length;
    setCursorPosition(newPosition);
    
    // Ensure input stays focused
    descriptionRef.current?.focus();
    descriptionRef.current?.setNativeProps({
      selection: {
        start: newPosition,
        end: newPosition,
      },
    });
  };

  const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(\\(CHARACTER \d+\\))/);
    
    return (
      <>
        {parts.map((part, index) => {
          const isCharacterPlaceholder = /^\(CHARACTER \d+\)$/.test(part);
          return (
            <Text
              key={index}
              style={{
                color: isCharacterPlaceholder ? '#6C1748' : '#E0E0E0',
              }}
            >
              {part}
            </Text>
          );
        })}
      </>
    );
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case STEPS.NAME:
        if (!name.trim()) {
          Alert.alert('Error', 'Please enter a scene name');
          return false;
        }
        break;
      case STEPS.DETAILS:
        if (!description.trim()) {
          Alert.alert('Error', 'Please enter a scene description');
          return false;
        }
        if (!maxCharacters || isNaN(parseInt(maxCharacters)) || parseInt(maxCharacters) <= 0) {
          Alert.alert('Error', 'Please enter a valid number for max characters');
          return false;
        }
        break;
      case STEPS.IMAGE:
        if (!image) {
          Alert.alert('Error', 'Please select or generate an image');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        return nextStep as Step;
      });
    }
  };
  
  const handleBack = () => {
    setCurrentStep((prev) => {
      const prevStep = prev - 1;
      return prevStep as Step;
    });
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: getImageAspectRatio('scene'),
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setShowImageOptions(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!description) {
      Alert.alert('Error', 'Please provide a description first');
      return;
    }

    setGeneratingImage(true);
    try {
      const dimensions = getImageDimensions('scene');
      const additionalPrompt = getPromptAdditions('scene');

      const generatedImage = await generateImage({
        description,
        width: dimensions.width,
        height: dimensions.height,
        additionalPrompt
      });

      setImage(generatedImage);
    } catch (error) {
      console.error('Error generating image:', error);
      Alert.alert('Error', 'Failed to generate image. Please try again.');
    } finally {
      setGeneratingImage(false);
      setShowImageOptions(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCreate = async () => {
    const baseData = { name, description, image };
    if (!validateBaseData(baseData)) {
      return;
    }
  
    setUploading(true);
  
    try {
      if (!image) {
        throw new Error('Image is required');
      }
  
      const imageUrl = await uploadImage(image, 'scene');
      if (!imageUrl) throw new Error('Failed to upload image');
  
      const sceneData: SceneData = {
        ...baseData,
        image_url: imageUrl,
        max_characters: parseInt(maxCharacters)
      };
  
      const sceneResult = await supabase
        .from('scenes')
        .insert({ 
          name: sceneData.name, 
          description: sceneData.description,
          image_url: sceneData.image_url,
          max_characters: sceneData.max_characters,
          is_private: isPrivate,
          user_id: session?.user.id
        })
        .select()
        .single();
  
      if (sceneResult.error) throw sceneResult.error;

      if (tags.length > 0) {
        for (const tagName of tags) {
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select()
            .single();

          if (tagError && tagError.code !== '23505') {
            console.error('Error inserting tag:', tagError);
            continue;
          }

          const { data: existingTag } = await supabase
            .from('tags')
            .select()
            .eq('name', tagName)
            .single();

          if (existingTag) {
            await supabase
              .from('scene_tags')
              .insert({
                scene_id: sceneResult.data.id,
                tag_id: existingTag.id
              });
          }
        }
      }
  
      Alert.alert('Success', 'Scene created successfully!');
      setName('');
      setDescription('');
      setMaxCharacters('');
      setImage(null);
      setTags([]);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error creating scene:', error);
      Alert.alert('Error', 'Failed to create scene. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const ImageOptionsModal = () => (
    <Modal
      transparent
      visible={showImageOptions}
      onRequestClose={() => setShowImageOptions(false)}
      animationType="fade"
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowImageOptions(false)}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.modalOption} 
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={24} color="#E0E0E0" />
            <Text style={styles.modalOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, styles.modalOptionLast]} 
            onPress={handleGenerateImage}
            disabled={generatingImage}
          >
            <Ionicons name="create-outline" size={24} color="#E0E0E0" />
            <Text style={styles.modalOptionText}>
              {generatingImage ? 'Generating...' : 'Generate from Description'}
            </Text>
            {generatingImage && (
              <ActivityIndicator 
                color="#E0E0E0" 
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const StepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: 4 }, (_, i) => (
        <View 
          key={i} 
          style={[
            styles.stepDot,
            currentStep === i && styles.stepDotActive,
            currentStep > i && styles.stepDotCompleted
          ]} 
        />
      ))}
    </View>
  );

  const NavigationButtons = () => (
    <View style={styles.navigationContainer}>
      <View style={styles.navigationButtonSlot}>
        {currentStep > 0 ? (
          <TouchableOpacity 
            style={styles.navigationButton} 
            onPress={handleBack}
          >
            <Text style={styles.navigationButtonText}>Back</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>
      
      <View style={styles.navigationButtonSlot}>
        <TouchableOpacity 
          style={[styles.navigationButton, styles.navigationButtonPrimary]} 
          onPress={currentStep < STEPS.TAGS ? handleNext : handleCreate}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.navigationButtonText, styles.navigationButtonTextPrimary]}>
              {currentStep < STEPS.TAGS ? 'Next' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.NAME:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your scene's name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Scene Name"
              placeholderTextColor="#808080"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        );
        case STEPS.DETAILS:
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Scene Details</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Maximum number of characters"
                placeholderTextColor="#808080"
                value={maxCharacters}
                onChangeText={setMaxCharacters}
                keyboardType="numeric"
                returnKeyType="done"
              />
  
              {parseInt(maxCharacters) > 0 && (
                <>
                  <Text style={styles.characterHelperText}>
                    Add character placeholders to your description
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.characterButtonsContainer}
                    keyboardShouldPersistTaps="handled"
                  >
                    {Array.from({ length: parseInt(maxCharacters) }, (_, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.characterButton}
                        onPress={() => handleCharacterInsert(i)}
                      >
                        <Text style={styles.characterButtonText}>
                          Character {i + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
  
              <TextInput
                ref={descriptionRef}
                style={[styles.input, styles.textArea]}
                placeholder="Describe your scene and click character buttons to add placeholders"
                placeholderTextColor="#808080"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                onSelectionChange={(event) => {
                  setCursorPosition(event.nativeEvent.selection.start);
                }}
              />
            </View>
          );
      case STEPS.IMAGE:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create your scene's image</Text>
            <TouchableOpacity 
              style={styles.imageContainer} 
              onPress={() => setShowImageOptions(true)}
            >
              {image ? (
                <Image 
                  source={{ uri: image }} 
                  style={styles.image} 
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>
                    Tap to {image ? 'change' : 'add'} scene image
                  </Text>
                  <Text style={styles.imagePlaceholderSubtext}>
                    Choose from gallery or generate from description
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      case STEPS.TAGS:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Add Tags</Text>
            <Text style={styles.stepSubtitle}>
              Add tags to help others find your scene
            </Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add tags..."
                placeholderTextColor="#808080"
                value={currentTag}
                onChangeText={setCurrentTag}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity 
                style={styles.addTagButton}
                onPress={handleAddTag}
              >
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
      
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(tag)}
                      style={styles.removeTagButton}
                    >
                      <Ionicons name="close-circle" size={16} color="#E0E0E0" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.privacyCheckbox}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
                {isPrivate && <Ionicons name="checkmark" size={16} color="#E0E0E0" />}
              </View>
              <Text style={styles.privacyText}>Make this scene private</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Create Scene</Text>
          <StepIndicator />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {renderCurrentStep()}
          </ScrollView>
          
          <NavigationButtons />
          <ImageOptionsModal />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    width: '100%',
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
  },
  // Step Indicator Styles
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#404040',
  },
  stepDotActive: {
    backgroundColor: '#6C1748',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotCompleted: {
    backgroundColor: '#6C1748',
  },
  // Input Styles
  input: {
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  // Image Styles
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#404040',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imagePlaceholderText: {
    color: '#808080',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  imagePlaceholderSubtext: {
    color: '#808080',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  // Navigation Styles
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    backgroundColor: '#1A1A1A',
    justifyContent: 'space-between',
  },
  navigationButtonSlot: {
    width: 160,
  },
  navigationButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    alignItems: 'center',
    width: '100%',
  },
  navigationButtonPrimary: {
    backgroundColor: '#6C1748',
  },
  navigationButtonText: {
    color: '#E0E0E0',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
  },
  navigationButtonTextPrimary: {
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#202020',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  // Tag Styles
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    padding: 12,
    color: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#404040',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: '#404040',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  removeTagButton: {
    marginLeft: 4,
  },
  // Privacy Checkbox Styles
  privacyCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#404040',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
  },
  checkboxChecked: {
    backgroundColor: '#6C1748',
    borderColor: '#6C1748',
  },
  privacyText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  characterButtonsContainer: {
      flexDirection: 'row',
      marginBottom: 12,
      maxHeight: 40,
    },
    characterButton: {
      backgroundColor: '#404040',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#6C1748',
    },
    characterButtonText: {
      color: '#E0E0E0',
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
    },
    characterHelperText: {
      color: '#808080',
      fontSize: 14,
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue' : 'Roboto',
    },
});

export default CreateSceneScreen;