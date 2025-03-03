import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import ScenesScreen from './explore_tab/ScenesScreen';
import CharactersScreen from './explore_tab/CharactersScreen';
import BrewScreen from './explore_tab/BrewScreen';
import ModsScreen from './explore_tab/ModsScreen';
import SceneDetailScreen from './explore_tab/SceneDetailScreen';
import CharacterDetailScreen from './explore_tab/CharacterDetailScreen';
import ModDetailScreen from './explore_tab/ModDetailScreen';
import { Platform } from 'react-native';
import { Character } from '../types/character';

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

export type Scene = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  max_characters: number;
};

export type Mod = {
  id: string;
  name: string;
  description: string;
  ticker: string;
};

export type RootStackParamList = {
  ScenesMain: undefined;
  SceneDetail: { scene: Scene };
  CharactersMain: undefined;
  CharacterDetail: { character: Character };
  ModsMain: undefined;
  ModDetail: { mod: Mod };
};

const ScenesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ScenesMain" component={ScenesScreen} options={{ headerShown: false }} />
    <Stack.Screen
      name="SceneDetail"
      component={SceneDetailScreen}
      options={{ title: 'Scene Details' }}
    />
  </Stack.Navigator>
);

const CharactersStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="CharactersMain" component={CharactersScreen} options={{ headerShown: false }} />
    <Stack.Screen
      name="CharacterDetail"
      component={CharacterDetailScreen}
      options={{ title: 'Character Details' }}
    />
  </Stack.Navigator>
);

const ModsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ModsMain" component={ModsScreen} options={{ headerShown: false }} />
    <Stack.Screen
      name="ModDetail"
      component={ModDetailScreen}
      options={{ title: 'Mod Details' }}
    />
  </Stack.Navigator>
);

const ExploreScreen: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: {
          fontSize: 11.375,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'Roboto-Medium',
        },
        tabBarStyle: {
          backgroundColor: '#202020',
          borderBottomWidth: 1,
          borderBottomColor: '#2C2C2C',
        },
        tabBarIndicatorStyle: {
          backgroundColor: '#6C1748'
        },
        tabBarActiveTintColor: '#6C1748',
        tabBarInactiveTintColor: '#808080',
      }}
    >
      <Tab.Screen name="Characters" component={CharactersStack} />
      <Tab.Screen name="Scenes" component={ScenesStack} />
      <Tab.Screen name="Mods" component={ModsStack} />
      <Tab.Screen name="Brew" component={BrewScreen} />
    </Tab.Navigator>
  );
};

export default ExploreScreen;