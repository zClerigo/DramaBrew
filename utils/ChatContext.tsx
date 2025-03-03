import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CharacterMessage = {
  character: string;
  text: string;
};

type Message = {
  id?: string;
  text: string;
  user: boolean;
  characterMessages?: CharacterMessage[];
};

type MessageUpdate = {
  [brewId: string]: {
    [messageId: string]: Message;
  };
};

type Conversation = {
  messages: Message[];
  conversationHistory: string;
};

type ChatContextType = {
  conversations: {
    [key: string]: {
      messages: Message[];
      conversationHistory: string;
    };
  };
  addMessage: (brewId: string, message?: Message | []) => void;
  updateMessage: (brewId: string, messageId: string, updatedMessage: Message) => void;
  updateConversationHistory: (brewId: string, history: string) => void;
  clearAndRestartChat: (brewId: string) => void;
  clearAllConversations: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<{ [key: string]: Conversation }>({});
  const [messageUpdates, setMessageUpdates] = useState<MessageUpdate>({});

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const savedConversations = await AsyncStorage.getItem('conversations');
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const saveConversations = async (newConversations: { [key: string]: Conversation }) => {
    try {
      await AsyncStorage.setItem('conversations', JSON.stringify(newConversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  };

  const formatMessageForHistory = (message: Message): string => {
    if (message.user) {
      return `User: ${message.text}\n`;
    } else if (message.characterMessages) {
      return message.characterMessages.map(cm => 
        cm.character === 'Narrator' ? 
        `Narrator: ${cm.text}\n` : 
        `${cm.character}: ${cm.text}\n`
      ).join('');
    }
    return '';
  };

  const addMessage = (conversationId: string, message?: Message | []) => {
    setConversations((prevConversations) => {
      const currentConversation = prevConversations[conversationId] || {
        messages: [],
        conversationHistory: "",
      };
  
      let updatedMessages = currentConversation.messages;
  
      if (message && !Array.isArray(message)) {
        updatedMessages = [...currentConversation.messages, message];
      }
  
      const updatedHistory = message && !Array.isArray(message)
        ? `${currentConversation.conversationHistory}${formatMessageForHistory(message)}`
        : currentConversation.conversationHistory;
  
      const newConversations = {
        ...prevConversations,
        [conversationId]: {
          messages: updatedMessages,
          conversationHistory: updatedHistory,
        },
      };
  
      saveConversations(newConversations);
      return newConversations;
    });
  };

  const updateConversationHistory = (conversationId: string, history: string) => {
    setConversations(prevConversations => {
      const newConversations = {
        ...prevConversations,
        [conversationId]: {
          ...prevConversations[conversationId],
          conversationHistory: history,
        },
      };
      saveConversations(newConversations);
      return newConversations;
    });
  };

  const clearAndRestartChat = (conversationId: string) => {
    setConversations(prevConversations => {
      const newConversations = {
        ...prevConversations,
        [conversationId]: {
          messages: [],
          conversationHistory: '',
        },
      };
      saveConversations(newConversations);
      return newConversations;
    });
  };

  const clearAllConversations = async () => {
    try {
      await AsyncStorage.removeItem('conversations');
      setConversations({});
    } catch (error) {
      console.error('Error clearing conversations:', error);
    }
  };

  const updateMessage = (brewId: string, messageId: string, updatedMessage: Message) => {
    setConversations(prev => {
      const brewConversation = prev[brewId] || { messages: [], conversationHistory: '' };
      const updatedMessages = brewConversation.messages.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      );

      return {
        ...prev,
        [brewId]: {
          ...brewConversation,
          messages: updatedMessages
        }
      };
    });
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      addMessage,
      updateMessage,
      updateConversationHistory,
      clearAndRestartChat,
      clearAllConversations,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export { CharacterMessage, Message, Conversation };