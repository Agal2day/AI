import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Upload, Settings, Play, Terminal, Loader2, Image as ImageIcon, FileText, Send } from 'lucide-react';
import { analyzeImage, analyzeText, AIConfig, DEFAULT_CONFIG } from './services/ai';

function App() {
  const [code, setCode] = useState('// 等待 AI 解析...');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // AI 相关状态
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    // 使用 v4 key 以便强制更新用户的配置为最新的配置 (用户指定 URL)
    const saved = localStorage.getItem('ai_config_v4');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [inputText, setInputText] = useState('');
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [complexity, setComplexity] = useState<{time: string, space: string} | null>(null);
  const [detectedType, setDetectedType] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState('javascript');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
      
      // 自动开始分析
      startAnalysis(file);
    }
  };

  const handleTextAnalysis = async () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisStatus('正在思考...');
    setAiExplanation('');
    setComplexity(null);
    setDetectedType(undefined);
    
    try {
      const result = await analyzeText(inputText, aiConfig, (status) => setAnalysisStatus(status));
      setCode(result.code);
      setAiExplanation(result.explanation);
      if (result.complexity) {
        setComplexity(result.complexity);
      }
      setDetectedType(result.type);
      if (result.language) {
        setLanguage(result.language);
      }
    } catch (err: any) {
      setAiExplanation(`❌ 分析失败: ${err.message}\n\n请检查 API Key 配置。`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const startAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisStatus('准备上传...');
    setAiExplanation('');
    setComplexity(null);
    setDetectedType(undefined);
    
    try {
      const result = await analyzeImage(file, aiConfig, (status) => setAnalysisStatus(status));
      setCode(result.code);
      setAiExplanation(result.explanation);
      if (result.complexity) {
        setComplexity(result.complexity);
      }
      setDetectedType(result.type);
      if (result.language) {
        setLanguage(result.language);
      }
    } catch (err: any) {
      setAiExplanation(`❌ 分析失败: ${err.message}\n\n可能原因：\n1. API Key 配置错误\n2. 当前模型不支持图片识别 (如 DeepSeek 不支持图片，请使用 GPT-4o)`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const saveConfig = (config: AIConfig) => {
    localStorage.setItem('ai_config_v4', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  const runCode = async () => {
    setLogs([]);
    setError(null);
    
    // Electron 环境下支持多语言运行
    if ((window as any).electronAPI) {
        setLogs(['⏳ 正在调用本地编译器...', `🚀 开始执行 ${language} 代码...`]);
        try {
            const result = await (window as any).electronAPI.runCode(language, code);
            
            // 清除之前的等待日志
            setLogs([]);
            
            if (result.output) {
                const lines = result.output.split('\n');
                setLogs(prev => [...prev, ...lines]);
            }
            
            if (result.error) {
                setError(result.error);
            } else if (!result.output) {
                 setLogs(prev => [...prev, '✅ 执行完成，无输出']);
            }
        } catch (e: any) {
            setError('执行失败: ' + e.toString());
        }
        return;
    }

    if (language !== 'javascript') {
        setError('Web 预览版仅支持 JavaScript。请使用桌面版运行其他语言。');
        return;
    }

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const capturedLogs: string[] = [];
    
    const logWrapper = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      capturedLogs.push(message);
      setLogs(prev => [...prev, message]);
    };

    console.log = logWrapper;
    console.error = logWrapper;
    console.warn = logWrapper;

    try {
      new Function(code)();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
        {/* 顶部导航 */}
        <header style={{ padding: '0 20px', height: '60px', backgroundColor: '#fff', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '8px', color: '#1976d2' }}>
                  <ImageIcon size={20} />
                </div>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#333' }}>AI 代码助手</h1>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f8f9fa',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="php">PHP</option>
                </select>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    style={{
                        backgroundColor: '#f1f3f5',
                        color: '#495057',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px'
                    }}
                >
                    <Settings size={16} /> 设置 API
                </button>
                <button 
                    onClick={runCode}
                    style={{
                        backgroundColor: '#2ecc71',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Play size={16} /> 运行代码
                </button>
            </div>
        </header>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* 左侧：上传与分析区 */}
            <div style={{ width: '400px', backgroundColor: '#fff', borderRight: '1px solid #dee2e6', display: 'flex', flexDirection: 'column' }}>
                
                {/* 模式切换 Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                    <button
                        onClick={() => setInputMode('image')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            backgroundColor: inputMode === 'image' ? '#fff' : '#f8f9fa',
                            borderBottom: inputMode === 'image' ? '2px solid #1976d2' : 'none',
                            color: inputMode === 'image' ? '#1976d2' : '#666',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <ImageIcon size={18} /> 图片识别
                    </button>
                    <button
                        onClick={() => setInputMode('text')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: 'none',
                            backgroundColor: inputMode === 'text' ? '#fff' : '#f8f9fa',
                            borderBottom: inputMode === 'text' ? '2px solid #1976d2' : 'none',
                            color: inputMode === 'text' ? '#1976d2' : '#666',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: '500'
                        }}
                    >
                        <FileText size={18} /> 代码/文本
                    </button>
                </div>

                {/* 输入区 */}
                <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                    {inputMode === 'image' ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed #ced4da',
                                borderRadius: '8px',
                                padding: '30px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                transition: 'all 0.2s',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#adb5bd' }}>
                                    <Upload size={32} />
                                    <span>点击或拖拽上传代码截图 / 报错信息 / 算法流程图</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="在此粘贴代码、报错信息、算法描述或问题..."
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #ced4da',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                onClick={handleTextAnalysis}
                                disabled={isAnalyzing || !inputText.trim()}
                                style={{
                                    backgroundColor: isAnalyzing || !inputText.trim() ? '#e9ecef' : '#1976d2',
                                    color: isAnalyzing || !inputText.trim() ? '#adb5bd' : 'white',
                                    border: 'none',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    cursor: isAnalyzing || !inputText.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: '500'
                                }}
                            >
                                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                开始分析
                            </button>
                        </div>
                    )}
                </div>

                {/* AI 分析结果 */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px', backgroundColor: '#fff' }}>
                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>🤖 AI 分析</h3>
                        {detectedType && (
                            <span style={{ 
                                fontSize: '12px', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                backgroundColor: detectedType === 'error' ? '#ffebee' : detectedType === 'flowchart' ? '#fff3e0' : '#e8f5e9',
                                color: detectedType === 'error' ? '#c62828' : detectedType === 'flowchart' ? '#ef6c00' : '#2e7d32',
                                border: '1px solid',
                                borderColor: detectedType === 'error' ? '#ffcdd2' : detectedType === 'flowchart' ? '#ffe0b2' : '#c8e6c9'
                            }}>
                                {detectedType === 'error' ? '🐞 报错分析' : detectedType === 'flowchart' ? '🔄 流程图转换' : '💻 代码分析'}
                            </span>
                        )}
                        {isAnalyzing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#1976d2', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '10px' }}>
                                <Loader2 size={12} className="animate-spin" />
                                {analysisStatus}
                            </div>
                        )}
                    </div>
                    
                    <div className="markdown-body" style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        {complexity && (
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                                    <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold', marginBottom: '4px' }}>⏱️ 时间复杂度</div>
                                    <div style={{ color: '#1b5e20', fontWeight: '500' }}>{complexity.time}</div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '6px', border: '1px solid #bbdefb' }}>
                                    <div style={{ fontSize: '12px', color: '#1565c0', fontWeight: 'bold', marginBottom: '4px' }}>💾 空间复杂度</div>
                                    <div style={{ color: '#0d47a1', fontWeight: '500' }}>{complexity.space}</div>
                                </div>
                            </div>
                        )}
                        {aiExplanation ? (
                            <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                        ) : (
                            <div style={{ color: '#adb5bd', fontSize: '14px', fontStyle: 'italic' }}>
                                上传图片（代码/报错/流程图）或输入文本后，AI 将自动分析内容、生成代码并计算复杂度。
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 右侧：编辑器与控制台 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ flex: 2, position: 'relative' }}>
                    <Editor
                        height="100%"
                        defaultLanguage={language === 'c' || language === 'cpp' ? 'cpp' : language}
                        language={language === 'c' || language === 'cpp' ? 'cpp' : language}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 20 },
                            fontFamily: "'Fira Code', monospace"
                        }}
                    />
                </div>
                {/* 控制台输出区 */}
                <div style={{ flex: 1, backgroundColor: '#1e1e1e', color: '#fff', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 15px', backgroundColor: '#252526', fontSize: '12px', color: '#ccc', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={12} /> 控制台 / Console
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '15px', fontFamily: 'monospace', fontSize: '13px' }}>
                        {logs.map((log, index) => (
                            <div key={index} style={{ marginBottom: '6px', borderBottom: '1px solid #33333330', paddingBottom: '4px' }}>
                                <span style={{ color: '#666', marginRight: '8px' }}>&gt;</span>{log}
                            </div>
                        ))}
                        {error && (
                            <div style={{ color: '#ff6b6b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                <span>❌</span> {error}
                            </div>
                        )}
                        {logs.length === 0 && !error && (
                            <div style={{ color: '#555', fontStyle: 'italic' }}>等待执行...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* 设置弹窗 */}
        {isSettingsOpen && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>⚙️ API 设置</h2>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>API Key</label>
                        <input 
                            type="password" 
                            value={aiConfig.apiKey}
                            onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
                            placeholder="sk-..."
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Base URL (可选)</label>
                        <input 
                            type="text" 
                            value={aiConfig.baseURL}
                            onChange={e => setAiConfig({...aiConfig, baseURL: e.target.value})}
                            placeholder="https://api.openai.com/v1"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Model</label>
                        <input 
                            type="text" 
                            value={aiConfig.model}
                            onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
                            placeholder="gpt-4o"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button 
                            onClick={() => {
                                setAiConfig(DEFAULT_CONFIG);
                                alert('已恢复默认设置');
                            }}
                            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#f8f9fa', color: '#666', cursor: 'pointer', marginRight: 'auto' }}
                        >
                            重置默认
                        </button>
                        <button 
                            onClick={() => setIsSettingsOpen(false)}
                            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}
                        >
                            取消
                        </button>
                        <button 
                            onClick={() => saveConfig(aiConfig)}
                            style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#1976d2', color: 'white', cursor: 'pointer' }}
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default App
