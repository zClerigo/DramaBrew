import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../utils/supabase";
import { useAuth } from "../../../utils/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NavigationParams, Tag } from "./types";
import {
  generateImage,
  uploadImage,
  validateBaseData,
  getImageDimensions,
  getPromptAdditions,
  getImageAspectRatio,
  type CharacterData,
} from "../../../utils/createUtils";

type NavigationProp = NativeStackNavigationProp<
  NavigationParams,
  "CreateCharacter"
>;
type ScreenRouteProp = RouteProp<NavigationParams, "CreateCharacter">;

interface ExtendedCharacterData extends CharacterData {
  introText: string;
  dialogueStyle: string;
  motivations: string;
  background: string;
  personalityTraits: string;
  fears: string;
}

const STEPS = {
  NAME: 0,
  DESCRIPTION: 1,
  AVATAR: 2,
  DETAILS: 3,
  COMMUNICATION: 4,
  TAGS: 5,
} as const;

type Step = (typeof STEPS)[keyof typeof STEPS];

const CreateCharacterScreen: React.FC = () => {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.NAME);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [introText, setIntroText] = useState("");
  const [dialogueStyle, setDialogueStyle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [currentTag, setCurrentTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [motivations, setMotivations] = useState("");
  const [background, setBackground] = useState("");
  const [personalityTraits, setPersonalityTraits] = useState("");
  const [fears, setFears] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();

  useEffect(() => {
    if (route.params?.selectedTags) {
      setSelectedTags(route.params.selectedTags);
    }
  }, [route.params?.selectedTags]);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchAvailableTags = async () => {
    setLoadingTags(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');
  
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      Alert.alert('Error', 'Failed to load tags');
    } finally {
      setLoadingTags(false);
    }
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case STEPS.NAME:
        if (!name.trim()) {
          Alert.alert("Error", "Please enter a character name");
          return false;
        }
        break;
      case STEPS.DESCRIPTION:
        if (!description.trim()) {
          Alert.alert("Error", "Please enter a character description");
          return false;
        }
        break;
      case STEPS.AVATAR:
        if (!image) {
          Alert.alert("Error", "Please select or generate an avatar");
          return false;
        }
        break;
      case STEPS.DETAILS:
        if (
          !motivations.trim() ||
          !background.trim() ||
          !personalityTraits.trim() ||
          !fears.trim()
        ) {
          Alert.alert("Error", "Please fill in all character details");
          return false;
        }
        break;
      case STEPS.COMMUNICATION:
        if (!introText.trim() || !dialogueStyle.trim()) {
          Alert.alert(
            "Error",
            "Please fill in both introduction text and dialogue style"
          );
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
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to select images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: getImageAspectRatio("character"),
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
      setShowImageOptions(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!description) {
      Alert.alert("Error", "Please provide a description first");
      return;
    }

    setGeneratingImage(true);
    try {
      const dimensions = getImageDimensions("character");
      const additionalPrompt = getPromptAdditions("character");

      const generatedImage = await generateImage({
        description,
        width: dimensions.width,
        height: dimensions.height,
        additionalPrompt,
      });

      setImage(generatedImage);
    } catch (error) {
      console.error("Error generating image:", error);
      Alert.alert("Error", "Failed to generate image. Please try again.");
    } finally {
      setGeneratingImage(false);
      setShowImageOptions(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleCreate = async () => {
    const baseData = { name, description, image };
    if (!validateBaseData(baseData)) return;

    setUploading(true);
    try {
      if (!image) throw new Error("Image is required");
      const imageUrl = await uploadImage(image, "character");

      const { data: character, error: characterError } = await supabase
        .from("characters")
        .insert({
          name,
          description,
          avatar_url: imageUrl,
          intro_text: introText,
          dialogue_style: dialogueStyle,
          motivations,
          background,
          personality_traits: personalityTraits,
          fears,
          is_private: isPrivate,
          user_id: session?.user.id,
        })
        .select()
        .single();

      if (characterError) throw characterError;

      if (selectedTags.length > 0) {
        const characterTags = selectedTags.map((tag) => ({
          character_id: character.id,
          tag_id: tag.id,
        }));

        const { error: tagError } = await supabase
          .from("character_tags")
          .insert(characterTags);

        if (tagError) throw tagError;
      }

      Alert.alert("Success", "Character created successfully!");
      resetForm();
    } catch (error) {
      console.error("Error creating character:", error);
      Alert.alert("Error", "Failed to create character");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setImage(null);
    setIntroText("");
    setDialogueStyle("");
    setMotivations("");
    setBackground("");
    setPersonalityTraits("");
    setFears("");
    setSelectedTags([]);
    setIsPrivate(false);
    setCurrentStep(STEPS.NAME);
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
          <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
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
              {generatingImage ? "Generating..." : "Generate from Description"}
            </Text>
            {generatingImage && (
              <ActivityIndicator color="#E0E0E0" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const StepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            currentStep === i && styles.stepDotActive,
            currentStep > i && styles.stepDotCompleted,
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
        ) : (
          <View />
        )}
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
            <Text
              style={[
                styles.navigationButtonText,
                styles.navigationButtonTextPrimary,
              ]}
            >
              {currentStep < STEPS.TAGS ? "Next" : "Create"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const TagSelectorModal = () => {
    const [tempSelectedTags, setTempSelectedTags] = useState<Tag[]>(selectedTags);
  
    const handleClose = () => {
      setSelectedTags(tempSelectedTags);
      setShowTagSelector(false);
    };
  
    // Reset temp selection when modal opens
    useEffect(() => {
      if (showTagSelector) {
        setTempSelectedTags(selectedTags);
      }
    }, [showTagSelector]);
  
    return (
      <Modal
        transparent
        visible={showTagSelector}
        onRequestClose={handleClose}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.tagSelectorContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tags</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#E0E0E0" />
              </TouchableOpacity>
            </View>
            
            {loadingTags ? (
              <ActivityIndicator style={styles.tagsLoader} color="#E0E0E0" />
            ) : (
              <FlatList
                data={availableTags}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                  const isSelected = tempSelectedTags.some(tag => tag.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.tagOption, isSelected && styles.tagOptionSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setTempSelectedTags(tempSelectedTags.filter(t => t.id !== item.id));
                        } else {
                          setTempSelectedTags([...tempSelectedTags, item]);
                        }
                      }}
                    >
                      <Text style={styles.tagOptionText}>{item.name}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#E0E0E0" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };
  

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.NAME:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your character's name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Character Name"
              placeholderTextColor="#808080"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        );
      case STEPS.DESCRIPTION:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe your character</Text>
            <Text style={styles.stepSubtitle}>
              What does your character look like?
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Character Description"
              placeholderTextColor="#808080"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
            />
          </View>
        );
      case STEPS.AVATAR:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create your character's avatar</Text>
            <TouchableOpacity
              style={[styles.imageContainer, styles.avatarContainer]}
              onPress={() => setShowImageOptions(true)}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={[styles.image, styles.avatarImage]}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>
                    Tap to {image ? "change" : "add"} avatar
                  </Text>
                  <Text style={styles.imagePlaceholderSubtext}>
                    Choose from gallery or generate from description
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      case STEPS.DETAILS:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Character Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What motivates your character?"
              placeholderTextColor="#808080"
              value={motivations}
              onChangeText={setMotivations}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's your character's background?"
              placeholderTextColor="#808080"
              value={background}
              onChangeText={setBackground}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What are your character's personality traits?"
              placeholderTextColor="#808080"
              value={personalityTraits}
              onChangeText={setPersonalityTraits}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What are your character's fears?"
              placeholderTextColor="#808080"
              value={fears}
              onChangeText={setFears}
              multiline
              numberOfLines={4}
            />
          </View>
        );
      case STEPS.COMMUNICATION:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Communication Style</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How does your character introduce themselves?"
              placeholderTextColor="#808080"
              value={introText}
              onChangeText={setIntroText}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How does your character speak?"
              placeholderTextColor="#808080"
              value={dialogueStyle}
              onChangeText={setDialogueStyle}
              multiline
              numberOfLines={4}
            />
          </View>
        );
        case STEPS.TAGS:
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Add Tags</Text>
              <Text style={styles.stepSubtitle}>
                Select tags to help others find your character
              </Text>
              <TagSelectorModal/>
              <TouchableOpacity 
                style={styles.tagSelectorButton}
                onPress={() => setShowTagSelector(true)}
              >
                <Text style={styles.tagSelectorButtonText}>
                  {selectedTags.length ? 'Add More Tags' : 'Select Tags'}
                </Text>
              </TouchableOpacity>
        
              {selectedTags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {selectedTags.map((tag) => (
                    <View key={tag.id} style={styles.tag}>
                      <Text style={styles.tagText}>{tag.name}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedTags(selectedTags.filter(t => t.id !== tag.id))}
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
                <Text style={styles.privacyText}>Make this character private</Text>
              </TouchableOpacity>
            </View>
          );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Create Character</Text>
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

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    margin: 20,
    color: "#E0E0E0",
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
    textAlign: "center",
  },
  // Step Indicator Styles
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#404040",
  },
  stepDotActive: {
    backgroundColor: "#6C1748",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotCompleted: {
    backgroundColor: "#6C1748",
  },
  // Step Content Styles
  stepContainer: {
    flex: 1,
    width: "100%",
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E0E0E0",
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#808080",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue" : "Roboto",
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#2C2C2C",
    backgroundColor: "#1A1A1A",
    justifyContent: "space-between",
  },
  navigationButtonSlot: {
    width: 160,
  },
  navigationButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#2C2C2C",
    alignItems: "center",
    width: "100%",
  },
  navigationButtonPrimary: {
    backgroundColor: "#6C1748",
  },
  navigationButtonText: {
    color: "#E0E0E0",
    fontSize: 18, // Increased font size
    fontFamily:
      Platform.OS === "ios" ? "HelveticaNeue-Medium" : "Roboto-Medium",
  },
  navigationButtonTextPrimary: {
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
  },
  // Input Styles
  input: {
    backgroundColor: "#2C2C2C",
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#E0E0E0",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  // Image Styles
  imageContainer: {
    width: "100%",
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#404040",
  },
  avatarContainer: {
    aspectRatio: 1,
    width: width * 0.6,
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarImage: {
    aspectRatio: 1,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagePlaceholderText: {
    color: "#808080",
    textAlign: "center",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  imagePlaceholderSubtext: {
    color: "#808080",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#202020",
    borderRadius: 12,
    width: "80%",
    maxWidth: 300,
    overflow: "hidden",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionText: {
    color: "#E0E0E0",
    fontSize: 16,
    marginLeft: 12,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  // Tag Styles
  tagInputContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    backgroundColor: "#2C2C2C",
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 8,
    padding: 12,
    color: "#E0E0E0",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: "#404040",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  addTagButtonText: {
    color: "#E0E0E0",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: "#404040",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: {
    color: "#E0E0E0",
    fontSize: 14,
    marginRight: 4,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  removeTagButton: {
    marginLeft: 4,
  },
  navigationButtonWrapper: {
    flex: 1,
  },
  privacyCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#404040",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
  },
  checkboxChecked: {
    backgroundColor: "#6C1748",
    borderColor: "#6C1748",
  },
  privacyText: {
    color: "#E0E0E0",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  tagSelectorContent: {
    maxHeight: "80%",
    width: "90%",
    backgroundColor: "#202020",
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
  },
  modalTitle: {
    color: "#E0E0E0",
    fontSize: 18,
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
  },
  tagsLoader: {
    padding: 20,
  },
  tagOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
  },
  tagOptionSelected: {
    backgroundColor: "#2C2C2C",
  },
  tagOptionText: {
    color: "#E0E0E0",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
  },
  tagSelectorButton: {
    backgroundColor: "#404040",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  tagSelectorButtonText: {
    color: "#E0E0E0",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
  },
});

export default CreateCharacterScreen;
