import React, { useState } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { supabase } from '../../../utils/supabase';
import { validateBaseData } from '../../../utils/createUtils';
import { useAuth } from '../../../utils/AuthContext';

const STEPS = {
  NAME: 0,
  DESCRIPTION: 1,
  TICKER: 2
} as const;

type Step = typeof STEPS[keyof typeof STEPS];

const CreateModScreen: React.FC = () => {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(STEPS.NAME);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tickerSymbol, setTickerSymbol] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const isValidTickerSymbol = (symbol: string) => {
    const emojiRegex = /^[\p{Emoji}]{3}$/u;
    return emojiRegex.test(symbol);
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case STEPS.NAME:
        if (!name.trim()) {
          Alert.alert('Error', 'Please enter a mod name');
          return false;
        }
        break;
      case STEPS.DESCRIPTION:
        if (!description.trim()) {
          Alert.alert('Error', 'Please enter a mod description');
          return false;
        }
        break;
      case STEPS.TICKER:
        if (!isValidTickerSymbol(tickerSymbol)) {
          Alert.alert('Error', 'Ticker symbol must be exactly 3 emojis');
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

  const handleCreate = async () => {
    if (!validateStep()) return;

    if (!session?.user?.id) {
      Alert.alert('Error', 'You must be logged in to create a mod');
      return;
    }

    const baseData = { name, description, image: tickerSymbol };
    if (!validateBaseData(baseData)) {
      return;
    }

    setUploading(true);

    try {
      const result = await supabase
        .from('mods')
        .insert({ 
          name, 
          description,
          ticker: tickerSymbol,
          user_id: session.user.id,
          is_private: isPrivate
        })
        .select()
        .single();

      if (result.error) throw result.error;

      Alert.alert('Success', 'Mod created successfully!');
      setName('');
      setDescription('');
      setTickerSymbol('');
      setCurrentStep(STEPS.NAME);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error creating mod:', error);
      Alert.alert('Error', 'Failed to create mod. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({ length: 3 }, (_, i) => (
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
          onPress={currentStep < STEPS.TICKER ? handleNext : handleCreate}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.navigationButtonText, styles.navigationButtonTextPrimary]}>
              {currentStep < STEPS.TICKER ? 'Next' : 'Create Mod'}
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
            <Text style={styles.stepTitle}>What's your mod's name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Mod Name"
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
            <Text style={styles.stepTitle}>Describe your mod</Text>
            <Text style={styles.stepSubtitle}>
              What does your mod do?
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mod Description"
              placeholderTextColor="#808080"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
            />
          </View>
        );
      case STEPS.TICKER:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose a ticker symbol</Text>
            <Text style={styles.stepSubtitle}>
              Select exactly 3 emojis to represent your mod
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ticker Symbol (3 Emojis)"
              placeholderTextColor="#808080"
              value={tickerSymbol}
              onChangeText={(text) => {
                const emojis = [...text];
                const filteredEmojis = emojis.filter(char => {
                  const emojiRegex = /\p{Emoji}/u;
                  return emojiRegex.test(char);
                }).slice(0, 3);
                setTickerSymbol(filteredEmojis.join(''));
              }}
            />
            <TouchableOpacity 
              style={styles.privacyCheckbox}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
                {isPrivate && <Ionicons name="checkmark" size={16} color="#E0E0E0" />}
              </View>
              <Text style={styles.privacyText}>Make this mod private</Text>
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
          <Text style={styles.title}>Create Mod</Text>
          <StepIndicator />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {renderCurrentStep()}
          </ScrollView>
          
          <NavigationButtons />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

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
});

export default CreateModScreen;