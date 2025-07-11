import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import CustomAIService from './Backend/custom';
import DatabaseService from './Backend/database';
import AIService from './Backend/AI';

// Cache for storing sentence-level synonyms
const SYNONYMS_CACHE = new Map();

// Simplified function to get synonyms for a sentence
const getSynonymsForSentence = async (sentence) => {
  const cacheKey = sentence.toLowerCase().trim();
  
  // Check cache first
  if (SYNONYMS_CACHE.has(cacheKey)) {
    return SYNONYMS_CACHE.get(cacheKey);
  }

  try {
    const synonymsObject = await CustomAIService.getSynonymsForSentence(sentence);
    
    // Cache valid results
    if (synonymsObject && typeof synonymsObject === 'object' && Object.keys(synonymsObject).length > 0) {
      SYNONYMS_CACHE.set(cacheKey, synonymsObject);
      return synonymsObject;
    }
    return {};
  } catch (error) {
    console.error('Error getting synonyms:', error);
    return {};
  }
};

// Function to get AI-improved sentence for children
const getImprovedSentence = async (originalSentence) => {
  try {
    const improvementPrompt = `You are helping children aged 8-12 improve their writing. Take this sentence and make it better by:
1. Using more descriptive words
2. Making it more engaging
3. Improving grammar if needed
4. Keeping it age-appropriate and not too complex

Original sentence: "${originalSentence}"

Return ONLY the improved sentence, no explanation or extra text.`;

    const improvedSentence = await AIService.generateText(improvementPrompt);
    return improvedSentence?.trim() || originalSentence;
  } catch (error) {
    console.error('Error getting improved sentence:', error);
    return originalSentence;
  }
};

