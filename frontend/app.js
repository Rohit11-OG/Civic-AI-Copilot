/**
 * Civic AI Copilot - Frontend Application
 * CivicMate: Legal document simplification
 */

// Configuration
const API_BASE_URL = 'http://localhost:5000';

// DOM Elements
const elements = {
    // Mode navigation
    navPills: document.querySelectorAll('.nav-pill'),
    appContainer: document.querySelector('.app-container'),
    
    // Upload section
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    filePreview: document.getElementById('file-preview'),
    fileName: document.getElementById('file-name'),
    removeFile: document.getElementById('remove-file'),
    uploadTitle: document.getElementById('upload-title'),
    uploadDescription: document.getElementById('upload-description'),
    textInputArea: document.getElementById('text-input-area'),
    habitInput: document.getElementById('habit-input'),
    languageSelect: document.getElementById('language-select'),
    language: document.getElementById('language'),
    analyzeBtn: document.getElementById('analyze-btn'),
    
    // Sections
    uploadSection: document.querySelector('.upload-section'),
    loadingSection: document.getElementById('loading-section'),
    resultsSection: document.getElementById('results-section'),
    
    // Results
    docTypeBadge: document.getElementById('doc-type-badge'),
    resultTitle: document.getElementById('result-title'),
    resultLanguageSelect: document.getElementById('result-language-select'), // New
    summaryCard: document.getElementById('summary-card'),
    summaryText: document.getElementById('summary-text'),
    keypointsCard: document.getElementById('keypoints-card'),
    keyPointsList: document.getElementById('key-points-list'),
    risksCard: document.getElementById('risks-card'),
    risksContainer: document.getElementById('risks-container'),
    actionsCard: document.getElementById('actions-card'),
    actionsList: document.getElementById('actions-list'),
    draftCard: document.getElementById('draft-card'),
    draftContent: document.getElementById('draft-content'),
    copyDraft: document.getElementById('copy-draft'),
    sustainabilityCard: document.getElementById('sustainability-card'),
    impactFill: document.getElementById('impact-fill'),
    impactDescription: document.getElementById('impact-description'),
    alternativesContainer: document.getElementById('alternatives-container'),
    funFact: document.getElementById('fun-fact'),
    disclaimerCard: document.getElementById('disclaimer-card'),
    disclaimerText: document.getElementById('disclaimer-text'),
    newAnalysisBtn: document.getElementById('new-analysis-btn'),
};

// State
let currentMode = 'legal';
let selectedFile = null;
let currentAnalysis = null; // Store analysis for chat context

// ============================================
// MODE SWITCHING
// ============================================

function switchMode(mode) {
    currentMode = mode;
    
    // Update nav pills
    elements.navPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.mode === mode);
    });
    
    // Update container data attribute for styling
    if(elements.appContainer) elements.appContainer.dataset.mode = mode;
    
    // Update UI based on mode
    // Update UI based on mode
    if (mode === 'legal') {
        elements.uploadTitle.textContent = 'Analyze Legal Documents';
        elements.uploadDescription.textContent = 'Upload court notices or legal letters to get a simplified explanation.';
        elements.textInputArea.style.display = 'none';
        elements.languageSelect.style.display = 'flex';
        elements.analyzeBtn.textContent = 'Analyze Document';
    } else {
        elements.uploadTitle.textContent = 'Track Your Impact';
        elements.uploadDescription.textContent = 'Upload a receipt or describe your habits below';
        elements.textInputArea.style.display = 'block';
        elements.languageSelect.style.display = 'none'; // DISABLED for sustainability (English only)
        elements.language.value = 'English'; // Reset to English
        elements.analyzeBtn.textContent = 'Analyze Impact';
    }
    
    // Reset results
    resetResults();
    
    // Update Chat Context specific to mode
    const chatHistoryEl = document.getElementById('chat-history');
    if(chatHistoryEl) {
        const welcomeMsg = mode === 'legal' 
            ? "I am your AI Legal Advisor. Upload a document or ask me a general legal question."
            : "I am your Sustainability Expert. Upload a receipt/habit description or ask me how to live eco-friendly.";
            
        chatHistoryEl.innerHTML = `
            <div class="chat-message ai-message">
                <div class="message-content">${welcomeMsg}</div>
            </div>`;
    }
}
// ============================================
// FILE HANDLING
// ============================================

