import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  serverTimestamp 
} from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://support.google.com/firebase/answer/7015592
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Validate Firebase configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration keys:', missingKeys);
  console.error('Please check your .env file and ensure all REACT_APP_FIREBASE_* variables are set');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Notebooks collection reference
const notebooksCollection = collection(db, "notebooks");

// Database service functions for notebooks
class DatabaseService {
  
  // Create a new notebook
  static async createNotebook(notebookData) {
    try {
      const docRef = await addDoc(notebooksCollection, {
        ...notebookData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("Notebook created with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating notebook: ", error);
      throw error;
    }
  }

  // Get all notebooks
  static async getAllNotebooks() {
    try {
      const q = query(notebooksCollection, orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const notebooks = [];
      
      querySnapshot.forEach((doc) => {
        notebooks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notebooks;
    } catch (error) {
      console.error("Error getting notebooks: ", error);
      throw error;
    }
  }

  // Get a specific notebook by ID
  static async getNotebook(notebookId) {
    try {
      const docRef = doc(db, "notebooks", notebookId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        console.log("No such notebook!");
        return null;
      }
    } catch (error) {
      console.error("Error getting notebook: ", error);
      throw error;
    }
  }

  // Update a notebook
  static async updateNotebook(notebookId, updateData) {
    try {
      const docRef = doc(db, "notebooks", notebookId);
      await updateDoc(docRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      console.log("Notebook updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating notebook: ", error);
      throw error;
    }
  }

  // Delete a notebook
  static async deleteNotebook(notebookId) {
    try {
      const docRef = doc(db, "notebooks", notebookId);
      await deleteDoc(docRef);
      console.log("Notebook deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting notebook: ", error);
      throw error;
    }
  }

  // Search notebooks by title or content
  static async searchNotebooks(searchTerm) {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic search by title. For better search, consider using Algolia or similar
      const q = query(
        notebooksCollection, 
        where("title", ">=", searchTerm),
        where("title", "<=", searchTerm + '\uf8ff'),
        orderBy("title")
      );
      
      const querySnapshot = await getDocs(q);
      const notebooks = [];
      
      querySnapshot.forEach((doc) => {
        notebooks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notebooks;
    } catch (error) {
      console.error("Error searching notebooks: ", error);
      throw error;
    }
  }

  // Save notebook entries (for the dual notebook app)
  static async saveNotebookSession(sessionData) {
    try {
      const notebookData = {
        title: sessionData.title || `Session ${new Date().toLocaleDateString()}`,
        leftEntries: sessionData.leftEntries || [],
        rightEntries: sessionData.rightEntries || [],
        conversationHistory: sessionData.conversationHistory || [],
        type: "dual-notebook-session"
      };
      
      return await this.createNotebook(notebookData);
    } catch (error) {
      console.error("Error saving notebook session: ", error);
      throw error;
    }
  }

  // Load a specific notebook session
  static async loadNotebookSession(sessionId) {
    try {
      const notebook = await this.getNotebook(sessionId);
      if (notebook && notebook.type === "dual-notebook-session") {
        return {
          leftEntries: notebook.leftEntries || [],
          rightEntries: notebook.rightEntries || [],
          conversationHistory: notebook.conversationHistory || [],
          title: notebook.title
        };
      }
      return null;
    } catch (error) {
      console.error("Error loading notebook session: ", error);
      throw error;
    }
  }

  // Get all saved sessions
  static async getAllSessions() {
    try {
      // Temporary fix: Get all notebooks and filter locally to avoid index requirement
      const querySnapshot = await getDocs(notebooksCollection);
      const sessions = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "dual-notebook-session") {
          sessions.push({
            id: doc.id,
            title: data.title,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            entryCount: (data.leftEntries?.length || 0) + (data.rightEntries?.length || 0)
          });
        }
      });
      
      // Sort by updatedAt locally
      sessions.sort((a, b) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return b.updatedAt.toMillis() - a.updatedAt.toMillis();
      });
      
      return sessions;
    } catch (error) {
      console.error("Error getting sessions: ", error);
      throw error;
    }
  }

  // Debug function to test Firebase connection
  static async debugFirebaseConnection() {
    console.log("🔍 Debug: Testing Firebase connection...");
    console.log("Firebase Config Check:", {
      hasApiKey: !!process.env.REACT_APP_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
    });

    try {
      // First, try to get all documents in the notebooks collection
      console.log("🔍 Debug: Attempting to read notebooks collection...");
      const allNotebooks = await this.getAllNotebooks();
      console.log("✅ Debug: Successfully connected to Firebase!");
      console.log(`📚 Debug: Found ${allNotebooks.length} total notebooks in collection`);
      
      // Now get specifically the sessions
      console.log("🔍 Debug: Getting dual-notebook sessions...");
      const sessions = await this.getAllSessions();
      console.log(`📝 Debug: Found ${sessions.length} dual-notebook sessions`);
      
      if (sessions.length > 0) {
        console.log("📋 Debug: Session details:");
        sessions.forEach((session, index) => {
          console.log(`  ${index + 1}. ${session.title} (${session.entryCount} entries) - ${session.id}`);
        });
      } else {
        console.log("📭 Debug: No sessions found. This is normal if you haven't saved any yet.");
      }
      
      return {
        connected: true,
        totalNotebooks: allNotebooks.length,
        totalSessions: sessions.length,
        sessions: sessions
      };
    } catch (error) {
      console.error("❌ Debug: Firebase connection failed:", error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // Debug function to create a test session
  static async debugCreateTestSession() {
    console.log("🔍 Debug: Creating test session...");
    try {
      const testSessionData = {
        title: `Debug Test Session ${new Date().toLocaleString()}`,
        leftEntries: [
          {
            id: 1,
            text: "This is a test entry from the left notebook",
            timestamp: new Date(),
            colorIndex: 0
          }
        ],
        rightEntries: [
          {
            id: 2,
            text: "This is a test AI response from the right notebook",
            timestamp: new Date(),
            colorIndex: 0
          }
        ],
        conversationHistory: [
          { role: "user", content: "This is a test entry from the left notebook" },
          { role: "assistant", content: "This is a test AI response from the right notebook" }
        ]
      };

      const sessionId = await this.saveNotebookSession(testSessionData);
      console.log("✅ Debug: Test session created with ID:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("❌ Debug: Failed to create test session:", error);
      throw error;
    }
  }
}

export default DatabaseService;
export { db, notebooksCollection };
