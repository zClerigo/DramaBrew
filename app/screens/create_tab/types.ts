import { ParamListBase } from '@react-navigation/native';

export interface Tag {
  id: number;
  name: string;
}

export interface NavigationParams extends ParamListBase {
  TagSelection: {
    selectedTags: Tag[];
    returnScreen: string;
  };
  CreateCharacter: {
    selectedTags?: Tag[];
  };
  [key: string]: undefined | object;
}