function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or image file (PNG, JPG, WEBP)');
        return;
    }
    
    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
        alert('File size must be under 16MB');
        return;
    }
    
    selectedFile = file;
    elements.fileName.textContent = file.name;
    elements.filePreview.style.display = 'flex';
    // elements.uploadArea.classList.add('has-file');
}

function removeSelectedFile() {
    selectedFile = null;
    elements.fileInput.value = '';
    elements.filePreview.style.display = 'none';
    // elements.uploadArea.classList.remove('has-file');
}

// ============================================
// API CALLS
// ============================================

async function analyzeLegal() {
    if (!selectedFile) {
        alert('Please upload a document first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', elements.language.value);
    
    try {
        const response = await fetch(`${API_BASE_URL}/analyze/legal`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        return data;
    } catch (error) {
        console.error('Legal analysis error:', error);
        throw error;
    }
}

async function analyzeSustainability() {
    const formData = new FormData();
    formData.append('language', elements.language.value); // Send selected language
    
    if (selectedFile) {
        formData.append('file', selectedFile);
    }
    
    const textInput = elements.habitInput.value.trim();
    if (textInput) {
        formData.append('text', textInput);
    }
    
    // Strict Input Validation
    if (!selectedFile && !textInput) {
        alert('Please either upload a receipt OR describe your habits to analyze.');
        return;
    }
    
    // Hide result language selector for sustainability mode (English only)
    if (elements.resultLanguageSelect) {
        elements.resultLanguageSelect.parentElement.style.display = 'none';
        elements.resultLanguageSelect.value = 'English';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/analyze/sustainability`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        return data;
    } catch (error) {
        console.error('Sustainability analysis error:', error);
        throw error;
    }
}

async function sendChatQuery(question) {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: question,
                context: currentAnalysis,
                mode: currentMode,
                language: elements.language.value || 'English'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Chat failed');
        }
        return data.answer;

    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}

// ============================================
// RESULTS DISPLAY
// ============================================

function showLoading() {
    elements.uploadSection.style.display = 'none';
    elements.loadingSection.style.display = 'block';
    elements.resultsSection.style.display = 'none';
    // Hide chat section when new analysis starts
    const chatSection = document.getElementById('chat-section');
    if(chatSection) chatSection.style.display = 'none';
}

function hideLoading() {
    elements.loadingSection.style.display = 'none';
}

function resetResults() {
    elements.uploadSection.style.display = 'block';
    elements.loadingSection.style.display = 'none';
    elements.resultsSection.style.display = 'none';
    removeSelectedFile();
    elements.habitInput.value = '';
    
    // Reset chat and restore full layout
    closeChat(); // Ensure split screen is disabled
    const chatSection = document.getElementById('chat-section');
    if(chatSection) chatSection.style.display = 'none';
    currentAnalysis = null;
    const chatHistory = document.getElementById('chat-history');
    if(chatHistory) {
        chatHistory.innerHTML = `
            <div class="chat-message ai-message">
                <div class="message-content">I've analyzed the document. Feel free to ask clarifying questions.</div>
            </div>`;
    }
}

function displayLegalResults(analysis) {
    // Show legal-specific cards, hide sustainability
    elements.summaryCard.style.display = 'block';
    elements.keypointsCard.style.display = 'block';
    
    // Show language selector for Legal mode
    if (elements.resultLanguageSelect) {
        elements.resultLanguageSelect.parentElement.style.display = 'block';
    }
    elements.risksCard.style.display = 'block';
    elements.actionsCard.style.display = 'block';
    elements.disclaimerCard.style.display = 'flex';
    elements.sustainabilityCard.style.display = 'none';
    
    // Document type badge
    elements.docTypeBadge.textContent = analysis.document_type || 'Document';
    elements.resultTitle.textContent = 'Analysis Result';
    
    // Summary
    elements.summaryText.textContent = analysis.simple_summary || 'No summary available';
    
    // Key Points
    elements.keyPointsList.innerHTML = '';
    (analysis.key_points || []).forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        elements.keyPointsList.appendChild(li);
    });
    
    // Risks & Deadlines
    elements.risksContainer.innerHTML = '';
    (analysis.risks_and_deadlines || []).forEach(risk => {
        const severity = (risk.severity || 'medium').toLowerCase();
        const div = document.createElement('div');
        div.className = `risk-item ${severity}`;
        div.innerHTML = `
            <span class="risk-severity">${risk.severity || 'Unknown'}</span>
            <div class="risk-description">${risk.risk || 'Unknown risk'}</div>
            ${risk.deadline ? `<div class="risk-deadline">Deadline: <strong>${risk.deadline}</strong></div>` : ''}
        `;
        elements.risksContainer.appendChild(div);
    });
    
    // Recommended Actions
    elements.actionsList.innerHTML = '';
    (analysis.recommended_actions || []).forEach(action => {
        const li = document.createElement('li');
        li.textContent = action;
        elements.actionsList.appendChild(li);
    });
    
    // Draft Reply
    if (analysis.draft_reply && analysis.draft_reply !== 'null') {
        elements.draftCard.style.display = 'block';
        elements.draftContent.textContent = analysis.draft_reply;
    } else {
        elements.draftCard.style.display = 'none';
    }
    
    // Disclaimer
    elements.disclaimerText.textContent = analysis.disclaimer || 
        'Disclaimer: AI-generated information. Always verify with a qualified professional.';
}

function displaySustainabilityResults(analysis) {
    // Show sustainability-specific cards, hide legal
    elements.summaryCard.style.display = 'none';
    elements.keypointsCard.style.display = 'none';
    elements.risksCard.style.display = 'none';
    elements.actionsCard.style.display = 'none';
    elements.draftCard.style.display = 'none';
    elements.disclaimerCard.style.display = 'none';
    elements.sustainabilityCard.style.display = 'block';
    
    // Document type badge
    elements.docTypeBadge.textContent = analysis.item_or_habit || 'Habit Analysis';
    elements.resultTitle.textContent = 'Impact Analysis Complete';
    
    // ============================================
    // HARMFUL ITEMS CARDS (TOP - RED THEME)
    // ============================================
    let harmfulCardsContainer = document.getElementById('harmful-items-cards');
    if (!harmfulCardsContainer) {
        harmfulCardsContainer = document.createElement('div');
        harmfulCardsContainer.id = 'harmful-items-cards';
        harmfulCardsContainer.className = 'harmful-cards-container';
        elements.sustainabilityCard.insertBefore(harmfulCardsContainer, elements.sustainabilityCard.firstChild);
    }
    
    const harmfulItems = analysis.harmful_items || [];
    const harmfulSummary = analysis.harmful_summary || 'Based on your upload, we found some items that have a negative environmental impact.';
    
    let harmfulCardsHTML = `
        <h3 class="section-title harmful-title">⚠️ Harmful Items Found</h3>
        <p class="section-summary harmful-summary">${harmfulSummary}</p>
        <div class="cards-grid">`;
    
    harmfulItems.forEach(item => {
        const severityClass = (item.severity || 'MEDIUM').toLowerCase();
        const detailedInfo = item.detailed_info || {};
        
        harmfulCardsHTML += `
            <div class="card-flip-container">
                <div class="card-flipper">
                    <div class="harmful-card card-front severity-${severityClass}">
                        <div class="card-icon">${item.icon || '⚠️'}</div>
                        <div class="card-title">${item.title || 'Unknown'}</div>
                        <div class="card-value">${item.value || ''}</div>
                        <div class="card-impact">${item.impact || ''}</div>
                        <div class="flip-indicator">Click for details ↻</div>
                    </div>
                    <div class="harmful-card card-back severity-${severityClass}">
                        <div class="back-header">📊 Detailed Analysis</div>
                        <div class="back-content">
                            <p><strong>Why harmful:</strong> ${detailedInfo.explanation || 'No details available'}</p>
                            <p><strong>Breakdown:</strong> ${detailedInfo.breakdown || 'N/A'}</p>
                            <p><strong>Yearly Impact:</strong> ${detailedInfo.yearly_impact || 'N/A'}</p>
                            <p><strong>Comparison:</strong> ${detailedInfo.comparison || 'N/A'}</p>
                        </div>
                        <div class="flip-indicator">Click to return ↻</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    harmfulCardsHTML += '</div>';
    harmfulCardsContainer.innerHTML = harmfulCardsHTML;
    
    // ============================================
    // GOOD ITEMS BADGES (OPTIONAL)
    // ============================================
    let goodItemsContainer = document.getElementById('good-items-badges');
    if (!goodItemsContainer) {
        goodItemsContainer = document.createElement('div');
        goodItemsContainer.id = 'good-items-badges';
        goodItemsContainer.className = 'good-items-container';
        harmfulCardsContainer.insertAdjacentElement('afterend', goodItemsContainer);
    }
    
    const goodItems = analysis.good_items || [];
    if (goodItems.length > 0) {
        let goodItemsHTML = '<h3 class="section-title good-title">✅ Good Choices Found</h3><div class="good-items-list">';
        goodItems.forEach(item => {
            goodItemsHTML += `
                <div class="good-item-badge">
                    <span class="good-icon">${item.icon || '✅'}</span>
                    <span class="good-text">${item.title || ''}</span>
                    <span class="good-praise">${item.praise || ''}</span>
                </div>
            `;
        });
        goodItemsHTML += '</div>';
        goodItemsContainer.innerHTML = goodItemsHTML;
        goodItemsContainer.style.display = 'block';
    } else {
        goodItemsContainer.style.display = 'none';
    }
    
    // Impact meter (score out of 10)
    const impactScore = analysis.impact_score || 5;
    elements.impactFill.style.width = `${impactScore * 10}%`;
    
    // Impact description
    elements.impactDescription.textContent = analysis.environmental_impact || 'Analysis complete';
    
    // Hide alternatives list in summary (cards show detailed alternatives instead)
    elements.alternativesContainer.style.display = 'none';
    
    // Alternatives (keep existing for backward compatibility) - HIDDEN
    // elements.alternativesContainer.innerHTML = '';
    // const easyAlternatives = analysis.easy_alternatives || [];
    // easyAlternatives.forEach(alt => {
    //     const div = document.createElement('div');
    //     div.className = 'alternative-item';
    //     div.innerHTML = `
    //         <span class="alternative-icon">🌿</span>
    //         <div class="alternative-content">
    //             <div class="alternative-action">${alt.action}</div>
    //             <div class="alternative-savings">${alt.savings} • ${alt.difficulty}</div>
    //         </div>
    //     `;
    //     elements.alternativesContainer.appendChild(div);
    // });
    
    // ============================================
    // BENEFICIAL ALTERNATIVES CARDS (BOTTOM - GREEN THEME)
    // ============================================
    let beneficialCardsContainer = document.getElementById('beneficial-alternatives-cards');
    if (!beneficialCardsContainer) {
        beneficialCardsContainer = document.createElement('div');
        beneficialCardsContainer.id = 'beneficial-alternatives-cards';
        beneficialCardsContainer.className = 'beneficial-cards-container';
        // Insert after alternatives container
        const alternativesParent = elements.alternativesContainer.parentElement;
        alternativesParent.parentElement.insertBefore(beneficialCardsContainer, alternativesParent.nextSibling);
    }
    
    const beneficialAlts = analysis.beneficial_alternatives || [];
    const beneficialSummary = analysis.beneficial_summary || 'Here are sustainable alternatives we recommend to reduce your environmental impact.';
    
    let beneficialCardsHTML = `
        <h3 class="section-title beneficial-title">✅ Recommended Sustainable Alternatives</h3>
        <p class="section-summary beneficial-summary">${beneficialSummary}</p>
        <div class="cards-grid">`;
    
    beneficialAlts.forEach(alt => {
        const detailedInfo = alt.detailed_info || {};
        
        beneficialCardsHTML += `
            <div class="card-flip-container">
                <div class="card-flipper">
                    <div class="beneficial-card card-front">
                        <div class="card-icon">${alt.icon || '🌿'}</div>
                        <div class="card-title">${alt.title || 'Unknown'}</div>
                        <div class="card-savings">${alt.savings || ''}</div>
                        <div class="card-benefit">${alt.benefit || ''}</div>
                        <div class="card-difficulty">${alt.difficulty || 'Easy'}</div>
                        <div class="flip-indicator">Click for details ↻</div>
                    </div>
                    <div class="beneficial-card card-back">
                        <div class="back-header">🎯 Action Plan</div>
                        <div class="back-content">
                            <p><strong>Steps:</strong> ${detailedInfo.steps || 'No steps available'}</p>
                            <p><strong>Cost:</strong> ${detailedInfo.cost || 'N/A'}</p>
                            <p><strong>Payback:</strong> ${detailedInfo.payback || 'N/A'}</p>
                            <p><strong>Long-term:</strong> ${detailedInfo.long_term || 'N/A'}</p>
                        </div>
                        <div class="flip-indicator">Click to return ↻</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    beneficialCardsHTML += '</div>';
    beneficialCardsContainer.innerHTML = beneficialCardsHTML;
    
    // Add flip functionality to all cards
    setTimeout(() => {
        document.querySelectorAll('.card-flip-container').forEach(container => {
            container.addEventListener('click', function() {
                this.classList.toggle('flipped');
            });
        });
    }, 100);
    
    // Fun fact
    if (analysis.fun_fact) {
        elements.funFact.style.display = 'block';
        elements.funFact.textContent = analysis.fun_fact;
    } else {
        elements.funFact.style.display = 'none';
    }
}

function showResults(data) {
    hideLoading();
    elements.resultsSection.style.display = 'block'; /* was flex in previous design, using block here to be safe with animation */
    
    // Store current analysis for chat context
    currentAnalysis = data.analysis;
    
    if (data.mode === 'legal') {
        displayLegalResults(data.analysis);
    } else {
        displaySustainabilityResults(data.analysis);
    }

    // Show Chat Toggle Button
    const chatToggle = document.getElementById('chat-toggle-btn');
    if(chatToggle) {
        chatToggle.style.display = 'flex';
    }
    
    // Reset Split State (Start closed)
    const splitContainer = document.getElementById('split-container');
    if(splitContainer) splitContainer.classList.remove('chat-active');
    
    const chatSection = document.getElementById('chat-section');
    if(chatSection) chatSection.style.display = 'flex'; // Prepare it
    
    // Sync the result language selector with the current language
    if (elements.resultLanguageSelect) {
        elements.resultLanguageSelect.value = elements.language.value;
    }
    
    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// CHAT HANDLING & SPLIT SCREEN
// ============================================

const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatHistory = document.getElementById('chat-history');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const splitContainer = document.getElementById('split-container');
const chatSection = document.getElementById('chat-section');

function parseMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS (basic)
    let tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    let safeText = tempDiv.innerHTML;
    
    // Bold: **text**
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Lists: - item or 1. item
    safeText = safeText.replace(/^\s*[\-\*]\s+(.*)$/gm, '• $1<br>');
    safeText = safeText.replace(/^\s*\d+\.\s+(.*)$/gm, '<br><strong>$&</strong>'); // Bold numbered lists
    
    // Line breaks
    safeText = safeText.replace(/\n/g, '<br>');
    
    return safeText;
}

function appendMessage(text, isUser) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
    
    // Use parseMarkdown for AI, strict text for User (or both, but user usually plain text)
    const processedText = isUser ? text : parseMarkdown(text);
    
    // Note: We use innerHTML here because processedText contains <strong> etc.
    // The parseMarkdown function handles basic escaping of the original text first.
    msgDiv.innerHTML = `<div class="message-content">${processedText}</div>`;
    
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleChatSubmit() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Display user message
    appendMessage(question, true);
    chatInput.value = '';

    // Show typing indicator
    const loadingId = 'chat-loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai-message';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const answer = await sendChatQuery(question);
        
        // Remove loading and show answer
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        appendMessage(answer, false);
    } catch (error) {
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        appendMessage('Sorry, I encountered an error. Please try again.', false);
    }
}

// Toggle Chat View
function openChat() {
    if(splitContainer) splitContainer.classList.add('chat-active');
    if(chatSection) chatSection.style.display = 'flex'; // Ensure visible
    if(chatToggleBtn) chatToggleBtn.style.display = 'none'; // Hide toggle
    
    // If no analysis yet, ensure results pane is hidden so chat takes 50% (or we might want full width? user said split)
    // Actually, if we are in 'no analysis' state, the results section is hidden.
    // The results-pane width: 50%. It will be empty white space.
    // We can show a placeholder in results pane if empty?
    // For now, let's keep it simple as requested.
}

function closeChat() {
    if(splitContainer) splitContainer.classList.remove('chat-active');
    if(chatToggleBtn) chatToggleBtn.style.display = 'flex'; // Show toggle
}

if (sendChatBtn) sendChatBtn.addEventListener('click', handleChatSubmit);
if (chatInput) chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmit();
});

// Event Listeners for Split Screen
if (chatToggleBtn) chatToggleBtn.addEventListener('click', openChat);
if (closeChatBtn) closeChatBtn.addEventListener('click', closeChat);

// Modify showResults to reveal toggle button instead of chat section directly
const originalShowResults = showResults; // Backup if needed, but we'll specific logic here for split screen
// We already have showResults function, let's inject logic there or update it? 
// It's cleaner to update the showResults function directly.
// See below for updated showResults integration.

// ============================================
// EVENT LISTENERS
// ============================================

// ... (existing listeners)


// Mode switching
elements.navPills.forEach(pill => {
    pill.addEventListener('click', () => switchMode(pill.dataset.mode));
});

// File upload - click
elements.uploadArea.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

// File upload - drag & drop
elements.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
});

elements.uploadArea.addEventListener('dragleave', () => {
    elements.uploadArea.classList.remove('dragover');
});

elements.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    handleFileSelect(e.dataTransfer.files[0]);
});

// Remove file
elements.removeFile.addEventListener('click', (e) => {
    e.stopPropagation();
    removeSelectedFile();
});

// Analyze button
elements.analyzeBtn.addEventListener('click', async () => {
    showLoading();
    
    try {
        let result;
        if (currentMode === 'legal') {
            result = await analyzeLegal();
        } else {
            result = await analyzeSustainability();
        }
        
        showResults(result);
    } catch (error) {
        // showError(error.message); // Todo implement show error
        alert(error.message);
        hideLoading();
        elements.uploadSection.style.display = 'block';
    }
});

// Copy draft
elements.copyDraft.addEventListener('click', () => {
    const text = elements.draftContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        elements.copyDraft.textContent = 'Copied!';
        setTimeout(() => {
            elements.copyDraft.textContent = 'Copy';
        }, 2000);
    });
});

// New analysis
elements.newAnalysisBtn.addEventListener('click', resetResults);

// Result Language Switch triggers re-analysis
if (elements.resultLanguageSelect) {
    elements.resultLanguageSelect.addEventListener('change', async () => {
        // Sync main language selector
        elements.language.value = elements.resultLanguageSelect.value;
        
        // Check if we have valid input (file or text)
        const hasHabitInput = currentMode === 'sustainability' && elements.habitInput.value.trim().length > 0;
        
        if (!selectedFile && !hasHabitInput) {
            alert('Session input missing. Please upload a document or enter habits again.');
            resetResults();
            return;
        }

        // Trigger analysis directly
        showLoading();
        
        try {
            let result;
            // Only Legal mode supports language switch currently
            if (currentMode === 'legal') {
                result = await analyzeLegal();
            } else {
                result = await analyzeSustainability();
            }
            
            if (result) {
                showResults(result);
            } else {
                // If analyzeLegal returned undefined (e.g. handled internal alert), hide loading
                hideLoading();
                elements.resultsSection.style.display = 'block';
            }
        } catch (error) {
            alert(error.message);
            hideLoading();
            elements.resultsSection.style.display = 'block';
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Check API health on load
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (!data.groq_configured) {
             console.warn('⚠️ Groq API key not configured on backend');
        } else {
            console.log('✅ API is healthy and Groq is configured');
        }
    } catch (error) {
        console.warn('⚠️ Backend API not reachable. Make sure the server is running.');
    }
}

// ============================================
// SPEECH RECOGNITION
// ============================================

function setupSpeechRecognition(buttonId, inputId) {
    const micBtn = document.getElementById(buttonId);
    const inputEl = document.getElementById(inputId);
    
    if (!micBtn || !inputEl) return;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none'; // Hide if not supported
        console.warn('Speech recognition not supported in this browser');
        // Optional: Alert user once
        // if(buttonId === 'habit-mic-btn') alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    
    // Dynamic Language Setting
    // We try to match the selected language dropdown if possible
    function getSpeechLang() {
        const selectedLang = document.getElementById('language').value;
        if (selectedLang.includes('Hindi')) return 'hi-IN';
        if (selectedLang.includes('Marathi')) return 'mr-IN';
        return 'en-IN'; // Default
    }

    recognition.interimResults = false;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent focus loss
        if (micBtn.classList.contains('listening')) {
            recognition.stop();
        } else {
            recognition.lang = getSpeechLang(); // Set lang on click
            try {
                recognition.start();
            } catch(e) {
                console.error("Mic start error", e);
                alert("Microphone access denied or error. Check settings.");
            }
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add('listening');
        micBtn.textContent = '⏹️'; // Stop icon
        micBtn.title = 'Listening...';
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
        micBtn.title = 'Speak';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (inputEl.tagName === 'TEXTAREA') {
            inputEl.value += (inputEl.value ? ' ' : '') + transcript;
        } else {
            inputEl.value = transcript;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkApiHealth();
    switchMode('legal'); // Start in legal mode
    
    // Splash Screen Logic
    const splash = document.getElementById('splash-screen');
    if(splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 2000); // Show splash for 2 seconds
    }
    
    // Setup Voice Input
    setupSpeechRecognition('habit-mic-btn', 'habit-input');
    setupSpeechRecognition('chat-mic-btn', 'chat-input');
});
