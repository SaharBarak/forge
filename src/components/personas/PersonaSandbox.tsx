import { useState, useRef, useEffect } from 'react';
import { AgentPersona } from '../../types';
import { useUIStore } from '../../stores/uiStore';

interface PersonaSandboxProps {
  initialPersonas?: AgentPersona[];
  availablePersonas?: AgentPersona[];
  onClose?: () => void;
}

interface TestMessage {
  id: string;
  personaId: string;
  content: string;
  timestamp: Date;
  isUser?: boolean;
}

interface TestPrompt {
  id: string;
  text: string;
  timestamp: Date;
}

type ComparisonMode = 'single' | 'side-by-side' | 'carousel';

export function PersonaSandbox({
  initialPersonas = [],
  availablePersonas = [],
  onClose,
}: PersonaSandboxProps) {
  const { hebrewMode } = useUIStore();
  const [selectedPersonas, setSelectedPersonas] = useState<AgentPersona[]>(initialPersonas);
  const [prompt, setPrompt] = useState('');
  const [testHistory, setTestHistory] = useState<TestPrompt[]>([]);
  const [responses, setResponses] = useState<Map<string, TestMessage[]>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(
    initialPersonas.length > 1 ? 'side-by-side' : 'single'
  );
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const responsePanelsRef = useRef<HTMLDivElement>(null);

  const t = {
    title: hebrewMode ? 'סנדבוקס פרסונות' : 'Persona Sandbox',
    subtitle: hebrewMode ? 'בדוק תגובות פרסונות' : 'Test persona responses',
    selectPersonas: hebrewMode ? 'בחר פרסונות' : 'Select Personas',
    addPersona: hebrewMode ? 'הוסף פרסונה' : 'Add Persona',
    removePersona: hebrewMode ? 'הסר' : 'Remove',
    prompt: hebrewMode ? 'הזן הודעה לבדיקה...' : 'Enter a test prompt...',
    send: hebrewMode ? 'שלח' : 'Send',
    generating: hebrewMode ? 'מייצר...' : 'Generating...',
    clearHistory: hebrewMode ? 'נקה היסטוריה' : 'Clear History',
    exportTest: hebrewMode ? 'ייצוא בדיקה' : 'Export Test',
    close: hebrewMode ? 'סגור' : 'Close',
    single: hebrewMode ? 'יחיד' : 'Single',
    sideBySide: hebrewMode ? 'זה לצד זה' : 'Side by Side',
    carousel: hebrewMode ? 'קרוסלה' : 'Carousel',
    noPersonas: hebrewMode ? 'בחר פרסונות לבדיקה' : 'Select personas to test',
    testPrompts: hebrewMode ? 'הודעות בדיקה' : 'Test Prompts',
    suggestedPrompts: hebrewMode ? 'הודעות מוצעות' : 'Suggested Prompts',
    response: hebrewMode ? 'תגובה' : 'Response',
    noResponse: hebrewMode ? 'אין תגובה עדיין' : 'No response yet',
    copyResponse: hebrewMode ? 'העתק' : 'Copy',
    copied: hebrewMode ? 'הועתק!' : 'Copied!',
    regenerate: hebrewMode ? 'צור מחדש' : 'Regenerate',
    compareAll: hebrewMode ? 'השווה הכל' : 'Compare All',
    prev: hebrewMode ? 'הקודם' : 'Previous',
    next: hebrewMode ? 'הבא' : 'Next',
    available: hebrewMode ? 'זמינות' : 'Available',
    selected: hebrewMode ? 'נבחרו' : 'Selected',
  };

  const suggestedPrompts = [
    hebrewMode ? 'כתוב כותרת פרסומית למוצר חדש' : 'Write a headline for a new product launch',
    hebrewMode ? 'מה דעתך על הרעיון הזה?' : 'What do you think about this idea?',
    hebrewMode ? 'איך היית משפר את הקופי הזה?' : 'How would you improve this copy?',
    hebrewMode ? 'נתח את הקהל היעד' : 'Analyze the target audience',
    hebrewMode ? 'הצע גישה יצירתית אחרת' : 'Suggest an alternative creative approach',
  ];

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleAddPersona = (persona: AgentPersona) => {
    if (!selectedPersonas.find((p) => p.id === persona.id)) {
      setSelectedPersonas([...selectedPersonas, persona]);
      if (selectedPersonas.length >= 1) {
        setComparisonMode('side-by-side');
      }
    }
    setShowPersonaSelector(false);
  };

  const handleRemovePersona = (personaId: string) => {
    setSelectedPersonas(selectedPersonas.filter((p) => p.id !== personaId));
    if (selectedPersonas.length <= 2) {
      setComparisonMode('single');
    }
  };

  const generateResponse = async (persona: AgentPersona, promptText: string): Promise<string> => {
    // Simulate AI response generation based on persona traits
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate a response that reflects the persona's personality
    const personalityTraits = persona.personality.join(', ');
    const response = `[${persona.name} responding in character as a ${persona.role}]\n\n` +
      `Based on my ${personalityTraits} perspective:\n\n` +
      `"${promptText}" - This is an interesting prompt. ` +
      `As someone with a ${persona.speakingStyle} speaking style, I would approach this by... ` +
      `[Simulated response reflecting ${persona.name}'s unique viewpoint and ${persona.biases.join(', ')} biases]`;
    
    return response;
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || selectedPersonas.length === 0 || isGenerating) return;

    const promptId = Date.now().toString();
    const newPrompt: TestPrompt = {
      id: promptId,
      text: prompt,
      timestamp: new Date(),
    };

    setTestHistory([...testHistory, newPrompt]);
    setIsGenerating(true);

    // Generate responses for all selected personas
    const newResponses = new Map(responses);

    for (const persona of selectedPersonas) {
      const personaResponses = newResponses.get(persona.id) || [];
      
      // Add user message
      personaResponses.push({
        id: `${promptId}-user`,
        personaId: persona.id,
        content: prompt,
        timestamp: new Date(),
        isUser: true,
      });
      
      newResponses.set(persona.id, personaResponses);
    }
    setResponses(new Map(newResponses));

    // Generate AI responses in parallel
    const responsePromises = selectedPersonas.map(async (persona) => {
      const responseText = await generateResponse(persona, prompt);
      return { personaId: persona.id, response: responseText };
    });

    const results = await Promise.all(responsePromises);

    // Update with AI responses
    const finalResponses = new Map(newResponses);
    for (const { personaId, response } of results) {
      const personaResponses = finalResponses.get(personaId) || [];
      personaResponses.push({
        id: `${promptId}-response`,
        personaId,
        content: response,
        timestamp: new Date(),
        isUser: false,
      });
      finalResponses.set(personaId, personaResponses);
    }

    setResponses(finalResponses);
    setPrompt('');
    setIsGenerating(false);

    // Scroll to bottom
    setTimeout(() => {
      responsePanelsRef.current?.scrollTo({
        top: responsePanelsRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  const handleClearHistory = () => {
    setTestHistory([]);
    setResponses(new Map());
  };

  const handleExportTest = () => {
    const exportData = {
      personas: selectedPersonas.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      prompts: testHistory,
      responses: Object.fromEntries(responses),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${hebrewMode ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
          <p className="text-sm text-gray-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Comparison Mode Toggle */}
          {selectedPersonas.length > 1 && (
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setComparisonMode('side-by-side')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  comparisonMode === 'side-by-side'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.sideBySide}
              </button>
              <button
                onClick={() => setComparisonMode('carousel')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  comparisonMode === 'carousel'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.carousel}
              </button>
            </div>
          )}
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {t.clearHistory}
          </button>
          <button
            onClick={handleExportTest}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {t.exportTest}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.close}
            </button>
          )}
        </div>
      </div>

      {/* Selected Personas Bar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-700 overflow-x-auto">
        <span className="text-sm text-gray-400 flex-shrink-0">{t.selected}:</span>
        {selectedPersonas.map((persona) => (
          <div
            key={persona.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full flex-shrink-0"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: persona.color + '30', color: persona.color }}
            >
              {persona.avatar || persona.name.charAt(0)}
            </div>
            <span className="text-sm text-white">
              {hebrewMode ? persona.nameHe || persona.name : persona.name}
            </span>
            <button
              onClick={() => handleRemovePersona(persona.id)}
              className="text-gray-400 hover:text-red-400 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowPersonaSelector(true)}
          className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-600 hover:border-blue-500 rounded-full text-sm text-gray-400 hover:text-blue-400 transition-colors flex-shrink-0"
        >
          + {t.addPersona}
        </button>
      </div>

      {/* Main Content */}
      {selectedPersonas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-4">{t.noPersonas}</p>
            <button
              onClick={() => setShowPersonaSelector(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              {t.selectPersonas}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Response Panels */}
          <div ref={responsePanelsRef} className="flex-1 overflow-auto p-4">
            {comparisonMode === 'side-by-side' ? (
              <div
                className="grid gap-4 h-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(selectedPersonas.length, 3)}, 1fr)`,
                }}
              >
                {selectedPersonas.map((persona) => (
                  <ResponsePanel
                    key={persona.id}
                    persona={persona}
                    messages={responses.get(persona.id) || []}
                    hebrewMode={hebrewMode}
                    t={t}
                    onCopy={handleCopyResponse}
                    isGenerating={isGenerating}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full">
                {/* Carousel Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() =>
                      setActiveCarouselIndex(
                        (activeCarouselIndex - 1 + selectedPersonas.length) % selectedPersonas.length
                      )
                    }
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {t.prev}
                  </button>
                  <div className="flex gap-2">
                    {selectedPersonas.map((persona, i) => (
                      <button
                        key={persona.id}
                        onClick={() => setActiveCarouselIndex(i)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          i === activeCarouselIndex
                            ? 'ring-2 ring-blue-500 scale-110'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: persona.color + '30', color: persona.color }}
                      >
                        {persona.avatar || persona.name.charAt(0)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setActiveCarouselIndex((activeCarouselIndex + 1) % selectedPersonas.length)
                    }
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {t.next}
                  </button>
                </div>
                <ResponsePanel
                  persona={selectedPersonas[activeCarouselIndex]}
                  messages={responses.get(selectedPersonas[activeCarouselIndex]?.id) || []}
                  hebrewMode={hebrewMode}
                  t={t}
                  onCopy={handleCopyResponse}
                  isGenerating={isGenerating}
                />
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          {testHistory.length === 0 && (
            <div className="px-4 pb-2">
              <p className="text-sm text-gray-400 mb-2">{t.suggestedPrompts}:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(sp)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-sm transition-colors"
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder={t.prompt}
                rows={2}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendPrompt}
                disabled={!prompt.trim() || isGenerating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {isGenerating ? t.generating : t.send}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Persona Selector Modal */}
      {showPersonaSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">{t.selectPersonas}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {t.available}: {availablePersonas.length}
            </p>
            <div className="flex-1 overflow-auto space-y-2">
              {availablePersonas.map((persona) => {
                const isSelected = selectedPersonas.some((p) => p.id === persona.id);
                return (
                  <button
                    key={persona.id}
                    onClick={() => !isSelected && handleAddPersona(persona)}
                    disabled={isSelected}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: persona.color + '30', color: persona.color }}
                    >
                      {persona.avatar || persona.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">
                        {hebrewMode ? persona.nameHe || persona.name : persona.name}
                      </p>
                      <p className="text-sm text-gray-400">{persona.role}</p>
                    </div>
                    {isSelected && (
                      <span className="ml-auto text-green-400">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPersonaSelector(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Response Panel Component
interface ResponsePanelProps {
  persona: AgentPersona;
  messages: TestMessage[];
  hebrewMode: boolean;
  t: Record<string, string>;
  onCopy: (text: string) => void;
  isGenerating: boolean;
}

function ResponsePanel({
  persona,
  messages,
  hebrewMode,
  t,
  onCopy,
  isGenerating,
}: ResponsePanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (message: TestMessage) => {
    onCopy(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div
        className="flex items-center gap-3 p-3 border-b border-gray-700"
        style={{ backgroundColor: persona.color + '10' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: persona.color + '30', color: persona.color }}
        >
          {persona.avatar || persona.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-white font-semibold">
            {hebrewMode ? persona.nameHe || persona.name : persona.name}
          </h3>
          <p className="text-xs text-gray-400">{persona.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {t.noResponse}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.isUser
                  ? 'bg-blue-600/20 border border-blue-600/30 ml-8'
                  : 'bg-gray-700 mr-8'
              }`}
            >
              <p className="text-gray-200 text-sm whitespace-pre-wrap">{message.content}</p>
              {!message.isUser && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleCopy(message)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedId === message.id ? t.copied : t.copyResponse}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {isGenerating && messages.length > 0 && messages[messages.length - 1]?.isUser && (
          <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg mr-8">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-400">{t.generating}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PersonaSandbox;
