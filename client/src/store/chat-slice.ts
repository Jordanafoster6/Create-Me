import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, ChatMessageSchema, OrchestratorResponse } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { logger } from '@/lib/logger';

/**
 * Represents the state shape for the chat feature
 */
interface ChatState {
  messages: ChatMessage[];
  currentDesignUrl: string | null;
  selectedProduct: {
    id: string;
    name: string;
    variantId: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  currentDesignUrl: null,
  selectedProduct: null,
  isLoading: false,
  error: null
};

/**
 * Async thunk for sending a message to the chat API
 * @param content The message content to send
 * @returns The API response containing both user and assistant messages
 */
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (content: string, { rejectWithValue }) => {
    try {
      const userMessage: ChatMessage = {
        content,
        role: 'user'
      };

      // Validate the message format before sending
      ChatMessageSchema.parse(userMessage);

      const response = await apiRequest('POST', '/api/chat', userMessage);
      const data = await response.json();

      // Validate response format
      const assistantMessage = ChatMessageSchema.parse(data);

      // Log successful message sending
      logger.info('Message sent successfully', { content });

      return {
        userMessage,
        assistantMessage
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      logger.error('Failed to send message', { error: errorMessage, content });
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk for generating a design based on a prompt
 * @param prompt The design prompt to use
 * @returns The URL of the generated design image
 */
export const generateDesign = createAsyncThunk(
  'chat/generateDesign',
  async (prompt: string, { rejectWithValue }) => {
    try {
      const response = await apiRequest('POST', '/api/designs', { prompt });
      const data = await response.json();

      logger.info('Design generated successfully', { prompt });
      return data.imageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate design';
      logger.error('Failed to generate design', { error: errorMessage, prompt });
      return rejectWithValue(errorMessage);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.currentDesignUrl = null;
      state.selectedProduct = null;
      state.error = null;
    },
    setSelectedProduct: (state, action: PayloadAction<{
      id: string;
      name: string;
      variantId: number;
    } | null>) => {
      state.selectedProduct = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Handle sendMessage
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages.push(action.payload.userMessage);
        state.messages.push(action.payload.assistantMessage);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle generateDesign
    builder
      .addCase(generateDesign.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateDesign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDesignUrl = action.payload;
      })
      .addCase(generateDesign.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearMessages, setSelectedProduct, clearError } = chatSlice.actions;
export default chatSlice.reducer;

// Type-safe selectors
export const selectMessages = (state: { chat: ChatState }) => state.chat.messages;
export const selectCurrentDesign = (state: { chat: ChatState }) => state.chat.currentDesignUrl;
export const selectSelectedProduct = (state: { chat: ChatState }) => state.chat.selectedProduct;
export const selectIsLoading = (state: { chat: ChatState }) => state.chat.isLoading;
export const selectError = (state: { chat: ChatState }) => state.chat.error;