// Component to render text with synonym tooltips (only for user entries)
const SynonymText = ({ text, colorClass, enableSynonyms = false }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [synonyms, setSynonyms] = useState([]);
  const [sentenceSynonyms, setSentenceSynonyms] = useState({});
  const isLoadingRef = useRef(false);

  // Load synonyms when component mounts or text changes
  useEffect(() => {
    if (enableSynonyms && text && text.trim() && !isLoadingRef.current) {
      const cacheKey = text.toLowerCase().trim();
      
      if (SYNONYMS_CACHE.has(cacheKey)) {
        setSentenceSynonyms(SYNONYMS_CACHE.get(cacheKey));
      } else {
        loadSentenceSynonyms();
      }
    }
  }, [text, enableSynonyms]);

  const loadSentenceSynonyms = async () => {
    if (!text?.trim() || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      const synonymsData = await getSynonymsForSentence(text);
      if (synonymsData && Object.keys(synonymsData).length > 0) {
        setSentenceSynonyms(synonymsData);
      }
    } catch (error) {
      console.error('Error loading synonyms:', error);
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleWordHover = (e, word) => {
    if (!enableSynonyms) return;
    
    const cleanWord = word.toLowerCase().replace(/[.,!?;:"()]/g, '');
    
    if (sentenceSynonyms[cleanWord]) {
      const wordSynonyms = sentenceSynonyms[cleanWord];
      setHoveredWord(cleanWord);
      setSynonyms(wordSynonyms);
      
      const rect = e.target.getBoundingClientRect();
      const parentRect = e.target.closest('.entry-content').getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Calculate initial position
      let x = rect.left + rect.width / 2 - parentRect.left;
      const y = rect.top - parentRect.top - 10; // Further reduced offset from -12 to -10
      
      // Estimate tooltip width using the actual synonyms for this word
      const synonymText = wordSynonyms.join(' • ');
      const tooltipEstimatedWidth = Math.max(140, synonymText.length * 6.5 + 70); // Further reduced
      
      // Adjust x position to prevent going off-screen
      const tooltipLeftEdge = rect.left - tooltipEstimatedWidth / 2;
      const tooltipRightEdge = rect.left + tooltipEstimatedWidth / 2;
      
      if (tooltipLeftEdge < 10) {
        // Too far left, align to left edge with padding
        x = 10 - parentRect.left + tooltipEstimatedWidth / 2;
      } else if (tooltipRightEdge > viewportWidth - 10) {
        // Too far right, align to right edge with padding
        x = (viewportWidth - 10) - parentRect.left - tooltipEstimatedWidth / 2;
      }
      
      setTooltipPosition({ x, y });
    }
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
    setSynonyms([]);
  };

  const renderTextWithSynonyms = (text) => {
    // Split text into sentences
    const sentences = text.split(/([.!?]+)/);
    
    return sentences.map((sentence, sentenceIndex) => {
      if (!sentence.trim() || /^[.!?]+$/.test(sentence)) {
        return <span key={sentenceIndex}>{sentence}</span>;
      }
      
      const words = sentence.split(/(\s+)/);
      
      return (
        <span key={sentenceIndex}>
          {words.map((word, index) => {
            const cleanWord = word.replace(/[.,!?;:"()]/g, '').toLowerCase();
            
            // Check if this word has synonyms available
            if (enableSynonyms && sentenceSynonyms[cleanWord] && word.trim()) {
              return (
                <span key={index} className="synonym-wrapper">
                  <span
                    className="synonym-word"
                    onMouseEnter={(e) => handleWordHover(e, word)}
                    onMouseLeave={handleWordLeave}
                  >
                    {word}
                  </span>
                </span>
              );
            }
            
            return <span key={index}>{word}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className={`entry-content ${colorClass}`}>
      {text.split('\n').map((line, lineIndex) => (
        <div key={lineIndex} className={lineIndex > 0 ? 'line-spacing' : ''}>
          {renderTextWithSynonyms(line)}
        </div>
      ))}
      
      {/* Synonym tooltip */}
      {hoveredWord && enableSynonyms && (
        <div 
          className="synonym-tooltip"
          style={{
            position: 'absolute',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '4px 8px',
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontWeight: 'bold', color: '#ffd700' }}>Try:</span>
            <span>
              {synonyms.length > 0 ? (
                synonyms.map((synonym, index) => (
                  <span key={index}>
                    {synonym}
                    {index < synonyms.length - 1 ? ' • ' : ''}
                  </span>
                ))
              ) : (
                'No suggestions'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Component to show sentence improvement with highlighted changes
const SentenceImprovement = ({ originalSentence, improvedSentence, isGenerating }) => {
  // Simple word-level diff to highlight changes
  const highlightDifferences = (original, improved) => {
    if (!improved || improved === original) {
      return <span>{improved}</span>;
    }

    const originalWords = original.toLowerCase().split(/\s+/);
    const improvedWords = improved.split(/\s+/);
    
    return improvedWords.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:"()]/g, '');
      const isNewOrChanged = !originalWords.includes(cleanWord);
      
      return (
        <span key={index}>
          {isNewOrChanged ? (
            <strong style={{ color: '#16a34a', fontWeight: 'bold' }}>{word}</strong>
          ) : (
            word
          )}
          {index < improvedWords.length - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  if (!originalSentence) {
    return (
      <div style={{
        backgroundColor: '#fef7e0',
        border: '2px solid #fde68a',
        borderRadius: '12px',
        padding: '20px',
        margin: '0 auto',
        marginTop: '20px',
        textAlign: 'center',
        color: '#78350f',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: 0, fontStyle: 'italic', fontFamily: 'Helvetica, serif' }}>
          ✨ Write your first sentence above to see corrections!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#fef7e0',
      border: '2px solid #fde68a',
      borderRadius: '12px',
      padding: '16px',
      margin: '0 auto',
      marginTop: '20px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      fontFamily: 'Helvetica, serif',
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 20px, #f3e8b6 20px, #f3e8b6 21px)',
      backgroundSize: '100% 21px'
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        color: '#78350f', 
        fontSize: '16px',
        textAlign: 'center',
        fontFamily: 'Helvetica, serif',
        fontWeight: 'bold'
      }}>
        📝 Sentence Corrector
      </h3>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          color: '#78350f', 
          marginBottom: '6px',
          fontFamily: 'Helvetica, serif'
        }}>
          Your sentence:
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '8px',
          borderRadius: '6px',
          border: '2px solid #d4a574',
          fontStyle: 'italic',
          color: '#78350f',
          fontFamily: 'Helvetica, serif',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '13px'
        }}>
          "{originalSentence}"
        </div>
      </div>

      <div>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          color: '#78350f', 
          marginBottom: '6px',
          fontFamily: 'Helvetica, serif'
        }}>
          AI's corrected version:
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '8px',
          borderRadius: '6px',
          border: '2px solid #d4a574',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'Helvetica, serif',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '13px'
        }}>
          {isGenerating ? (
            <div style={{ color: '#a16207', fontStyle: 'italic' }}>
              🤔 Thinking of corrections...
            </div>
          ) : improvedSentence ? (
            <div style={{ color: '#78350f' }}>
              "{highlightDifferences(originalSentence, improvedSentence)}"
            </div>
          ) : (
            <div style={{ color: '#a16207', fontStyle: 'italic' }}>
              Generating correction...
            </div>
          )}
        </div>
      </div>
      
      {improvedSentence && improvedSentence !== originalSentence && !isGenerating && (
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#a16207',
          textAlign: 'center',
          fontFamily: 'Helvetica, serif'
        }}>
          💡 <strong style={{ color: '#16a34a' }}>Green words</strong> are new or improved!
        </div>
      )}
    </div>
  );
};

const NotebookComponent = ({
  title,
  entries,
  notebookRef,
  showInput = false,
  alternateColors = false,
  currentInput,
  setCurrentInput,
  handleKeyDown,
  handleSubmit,
  inputRef,
  isLoading = false
}) => (
  <div className="notebook-container">
    <h1 className="notebook-title">{title}</h1>

    <div ref={notebookRef} className="notebook">
      {/* Notebook Header */}
      <div className="notebook-header">
        <div className="notebook-header-text">{title}</div>
      </div>

      {/* Input Section - Only for left notebook */}
      {showInput && (
        <div className="input-section">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "AI is thinking..." : "Write your thoughts here... (Press Enter to add entry)"}
              className="text-input"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!currentInput.trim() || isLoading}
              className="add-button"
            >
              {isLoading ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Entries Container */}
      <div className="entries-container">
        {entries.length === 0 && !isLoading && (
          <div className="empty-message">
            {showInput
              ? "Start writing your first entry above..."
              : "Waiting for responses..."}
          </div>
        )}

        {entries.map((entry, index) => (
          <div key={entry.id} className="entry fade-in">
            <div className="entry-timestamp">
              {(() => {
                try {
                  const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
                  if (isNaN(timestamp.getTime())) {
                    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }
                  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (error) {
                  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              })()}
            </div>
            <SynonymText 
              text={entry.text}
              enableSynonyms={showInput} // Only enable synonyms for the input notebook (left side)
              colorClass={
                alternateColors
                  ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                  : entry.colorIndex !== undefined
                    ? entry.colorIndex % 2 === 0 ? 'yellow-entry' : 'blue-entry'
                    : 'default-entry'
              }
            />
          </div>
        ))}

        {/* Loading indicator for AI responses */}
        {isLoading && !showInput && (
          <div className="entry fade-in loading-entry">
            <div className="entry-timestamp">
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="entry-content loading-content">
              <div className="ai-thinking">
                <span>🤔</span>
                <span>AI Buddy is thinking...</span>
                <div className="thinking-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Notebook Stats */}
    <div className="notebook-stats">
      {entries.length} {entries.length === 1 ? 'entry' : 'entries'} written
    </div>
  </div>
);

const App = () => {
  const [leftEntries, setLeftEntries] = useState([]);
  const [rightEntries, setRightEntries] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showNotebooksList, setShowNotebooksList] = useState(false);
  const [availableNotebooks, setAvailableNotebooks] = useState([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [lastUserInput, setLastUserInput] = useState('');
  const [improvedSentence, setImprovedSentence] = useState('');
  const [isGeneratingImprovement, setIsGeneratingImprovement] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const leftNotebookRef = useRef(null);
  const rightNotebookRef = useRef(null);
  const inputRef = useRef(null);
  const sessionCreatedRef = useRef(false); // Track if session has been created
  const saveTimeoutRef = useRef(null); // Track save timeout

  // Enhanced save function that saves current vocabulary
  const saveCurrentSessionWithRetry = async (retryCount = 0, maxRetries = 2, generateSmartTitle = false) => {
    if (!currentSessionId) {
      console.log("No session ID to save to - no entries have been created yet");
      return;
    }

    // Prevent saving sessions with no entries
    if (leftEntries.length === 0 && rightEntries.length === 0) {
      console.log("⚠️ Cannot save session with 0 entries - skipping save");
      return;
    }

    // Set loading state
    setIsSaving(true);
    setSaveConfirmed(false);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      // Convert synonyms cache to a plain object for storage
      const vocabularyData = {};
      for (const [key, value] of SYNONYMS_CACHE.entries()) {
        vocabularyData[key] = value;
      }

      const vocabularyCount = Object.keys(vocabularyData).length;
      console.log(`📚 Saving ${vocabularyCount} vocabulary entries from cache`);

      // Generate smart title from conversation history only if explicitly requested
      const generateTitle = async () => {
        if (!generateSmartTitle) {
          // For automatic saves, keep the existing title format
          return `Journal Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        }
        
        if (conversationHistory.length === 0) {
          return `Journal Session ${new Date().toLocaleDateString()}`;
        }
        
        try {
          // Use AI to generate a smart title based on chat history
          console.log("🤖 Generating AI title from conversation history...");
          const titlePrompt = `Based on this conversation history, generate a short, meaningful title (3-6 words max) that captures the main topic or theme. Return ONLY the title, no quotes, no extra text, no explanation.

Conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.message || msg.content || ''}`).join('\n')}

Title:`;
          console.log("📝 Title prompt:", titlePrompt);
          console.log("📚 Conversation history:", conversationHistory);
          const aiTitle = await AIService.generateText(titlePrompt);
          
          if (aiTitle && aiTitle.trim()) {
            // Clean up the AI response and add date
            const cleanTitle = aiTitle.trim()
              .replace(/^["']|["']$/g, '') // Remove quotes from start/end
              .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
              .replace(/[.!?]+$/, ''); // Remove trailing punctuation
            
            if (cleanTitle && cleanTitle.length > 0) {
              return `${cleanTitle} - ${new Date().toLocaleDateString()}`;
            }
          }
        } catch (error) {
          console.error("Error generating AI title:", error);
        }
        
        // Fallback to first message if AI fails
        const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
        if (firstUserMessage && (firstUserMessage.message || firstUserMessage.content) && typeof (firstUserMessage.message || firstUserMessage.content) === 'string') {
          const messageText = firstUserMessage.message || firstUserMessage.content;
          const words = messageText.split(' ').slice(0, 5).join(' ');
          return `${words}... - ${new Date().toLocaleDateString()}`;
        }
        
        return `Journal Session ${new Date().toLocaleDateString()}`;
      };

      const sessionData = {
        title: await generateTitle(),
        leftEntries: leftEntries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
        })),
        rightEntries: rightEntries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
        })),
        conversationHistory: conversationHistory,
        vocabularyData: vocabularyData, // Include all cached vocabulary
        lastUpdated: new Date().toISOString()
      };

      await DatabaseService.updateNotebook(currentSessionId, sessionData);
      console.log("💾 Session saved successfully:", currentSessionId);
      console.log(`📚 Saved ${vocabularyCount} vocabulary entries`);
      console.log(`📝 Title: "${sessionData.title}"`);
      
      // Show confirmation
      setSaveConfirmed(true);
      setTimeout(() => setSaveConfirmed(false), 2000); // Hide confirmation after 2 seconds
    } catch (error) {
      console.error("Error saving session:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load all available notebooks from Firebase
  const loadAvailableNotebooks = async () => {
    setIsLoadingNotebooks(true);
    try {
      const notebooks = await DatabaseService.getAllNotebooks();
      console.log("📚 Loaded notebooks:", notebooks);
      setAvailableNotebooks(notebooks);
      setShowNotebooksList(true);
    } catch (error) {
      console.error("Error loading notebooks:", error);
      alert("Failed to load notebooks. Please try again.");
    } finally {
      setIsLoadingNotebooks(false);
    }
  };

  // Load a specific session and replace current content
  const loadSession = async (sessionId) => {
    setIsLoadingSession(true);
    try {
      console.log("🔄 Loading session:", sessionId);
      
      // First, save current session if it has content
      if (leftEntries.length > 0 || rightEntries.length > 0) {
        console.log("💾 Saving current session before switching with AI title generation...");
        await saveCurrentSessionWithRetry(0, 2, true); // Generate smart title when switching sessions
      }

      // Load the selected session
      const sessionData = await DatabaseService.getNotebook(sessionId);
      console.log("📖 Loaded session data:", sessionData);

      if (sessionData) {
        // Update all state with loaded data
        // Convert timestamps back to Date objects for entries with better error handling
        const leftEntriesWithDates = (sessionData.leftEntries || []).map(entry => {
          let timestamp = new Date();
          try {
            if (entry.timestamp) {
              const parsedDate = new Date(entry.timestamp);
              if (!isNaN(parsedDate.getTime())) {
                timestamp = parsedDate;
              }
            }
          } catch (error) {
            console.warn("Invalid timestamp for entry:", entry.timestamp);
          }
          return {
            ...entry,
            timestamp
          };
        });
        
        const rightEntriesWithDates = (sessionData.rightEntries || []).map(entry => {
          let timestamp = new Date();
          try {
            if (entry.timestamp) {
              const parsedDate = new Date(entry.timestamp);
              if (!isNaN(parsedDate.getTime())) {
                timestamp = parsedDate;
              }
            }
          } catch (error) {
            console.warn("Invalid timestamp for entry:", entry.timestamp);
          }
          return {
            ...entry,
            timestamp
          };
        });

        setLeftEntries(leftEntriesWithDates);
        setRightEntries(rightEntriesWithDates);
        setConversationHistory(sessionData.conversationHistory || []);
        setCurrentSessionId(sessionId);
        
        // Clear sentence improvement when loading new session
        setLastUserInput('');
        setImprovedSentence('');
        setIsGeneratingImprovement(false);

        // Load vocabulary data back into cache
        if (sessionData.vocabularyData) {
          SYNONYMS_CACHE.clear(); // Clear existing cache
          for (const [key, value] of Object.entries(sessionData.vocabularyData)) {
            SYNONYMS_CACHE.set(key, value);
          }
          console.log(`📚 Restored ${Object.keys(sessionData.vocabularyData).length} vocabulary entries to cache`);
        }

        console.log("✅ Session loaded successfully");
        setShowNotebooksList(false);
      } else {
        alert("Failed to load session data");
      }
    } catch (error) {
      console.error("Error loading session:", error);
      alert("Failed to load session. Please try again.");
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Delete a specific notebook
  const deleteNotebook = async (notebookId, notebookTitle) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${notebookTitle}"? This action cannot be undone.`);
    
    if (confirmDelete) {
      try {
        console.log("🗑️ Deleting notebook:", notebookId);
        await DatabaseService.deleteNotebook(notebookId);
        
        // If we're deleting the current session, clear the current state
        if (notebookId === currentSessionId) {
          setLeftEntries([]);
          setRightEntries([]);
          setConversationHistory([]);
          setCurrentSessionId(null);
          SYNONYMS_CACHE.clear();
        }
        
        // Refresh the notebooks list
        const updatedNotebooks = await DatabaseService.getAllNotebooks();
        setAvailableNotebooks(updatedNotebooks);
        
        console.log("✅ Notebook deleted successfully");
      } catch (error) {
        console.error("Error deleting notebook:", error);
        alert("Failed to delete notebook. Please try again.");
      }
    }
  };

  // Create a new session only when needed (first entry)
  const createNewSession = async () => {
    // Prevent creating multiple sessions (React StrictMode runs useEffect twice)
    if (sessionCreatedRef.current || currentSessionId) {
      console.log("Session already exists, skipping creation");
      return currentSessionId;
    }
    
    sessionCreatedRef.current = true;
    
    try {
      const sessionData = {
        title: `Journal Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        leftEntries: [],
        rightEntries: [],
        conversationHistory: []
      };
      
      const sessionId = await DatabaseService.saveNotebookSession(sessionData);
      setCurrentSessionId(sessionId);
      console.log("📝 New session created:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("Error creating new session:", error);
      sessionCreatedRef.current = false; // Reset on error
      return null;
    }
  };

  // Create a new session manually (for the "New Session" button)
  const createNewSessionManually = async () => {
    try {
      // First, save current session if it has content
      if (leftEntries.length > 0 || rightEntries.length > 0) {
        console.log("💾 Saving current session before creating new one with AI title generation...");
        await saveCurrentSessionWithRetry(0, 2, true); // Generate smart title when creating new session
        console.log("✅ Current session saved, now creating new session...");
      }

      // Clear current state
      setLeftEntries([]);
      setRightEntries([]);
      setConversationHistory([]);
      setCurrentSessionId(null);
      SYNONYMS_CACHE.clear();
      
      // Clear sentence improvement
      setLastUserInput('');
      setImprovedSentence('');
      setIsGeneratingImprovement(false);
      
      // Reset session creation ref to allow new session creation
      sessionCreatedRef.current = false;
      
      console.log("🆕 New session ready - will be created on first entry");
      
      // Focus the input for immediate use
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("Error creating new session:", error);
      alert("Failed to create new session. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (currentInput.trim() && !isLoading) {
      // Create session if it doesn't exist yet (first entry)
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createNewSession();
        if (!sessionId) {
          console.error("Failed to create session, cannot save entry");
          return;
        }
      }

      const userMessage = currentInput.trim();
      
      // Store the last user input and start generating improvement
      setLastUserInput(userMessage);
      setIsGeneratingImprovement(true);
      
      // Generate sentence improvement in the background
      getImprovedSentence(userMessage).then((improved) => {
        setImprovedSentence(improved);
        setIsGeneratingImprovement(false);
      }).catch((error) => {
        console.error('Error generating sentence improvement:', error);
        setImprovedSentence('');
        setIsGeneratingImprovement(false);
      });

      const newLeftEntry = {
        id: Date.now(),
        text: userMessage,
        timestamp: new Date(),
        colorIndex: leftEntries.length
      };
      setLeftEntries(prev => [...prev, newLeftEntry]);
      setCurrentInput('');
      setIsLoading(true);

      try {
        // Use the AI chat function to get a response
        const aiResult = await CustomAIService.chatWithChild(conversationHistory, userMessage);
        
        // Update conversation history
        setConversationHistory(aiResult.updatedHistory);
        console.log("💬 Updated conversation history:", aiResult.updatedHistory);
        
        // Add AI response to right notebook
        const newRightEntry = {
          id: Date.now() + 1,
          text: aiResult.response,
          timestamp: new Date(),
          colorIndex: newLeftEntry.colorIndex
        };
        setRightEntries(prev => [...prev, newRightEntry]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        // Fallback response in case of error
        const errorEntry = {
          id: Date.now() + 1,
          text: "Sorry, I'm having trouble thinking right now. Can you try asking me something else?",
          timestamp: new Date(),
          colorIndex: newLeftEntry.colorIndex
        };
        setRightEntries(prev => [...prev, errorEntry]);
      } finally {
        setIsLoading(false);
        
        // Ensure input stays focused after submitting
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (leftNotebookRef.current) {
      leftNotebookRef.current.scrollTop = leftNotebookRef.current.scrollHeight;
    }
  }, [leftEntries]);

  useEffect(() => {
    if (rightNotebookRef.current) {
      rightNotebookRef.current.scrollTop = rightNotebookRef.current.scrollHeight;
    }
  }, [rightEntries]);

  // Focus input on component mount (but don't create session until first entry)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []); // Empty dependency array ensures this runs only once

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      {/* Header with navigation */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button
          onClick={loadAvailableNotebooks}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
        >
          📚 My Journals
        </button>
        <button
          onClick={createNewSessionManually}
          style={{
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          }}
        >
          ✨ New Session
        </button>
        <button
          onClick={() => saveCurrentSessionWithRetry(0, 2, true)}
          disabled={isSaving}
          style={{
            background: saveConfirmed 
              ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' 
              : isSaving 
                ? 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)'
                : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '25px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isSaving ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }
          }}
        >
          {isSaving ? (
            <>
              <span style={{ 
                display: 'inline-block', 
                animation: 'spin 1s linear infinite',
                fontSize: '12px'
              }}>⟳</span>
              Saving...
            </>
          ) : saveConfirmed ? (
            <>
              ✅ Saved!
            </>
          ) : (
            <>
              💾 Save Session
            </>
          )}
        </button>
      </div>

      <div className="notebooks-container" style={{ marginTop: '40px' }}>
        <NotebookComponent
          title="My Journal"
          entries={leftEntries}
          notebookRef={leftNotebookRef}
          showInput={true}
          alternateColors={true}
          currentInput={currentInput}
          setCurrentInput={setCurrentInput}
          handleKeyDown={handleKeyDown}
          handleSubmit={handleSubmit}
          inputRef={inputRef}
          isLoading={isLoading}
        />

        <NotebookComponent
          title="AI Buddy"
          entries={rightEntries}
          notebookRef={rightNotebookRef}
          showInput={false}
          alternateColors={false}
          isLoading={isLoading}
        />
      </div>

      {/* Sentence Improvement Section */}
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 16px' }}>
        <SentenceImprovement 
          originalSentence={lastUserInput}
          improvedSentence={improvedSentence}
          isGenerating={isGeneratingImprovement}
        />
      </div>

      {/* Notebooks List Modal */}
      {showNotebooksList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            {/* Loading overlay for session switching */}
            {isLoadingSession && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '12px',
                zIndex: 10
              }}>
                <div style={{
                  fontSize: '24px',
                  marginBottom: '12px',
                  animation: 'spin 1s linear infinite'
                }}>
                  ⟳
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '4px'
                }}>
                  Switching Journal...
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  💾 Saving current session<br />
                  📖 Loading selected journal
                </div>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #eee',
              paddingBottom: '16px'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>📚 Your Notebooks</h2>
              <button
                onClick={() => setShowNotebooksList(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {isLoadingNotebooks ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div>🔄 Loading notebooks...</div>
              </div>
            ) : availableNotebooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div>📖 No saved notebooks found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Start writing entries to create your first notebook!
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                  Click on any notebook to load it:
                </div>
                {availableNotebooks.map((notebook, index) => (
                  <div
                    key={notebook.id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #eee',
                      marginBottom: '12px',
                      transition: 'all 0.2s ease',
                      backgroundColor: currentSessionId === notebook.id ? '#e3f2fd' : 'white'
                    }}
                  >
                    <div 
                      onClick={() => !isLoadingSession && loadSession(notebook.id)}
                      style={{
                        cursor: isLoadingSession ? 'not-allowed' : 'pointer',
                        flex: 1,
                        opacity: isLoadingSession ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (currentSessionId !== notebook.id) {
                          e.target.closest('div[style*="padding: 16px"]').style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentSessionId !== notebook.id) {
                          e.target.closest('div[style*="padding: 16px"]').style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div style={{
                        fontWeight: 'bold',
                        color: '#333',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {currentSessionId === notebook.id && <span style={{ color: '#2196F3' }}>▶</span>}
                          {notebook.title || `Notebook ${index + 1}`}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotebook(notebook.id, notebook.title || `Notebook ${index + 1}`);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        {notebook.lastUpdated ? 
                          `Last updated: ${new Date(notebook.lastUpdated).toLocaleDateString()} ${new Date(notebook.lastUpdated).toLocaleTimeString()}` 
                          : 'No update time'
                        }
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {(notebook.leftEntries?.length || 0)} entries • {Object.keys(notebook.vocabularyData || {}).length} vocabulary words
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
