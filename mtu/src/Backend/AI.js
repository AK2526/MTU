import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini AI - the client gets the API key from the environment variable `GEMINI_API_KEY`
// But since we're in React, we need to pass it explicitly
const ai = new GoogleGenAI({
  apiKey: process.env.REACT_APP_GEMINI_API_KEY
});

/**
 * Generate text using Gemini AI
 * @param {string} prompt - The text prompt to send to Gemini
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} - The generated response
 */
export const generateText = async (prompt, options = {}) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      ...options
    });
    return response.text;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
};

/**
 * Generate text with streaming response
 * @param {string} prompt - The text prompt to send to Gemini
 * @param {Function} onChunk - Callback function called for each chunk of response
 * @returns {Promise<string>} - The complete generated response
 */
export const generateTextStreaming = async (prompt, onChunk) => {
  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    
    let fullResponse = '';
    for await (const chunk of response.stream) {
      const chunkText = chunk.text || '';
      fullResponse += chunkText;
      if (onChunk) onChunk(chunkText);
    }
    
    return fullResponse;
  } catch (error) {
    console.error('Error generating streaming text:', error);
    throw new Error(`Failed to generate streaming text: ${error.message}`);
  }
};

/**
 * Chat conversation with context
 * @param {Array} messages - Array of message objects {role: 'user'|'model', parts: [{text: '...'}]}
 * @returns {Promise<string>} - The generated response
 */
export const chatWithContext = async (messages) => {
  try {
    // Convert messages to the format expected by the new API
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents
    });
    
    return response.text;
  } catch (error) {
    console.error('Error in chat conversation:', error);
    throw new Error(`Failed to chat: ${error.message}`);
  }
};

/**
 * Analyze and summarize text
 * @param {string} text - Text to analyze
 * @param {string} analysisType - Type of analysis ('summary', 'sentiment', 'keywords', 'tone')
 * @returns {Promise<string>} - The analysis result
 */
export const analyzeText = async (text, analysisType = 'summary') => {
  const prompts = {
    summary: `Please provide a concise summary of the following text:\n\n${text}`,
    sentiment: `Analyze the sentiment of the following text and classify it as positive, negative, or neutral. Provide a brief explanation:\n\n${text}`,
    keywords: `Extract the main keywords and key phrases from the following text:\n\n${text}`,
    tone: `Analyze the tone and writing style of the following text:\n\n${text}`
  };
  
  const prompt = prompts[analysisType] || prompts.summary;
  return await generateText(prompt);
};

/**
 * Generate creative content
 * @param {string} type - Type of content ('story', 'poem', 'essay', 'dialogue')
 * @param {string} topic - Topic or theme
 * @param {Object} options - Additional options (length, style, etc.)
 * @returns {Promise<string>} - The generated creative content
 */
export const generateCreativeContent = async (type, topic, options = {}) => {
  const { length = 'medium', style = 'casual' } = options;
  
  const prompts = {
    story: `Write a ${length} ${style} story about ${topic}.`,
    poem: `Write a ${style} poem about ${topic}.`,
    essay: `Write a ${length} ${style} essay about ${topic}.`,
    dialogue: `Create a ${style} dialogue between two characters discussing ${topic}.`
  };
  
  const prompt = prompts[type] || `Create creative content about ${topic} in a ${style} style.`;
  return await generateText(prompt);
};

/**
 * Answer questions based on context
 * @param {string} question - The question to answer
 * @param {string} context - Additional context or information
 * @returns {Promise<string>} - The answer
 */
export const answerQuestion = async (question, context = '') => {
  const prompt = context 
    ? `Based on the following context, please answer the question:\n\nContext: ${context}\n\nQuestion: ${question}`
    : `Please answer the following question: ${question}`;
  
  return await generateText(prompt);
};

/**
 * Generate code or programming help
 * @param {string} request - Description of what code is needed
 * @param {string} language - Programming language (optional)
 * @returns {Promise<string>} - The generated code or explanation
 */
export const generateCode = async (request, language = '') => {
  const prompt = language 
    ? `Generate ${language} code for the following request: ${request}`
    : `Generate code for the following request: ${request}`;
  
  return await generateText(prompt);
};

/**
 * Translate text to another language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language
 * @param {string} sourceLanguage - Source language (optional)
 * @returns {Promise<string>} - The translated text
 */
export const translateText = async (text, targetLanguage, sourceLanguage = '') => {
  const prompt = sourceLanguage
    ? `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
    : `Translate the following text to ${targetLanguage}:\n\n${text}`;
  
  return await generateText(prompt);
};

/**
 * Check if API key is configured
 * @returns {boolean} - True if API key is available
 */
export const isApiKeyConfigured = () => {
  return !!process.env.REACT_APP_GEMINI_API_KEY;
};

/**
 * Test API connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
export const testConnection = async () => {
  try {
    const response = await generateText("Hello, please respond with 'API connection successful'");
    return response.toLowerCase().includes('successful');
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

// Export default object with all functions
const AIService = {
  generateText,
  generateTextStreaming,
  chatWithContext,
  analyzeText,
  generateCreativeContent,
  answerQuestion,
  generateCode,
  translateText,
  isApiKeyConfigured,
  testConnection
};

export default AIService;