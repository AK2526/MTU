import AIService from './AI.js';

/**
 * Enhances a child's sentence by replacing simple words with slightly more advanced vocabulary
 * @param {string} childSentence - The sentence written by the child
 * @returns {Promise<string>} - The enhanced sentence with improved vocabulary
 */
export const enhanceVocabulary = async (childSentence) => {
  try {
    const prompt = `
You are a helpful tutor working with elementary school children. 
A child wrote this sentence: "${childSentence}"

Please rewrite this sentence by replacing some simple words with slightly more advanced but age-appropriate vocabulary. 
Keep the same meaning and make sure the new words are suitable for children aged 8-12.
Don't make it too complex - just help them learn 2-3 new words maximum.
Only return the improved sentence, nothing else.

Example:
Child: "The dog was very happy and ran fast."
Enhanced: "The dog was delighted and sprinted quickly."
`;

    const enhancedSentence = await AIService.generateText(prompt);
    return enhancedSentence.trim();
  } catch (error) {
    console.error('Error enhancing vocabulary:', error);
    throw new Error('Failed to enhance vocabulary. Please try again.');
  }
};

/**
 * Chat function that maintains conversation history and responds appropriately to children
 * @param {Array} conversationHistory - Array of previous messages [{role: 'user'|'assistant', message: 'text'}]
 * @param {string} childMessage - The current message from the child
 * @returns {Promise<{response: string, updatedHistory: Array}>} - AI response and updated conversation history
 */
export const chatWithChild = async (conversationHistory = [], childMessage) => {
  try {
    // Add the child's message to the conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', message: childMessage }
    ];

    // Create a context-aware prompt for child-friendly responses
    const conversationContext = updatedHistory
      .map(msg => `${msg.role === 'user' ? 'Child' : 'Assistant'}: ${msg.message}`)
      .join('\n');

    const prompt = `
You are a friendly, patient, and encouraging AI tutor talking with a child aged 8-12. 
Your responses should be:
- Warm and encouraging
- Easy to understand
- Educational when appropriate
- Safe and positive
- Ask follow-up questions to keep them engaged
- Help with homework or learning when needed
- Use simple language but introduce new concepts gently

Here's the conversation so far:
${conversationContext}

Please respond to the child's latest message in a helpful, friendly way. Keep your response under 3 sentences and make it engaging for a young learner.
`;

    const aiResponse = await AIService.generateText(prompt);
    
    // Add the AI response to the conversation history
    const finalHistory = [
      ...updatedHistory,
      { role: 'assistant', message: aiResponse.trim() }
    ];

    return {
      response: aiResponse.trim(),
      updatedHistory: finalHistory
    };
  } catch (error) {
    console.error('Error in child chat:', error);
    throw new Error('Sorry, I had trouble understanding. Can you try asking again?');
  }
};

/**
 * Helper function to get vocabulary suggestions for a specific word
 * @param {string} word - The word to find alternatives for
 * @param {string} context - The sentence context where the word appears
 * @returns {Promise<Array>} - Array of suggested alternative words
 */
export const getVocabularySuggestions = async (word, context) => {
  try {
    const prompt = `
Given the word "${word}" used in this context: "${context}"

Suggest 3-5 alternative words that:
1. Are slightly more advanced but still appropriate for children aged 8-12
2. Have the same meaning as the original word
3. Fit grammatically in the sentence

Return only the alternative words as a simple comma-separated list.
`;

    const suggestions = await AIService.generateText(prompt);
    return suggestions.trim().split(',').map(word => word.trim());
  } catch (error) {
    console.error('Error getting vocabulary suggestions:', error);
    return [];
  }
};

/**
 * Helper function to explain the meaning of a word in child-friendly terms
 * @param {string} word - The word to explain
 * @returns {Promise<string>} - Chi.ld-friendly explanation of the word
 */
export const explainWord = async (word) => {
  try {
    const prompt = `
Explain the word "${word}" in a simple, fun way that an 8-12 year old child would understand. 
Include:
1. What it means
2. An example of how to use it...........
3. Maybe a fun fact or memory trick.

Keep it short and engaging - no more than 2-3 sentences.
`;

    const explanation = await AIService.generateText(prompt);
    return explanation.trim();
  } catch (error) {
    console.error('Error explaining word:', error);
    return `"${word}" is a interesting word! Let me think of a good way to explain it...`;
  }
};

// Export all functions as default object
const CustomAIService = {
  enhanceVocabulary,
  chatWithChild,
  getVocabularySuggestions,
  explainWord
};

export default CustomAIService;