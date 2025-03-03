import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet, Platform, KeyboardAvoidingView } from "react-native";
import { useAuth } from "../../utils/AuthContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type SignupScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { signUp } = useAuth();

  const handleSignup = async () => {
    try {
      await signUp(email, password, displayName);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#808080" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#808080"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#808080" />
          <TextInput
            style={styles.input}
            placeholder="Display Name (optional)"
            placeholderTextColor="#808080"
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#808080" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#808080"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={handleSignup}
        >
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#1A1A1A',
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#808080',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6C1748',
  },
  input: {
    flex: 1,
    color: '#E0E0E0',
    paddingVertical: 16,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  signupButton: {
    backgroundColor: '#6C1748',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'Roboto-Bold',
  },
  loginButton: {
    paddingVertical: 8,
  },
  loginButtonText: {
    color: '#808080',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default SignupScreen;