export type Tag = {
  id: string;
  name: string;
};

export type Character = {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  intro_text: string;
  dialogue_style: string;
  motivations: string;
  background: string;
  personality_traits: string;
  fears: string;
  is_private?: boolean;
  user_id?: string;
  tags: Tag[];
  message_number: number;
};

export type Mod = {
  id: string;
  name: string;
  description: string;
  ticker: string;
  is_private: boolean;
  message_number?: number;
};
