import { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, FileText, Send, X, Copy, Check, RefreshCw, Languages, Settings, Server, ChevronDown } from 'lucide-react';

export default function TranslateTool() {
  const [mode, setMode] = useState('chat');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const ollamaUrl = 'http://10.6.101.7:11434';
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionError, setConnectionError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'zh', name: '中文', native: 'Chinese' },
    { code: 'ja', name: '日本語', native: 'Japanese' },
    { code: 'ko', name: '한국어', native: 'Korean' },
    { code: 'de', name: 'Deutsch', native: 'German' },
    { code: 'fr', name: 'Français', native: 'French' },
    { code: 'es', name: 'Español', native: 'Spanish' },
    { code: 'pt', name: 'Português', native: 'Portuguese' },
    { code: 'ru', name: 'Русский', native: 'Russian' },
    { code: 'ar', name: 'العربية', native: 'Arabic' },
    { code: 'it', name: 'Italiano', native: 'Italian' },
    { code: 'vi', name: 'Tiếng Việt', native: 'Vietnamese' },
    { code: 'th', name: 'ไทย', native: 'Thai' },
  ];

  const defaultPrompts = {
    'chat': `You are a professional translator. Translate the following {source} text into {target} for natural everyday conversation. Only output the translation:\n\n{text}`,
    'contract': `You are a professional legal translator. Translate the following {source} document into formal, accurate {target}. Preserve structure, numbering, terms, and formatting. Only output the translation:\n\n{text}`,
  };

  const [promptTemplate, setPromptTemplate] = useState('chat');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('translateHistory');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const persistHistory = (items) => {
    setHistory(items);
    try {
      localStorage.setItem('translateHistory', JSON.stringify(items));
    } catch {}
  };

  const addHistoryItem = (item) => {
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 50);
      try {
        localStorage.setItem('translateHistory', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearHistory = () => {
    persistHistory([]);
  };

  const restoreHistoryItem = (item) => {
    setMode(item.mode);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setSelectedModel(item.model || selectedModel);
    setInputText(item.input || '');
    if (item.mode === 'document') setOutputText(item.output || '');
  };

  useEffect(() => {
    setPromptTemplate(mode === 'chat' ? 'chat' : 'contract');
    setCustomPrompt('');
  }, [mode]);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      setModels(data.models || []);
      setConnectionStatus((data.models || []).length > 0 ? 'ok' : 'empty');
      setConnectionError('');
      if (data.models?.length > 0 && !selectedModel) {
        const gemma = data.models.find(m => m.name.includes('gemma'));
        setSelectedModel(gemma?.name || data.models[0].name);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
      setModels([]);
      setConnectionStatus('error');
      setConnectionError(e.message || '连接失败');
    }
    setLoadingModels(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const getLangName = (code, type = 'native') => {
    const lang = languages.find(l => l.code === code);
    return type === 'native' ? lang?.native : lang?.name;
  };

  const buildPrompt = (text) => {
    const template = customPrompt || defaultPrompts[promptTemplate] || defaultPrompts['chat'];
    return template
      .replace('{source}', getLangName(sourceLang))
      .replace('{target}', getLangName(targetLang))
      .replace('{text}', text);
  };

  const callOllama = async (prompt) => {
    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const testOpenAIConnection = async () => {
    if (!selectedModel?.trim()) return;
    setTestingModel(true);
    setTestResult(null);
    try {
      const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      setTestResult({ ok: true, message: content ? '接口可用' : '接口可用（无返回内容）' });
    } catch (e) {
      setTestResult({ ok: false, message: e.message || '连接失败' });
    }
    setTestingModel(false);
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || !selectedModel) return;
    setIsLoading(true);
    setOutputText('');
    
    try {
      const prompt = buildPrompt(inputText);
      const result = await callOllama(prompt);
      setOutputText(result);
      addHistoryItem({
        id: Date.now(),
        mode,
        sourceLang,
        targetLang,
        model: selectedModel,
        input: inputText,
        output: result,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      setOutputText(`错误: ${e.message}\n\n请检查 Ollama 服务是否运行中`);
    }
    setIsLoading(false);
  };

  const handleChatSubmit = async () => {
    if (!inputText.trim() || !selectedModel) return;
    const userMsg = { role: 'user', content: inputText, lang: sourceLang };
    setChatHistory(prev => [...prev, userMsg]);
    const textToTranslate = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const prompt = buildPrompt(textToTranslate);
      const result = await callOllama(prompt);
      const assistantMsg = { role: 'assistant', content: result, lang: targetLang, model: selectedModel };
      setChatHistory(prev => [...prev, assistantMsg]);
      addHistoryItem({
        id: Date.now(),
        mode,
        sourceLang,
        targetLang,
        model: selectedModel,
        input: textToTranslate,
        output: result,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      const errorMsg = { role: 'assistant', content: `错误: ${e.message}`, lang: targetLang, error: true };
      setChatHistory(prev => [...prev, errorMsg]);
    }
    setIsLoading(false);
  };

  const extractPdfText = async (file) => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error('缺少 pdfjsLib 解析库');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    return text.trim();
  };

  const extractDocxText = async (file) => {
    const mammoth = (window as any).mammoth;
    if (!mammoth) throw new Error('缺少 mammoth 解析库');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setIsLoading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let text = '';
      if (ext === 'pdf') {
        text = await extractPdfText(file);
      } else if (ext === 'doc' || ext === 'docx') {
        text = await extractDocxText(file);
      } else {
        text = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsText(file);
        });
      }
      setInputText(text);
    } catch (err) {
      setInputText(`文件解析失败: ${err.message}`);
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text || outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setUploadedFile(null);
    setChatHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
              <Languages className="w-7 h-7 text-blue-400" />
              Ollama Translator
            </h1>
            <p className="text-slate-400 text-sm mt-1">本地多模型翻译工具</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-600' : 'bg-slate-700/80 hover:bg-slate-700'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-slate-800/70 rounded-xl border border-slate-700/50 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Server className="w-4 h-4" />
              Ollama 配置
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">连接状态</label>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'ok' && (
                    <span className="text-emerald-400 text-sm">已连接</span>
                  )}
                  {connectionStatus === 'empty' && (
                    <span className="text-amber-400 text-sm">已连接（无模型）</span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="text-red-400 text-sm">连接失败：{connectionError}</span>
                  )}
                  {connectionStatus === 'idle' && (
                    <span className="text-slate-400 text-sm">未检查</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">选择模型</label>
                <div className="flex gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {models.length === 0 && <option value="">未找到模型</option>}
                    {models.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={fetchModels}
                    disabled={loadingModels}
                    className="px-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={testOpenAIConnection}
                    disabled={testingModel || !selectedModel?.trim()}
                    className="px-3 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 rounded-lg transition-colors text-sm"
                  >
                    {testingModel ? '测试中' : '测试接口'}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 text-xs ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">翻译场景</label>
              <div className="text-sm text-slate-300">
                {mode === 'chat' ? '常规对话翻译（流利自然）' : '合同等文件翻译（正式严谨）'}
              </div>
            </div>
          </div>
        )}

        {/* Model Badge & Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {connectionStatus === 'ok' && selectedModel && (
              <span className="px-3 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded-full border border-emerald-600/30">
                已连接模型：{selectedModel}
              </span>
            )}
            {connectionStatus === 'empty' && (
              <span className="px-3 py-1 bg-amber-600/20 text-amber-400 text-xs rounded-full border border-amber-600/30">
                已连接（无模型）
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="px-3 py-1 bg-red-600/20 text-red-400 text-xs rounded-full border border-red-600/30">
                未连接 Ollama
              </span>
            )}
          </div>
          <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
            <button
              onClick={() => setMode('chat')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mode === 'chat' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              对话
            </button>
            <button
              onClick={() => setMode('document')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mode === 'document' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              文档
            </button>
          </div>
        </div>

        {/* History */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-slate-300 hover:text-white">
              历史记录 {showHistory ? '▲' : '▼'}
            </button>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-400">清空</button>
            )}
          </div>
          {showHistory && (
            <div className="mt-2 max-h-40 overflow-auto border border-slate-700/50 rounded-lg">
              {history.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500">暂无记录</div>
              )}
              {history.map(item => (
                <div key={item.id} className="px-3 py-2 text-xs text-slate-300 border-b border-slate-700/40 hover:bg-slate-800/50 cursor-pointer" onClick={() => restoreHistoryItem(item)}>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{item.mode === 'chat' ? '对话' : '文档'}</span>
                    <span>{item.sourceLang} → {item.targetLang}</span>
                    {item.model && <span className="text-emerald-400">{item.model}</span>}
                  </div>
                  <div className="text-slate-500 truncate">{item.input}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="bg-slate-700/80 border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <button onClick={swapLanguages} className="p-2.5 bg-slate-700/80 rounded-lg hover:bg-slate-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-slate-700/80 border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        {mode === 'chat' ? (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-500 py-16">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>输入文本开始翻译对话</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.role === 'user' ? 'bg-blue-600 rounded-br-md' : msg.error ? 'bg-red-900/50 rounded-bl-md' : 'bg-slate-700 rounded-bl-md'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-300">
                        {msg.role === 'user' ? `原文 (${msg.lang})` : `翻译 (${msg.lang})`}
                      </span>
                      {msg.model && <span className="text-xs text-slate-500">{msg.model}</span>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-slate-700/50 p-4">
              <div className="flex gap-3">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChatSubmit())}
                  placeholder="输入要翻译的文本..."
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  rows={2}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!inputText.trim() || isLoading || !selectedModel}
                  className="px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">原文</span>
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.json,.csv,.srt,.vtt,.pdf,.doc,.docx" className="hidden" />
                  <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                    <Upload className="w-3.5 h-3.5" />上传
                  </button>
                  {(inputText || uploadedFile) && (
                    <button onClick={clearAll} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {uploadedFile && (
                <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-700/50 flex items-center gap-2 text-sm text-slate-300">
                  <FileText className="w-4 h-4" />{uploadedFile.name}
                </div>
              )}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="粘贴文本或上传文档..."
                className="w-full h-64 bg-transparent p-4 text-sm resize-none focus:outline-none placeholder-slate-500"
              />
              <div className="px-4 py-3 border-t border-slate-700/50">
                <button
                  onClick={handleTranslate}
                  disabled={!inputText.trim() || isLoading || !selectedModel}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />翻译中...</> : <><Languages className="w-4 h-4" />开始翻译</>}
                </button>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">译文</span>
                {outputText && (
                  <button onClick={() => copyToClipboard()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                )}
              </div>
              <div className="h-72 overflow-y-auto p-4">
                {outputText ? (
                  <p className="text-sm whitespace-pre-wrap">{outputText}</p>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <p>译文将在这里显示</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
