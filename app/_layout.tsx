import React, { useState } from "react";
import {
  NavigationContainer,
  Theme,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "../utils/AuthContext";
import { ChatProvider } from "../utils/ChatContext";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import GeminiChat from "./screens/Chat";
import ExploreScreen from "./screens/ExploreScreen";
import SearchScreen from "./screens/SearchScreen";
import AccountScreen from "./screens/AccountScreen";
import SceneDetailScreen from "./screens/explore_tab/SceneDetailScreen";
import CharacterDetailScreen from "./screens/explore_tab/CharacterDetailScreen";
import ModDetailScreen from "./screens/explore_tab/ModDetailScreen";
import CreateCharacterScreen from "./screens/create_tab/CreateCharacterScreen";
import CreateSceneScreen from "./screens/create_tab/CreateSceneScreen";
import CreateModScreen from "./screens/create_tab/CreateModScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TagSelectionScreen from "./screens/create_tab/TagSelectionScreen";
import {
  ActivityIndicator,
  View,
  Platform,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  Pressable,
  Vibration,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { Ionicons } from "@expo/vector-icons";
import { BrewProvider } from "../utils/BrewContext";
import { ParamListBase, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Character, Tag, Mod } from "./types/character";

type CreateType = "character" | "scene" | "mod";

interface CreateOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: CreateType) => void;
}

const CreateOptionsModal: React.FC<CreateOptionsModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => onSelect("character")}
          >
            <Ionicons name="person-outline" size={24} color="#E0E0E0" />
            <Text style={styles.modalOptionText}>Create Character</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => onSelect("scene")}
          >
            <Ionicons name="image-outline" size={24} color="#E0E0E0" />
            <Text style={styles.modalOptionText}>Create Scene</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalOption, styles.modalOptionLast]}
            onPress={() => onSelect("mod")}
          >
            <Ionicons name="cube-outline" size={24} color="#E0E0E0" />
            <Text style={styles.modalOptionText}>Create Mod</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

type RootStackParamList = {
  MainTabs: undefined;
  CreateCharacter: undefined;
  CreateScene: undefined;
  CreateMod: undefined;
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
  Profile: { userId: string };
  TagSelection: { selectedTags: Tag[] };
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: "#6C1748",
    background: "#1A1A1A",
    card: "#202020",
    text: "#E0E0E0",
    border: "#2C2C2C",
    notification: "#6C1748",
  },
  fonts: {
    regular: {
      fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "Roboto",
      fontWeight: "400",
    },
    medium: {
      fontFamily:
        Platform.OS === "ios" ? "HelveticaNeue-Medium" : "Roboto-Medium",
      fontWeight: "500",
    },
    bold: {
      fontFamily: Platform.OS === "ios" ? "HelveticaNeue-Bold" : "Roboto-Bold",
      fontWeight: "700",
    },
    heavy: {
      fontFamily:
        Platform.OS === "ios" ? "HelveticaNeue-Heavy" : "Roboto-Black",
      fontWeight: "900",
    },
  },
};

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: "#202020",
  },
  headerTintColor: "#E0E0E0",
  headerTitleStyle: {
    color: "#E0E0E0",
  },
};

const TabNavigator = () => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleVibration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateOption = (type: CreateType) => {
    handleVibration();
    setCreateModalVisible(false);
    switch (type) {
      case "character":
        navigation.navigate("CreateCharacter");
        break;
      case "scene":
        navigation.navigate("CreateScene");
        break;
      case "mod":
        navigation.navigate("CreateMod");
        break;
    }
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
            } else if (route.name === "Explore") {
              iconName = focused ? "compass" : "compass-outline";
            } else if (route.name === "Create") {
              iconName = focused ? "add-circle" : "add-circle-outline";
            } else if (route.name === "Search") {
              iconName = focused ? "search" : "search-outline";
            } else if (route.name === "Account") {
              iconName = focused ? "person" : "person-outline";
            }

            return (
              <Ionicons name={iconName as any} size={size} color={color} />
            );
          },
          tabBarActiveTintColor: "#6C1748",
          tabBarInactiveTintColor: "#808080",
          tabBarStyle: {
            backgroundColor: "#202020",
            borderTopColor: "#2C2C2C",
            height: Platform.OS === "ios" ? 85 : 65,
            paddingBottom: Platform.OS === "ios" ? 30 : 10,
            paddingTop: 8,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
          headerStyle: {
            backgroundColor: "#202020",
          },
          headerTintColor: "#E0E0E0",
          headerTitleStyle: {
            color: "#E0E0E0",
          },
          tabBarButton: (props) => {
            if (route.name === "Create") {
              return (
                <TouchableOpacity
                  {...(props as any)}
                  onPress={() => setCreateModalVisible(true)}
                />
              );
            }
            return <Pressable {...props} />;
          },
        })}
        screenListeners={{
          tabPress: () => {
            handleVibration();
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Explore" component={ExploreScreen} />
        <Tab.Screen
          name="Create"
          component={View} // Using empty View as placeholder
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleVibration();
              setCreateModalVisible(true);
            },
          }}
        />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>

      <CreateOptionsModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSelect={handleCreateOption}
      />
    </>
  );
};

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      ...stackScreenOptions,
      contentStyle: {
        backgroundColor: "#1A1A1A",
      },
    }}
  >
    <Stack.Screen
      name="MainTabs"
      component={TabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CreateCharacter"
      component={CreateCharacterScreen}
      options={{
        title: "Create Character",
        presentation: "modal",
      }}
    />
    <Stack.Screen
      name="CreateScene"
      component={CreateSceneScreen}
      options={{
        title: "Create Scene",
        presentation: "modal",
      }}
    />
    <Stack.Screen
      name="CreateMod"
      component={CreateModScreen}
      options={{
        title: "Create Mod",
        presentation: "modal",
      }}
    />
    <Stack.Screen
      name="Chat"
      component={GeminiChat}
      options={({ route }) => ({
        title: route.params.brewName,
        headerShown: true,
        presentation: "card",
        animation: "slide_from_right",
        animationDuration: 200,
      })}
    />
    <Stack.Screen
      name="SceneDetail"
      component={SceneDetailScreen}
      options={{ title: "Scene Details" }}
    />
    <Stack.Screen
      name="CharacterDetail"
      component={CharacterDetailScreen}
      options={{ title: "Character Details" }}
    />
    <Stack.Screen
      name="ModDetail"
      component={ModDetailScreen}
      options={{ title: "Mod Details" }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: "Profile" }}
    />
    <Stack.Screen
  name="TagSelection"
  component={TagSelectionScreen}
  options={{
    title: "Select Tags",
    presentation: "modal",
  }}
/>
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={stackScreenOptions}>
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Signup"
      component={SignupScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AppContent = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1A1A1A",
        }}
      >
        <ActivityIndicator size="large" color="#6C1748" />
      </View>
    );
  }

  return session ? (
    <BrewProvider>
      <MainStack />
    </BrewProvider>
  ) : (
    <AuthStack />
  );
};

const App = () => {
  return (
    <NavigationIndependentTree>
      <NavigationContainer theme={navigationTheme}>
        <AuthProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </AuthProvider>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  modalContent: {
    backgroundColor: "#202020",
    borderRadius: 12,
    marginHorizontal: 16,
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
});

export default App;
