// RAG (Retrieval-Augmented Generation) Chatbot Service
const axios = require('axios');

// Configuration for different LLM providers
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini'; // 'gemini' or 'openai'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Hospital knowledge base (in production, this would be a vector database)
const hospitalKnowledgeBase = {
  visiting_hours: {
    content: "Our hospital is open 24/7 for emergencies. Outpatient services are available from 8 AM to 8 PM on weekdays and 9 AM to 5 PM on weekends. ICU visiting hours are restricted to 10 AM - 12 PM and 5 PM - 7 PM daily. Maximum 2 visitors per patient at a time.",
    keywords: ['visiting', 'hours', 'visit', 'time', 'when', 'open']
  },
  appointments: {
    content: "To book an appointment, you can: 1) Call our reception desk at the hospital number, 2) Use our online patient portal, 3) Visit the hospital in person. Walk-in appointments are available but may have longer wait times. For urgent cases, please visit the emergency department.",
    keywords: ['appointment', 'book', 'schedule', 'consultation', 'doctor']
  },
  insurance: {
    content: "We accept most major insurance plans including Blue Cross Blue Shield, Aetna, United Healthcare, Cigna, and Medicare. Please bring your insurance card and ID to every visit. For specific coverage questions, contact our billing department at billing@hospital.com or call ext. 4567.",
    keywords: ['insurance', 'payment', 'cost', 'price', 'coverage', 'plan']
  },
  emergency: {
    content: "If this is a medical emergency, please call 911 immediately or visit our emergency department. Our ER is open 24/7 with full trauma capabilities. For non-emergency urgent care, consider our Urgent Care Center open 8 AM - 10 PM daily.",
    keywords: ['emergency', 'urgent', 'help', 'immediate', '911', 'trauma']
  },
  prescriptions: {
    content: "Prescriptions can be picked up at our on-site pharmacy during operating hours (7 AM - 9 PM). We also offer home delivery for eligible patients. Please bring your prescription from the doctor and your insurance card. Refills can be requested through our patient portal or by calling the pharmacy directly.",
    keywords: ['prescription', 'medicine', 'pharmacy', 'drug', 'medication', 'refill']
  },
  lab_tests: {
    content: "Most lab tests require an order from your doctor. Walk-in lab services are available for basic tests (blood work, urinalysis) without an appointment. Results are typically available within 24-48 hours and can be accessed through our patient portal. For specialized tests, please schedule in advance.",
    keywords: ['lab', 'test', 'blood', 'urine', 'result', 'diagnostic']
  },
  billing: {
    content: "Bills are typically processed within 3-5 business days after service. Payment can be made online, by phone, or in person. We accept cash, credit cards, and insurance. Payment plans are available for qualifying patients. For billing questions, contact our billing department.",
    keywords: ['bill', 'payment', 'invoice', 'cost', 'charge', 'pay']
  },
  departments: {
    content: "Our hospital has the following departments: Emergency Medicine, Cardiology, Neurology, Orthopedics, Pediatrics, Obstetrics & Gynecology, Oncology, Radiology, Surgery, and Intensive Care. Each department has specialized staff and equipment. Department-specific hours may vary.",
    keywords: ['department', 'specialty', 'ward', 'unit', 'section']
  }
};

// Retrieve relevant documents based on query
function retrieveDocuments(query) {
  const lowerQuery = query.toLowerCase();
  const relevantDocs = [];

  for (const [topic, data] of Object.entries(hospitalKnowledgeBase)) {
    const keywordMatches = data.keywords.filter(keyword => 
      lowerQuery.includes(keyword)
    );
    
    if (keywordMatches.length > 0) {
      relevantDocs.push({
        topic,
        content: data.content,
        relevance: keywordMatches.length
      });
    }
  }

  // Sort by relevance
  relevantDocs.sort((a, b) => b.relevance - a.relevance);
  
  return relevantDocs.slice(0, 3); // Return top 3 relevant documents
}

// Generate response using Gemini API
async function generateWithGemini(query, context) {
  try {
    const contextText = context.map(doc => 
      `[${doc.topic}]: ${doc.content}`
    ).join('\n\n');

    const prompt = `You are a helpful hospital assistant. Use the following hospital information to answer the user's question. If the information is not available in the context, say so politely and suggest contacting the hospital directly.

Hospital Information:
${contextText}

User Question: ${query}

Provide a helpful, accurate, and concise response.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Invalid response from Gemini API');
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    throw error;
  }
}

// Generate response using OpenAI API
async function generateWithOpenAI(query, context) {
  try {
    const contextText = context.map(doc => 
      `[${doc.topic}]: ${doc.content}`
    ).join('\n\n');

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful hospital assistant. Use the provided hospital information to answer questions accurately. If information is not available, politely suggest contacting the hospital directly.'
      },
      {
        role: 'user',
        content: `Hospital Information:\n${contextText}\n\nQuestion: ${query}`
      }
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('Invalid response from OpenAI API');
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

// Fallback response when LLM is unavailable
function generateFallbackResponse(query, context) {
  if (context.length > 0) {
    return context[0].content;
  }
  
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent')) {
    return "If this is a medical emergency, please call 911 immediately or visit our emergency department. Our ER is open 24/7.";
  }
  
  if (lowerQuery.includes('appointment') || lowerQuery.includes('book')) {
    return "To book an appointment, please contact our reception desk or use our online booking system. You can also call us at our hospital number.";
  }
  
  return "I'm not sure about that. For specific medical questions, please consult with a healthcare professional. For hospital-related queries, you can contact our reception desk at the main hospital number.";
}

// Main RAG function
async function ragChatbotQuery(query, context = {}) {
  try {
    // Step 1: Retrieve relevant documents
    const retrievedDocs = retrieveDocuments(query);
    
    // Step 2: If no LLM API keys are configured, use fallback
    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      const response = generateFallbackResponse(query, retrievedDocs);
      return {
        response,
        sources: retrievedDocs.map(doc => doc.topic),
        method: 'fallback'
      };
    }
    
    // Step 3: Generate response using configured LLM
    let response;
    if (LLM_PROVIDER === 'gemini' && GEMINI_API_KEY) {
      response = await generateWithGemini(query, retrievedDocs);
    } else if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY) {
      response = await generateWithOpenAI(query, retrievedDocs);
    } else {
      // Fallback to the available provider
      if (GEMINI_API_KEY) {
        response = await generateWithGemini(query, retrievedDocs);
      } else if (OPENAI_API_KEY) {
        response = await generateWithOpenAI(query, retrievedDocs);
      } else {
        response = generateFallbackResponse(query, retrievedDocs);
      }
    }
    
    return {
      response,
      sources: retrievedDocs.map(doc => doc.topic),
      method: LLM_PROVIDER
    };
    
  } catch (error) {
    console.error('RAG Chatbot Error:', error.message);
    // Fallback to basic response on error
    const retrievedDocs = retrieveDocuments(query);
    const response = generateFallbackResponse(query, retrievedDocs);
    
    return {
      response,
      sources: retrievedDocs.map(doc => doc.topic),
      method: 'fallback',
      error: error.message
    };
  }
}

module.exports = {
  ragChatbotQuery,
  retrieveDocuments
};
