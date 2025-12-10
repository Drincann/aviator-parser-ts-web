import { useState, useRef } from 'react';
import Editor, { type OnMount } from "@monaco-editor/react";
import { AviatorScript, StaticAnalyzer } from 'aviator-parser';
import { Terminal, Play, AlertCircle } from 'lucide-react';

// Type definitions for Monaco
type Monaco = typeof import('monaco-editor');

function App() {
  const [code, setCode] = useState<string>(`## Welcome to AviatorScript Web Runtime
## This is a pure JS implementation of AviatorScript

let a = 1;
let b = 2;
p("Hello, World!");
p("a + b = " + (a + b));

## Try defining a function
fn add(x, y) {
  return x + y;
}

p("Function call result: " + add(10, 20));

## Try some loop
for i in range(0, 5) {
  p("Loop " + i);
}
`);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Aviator Language
    monaco.languages.register({ id: 'aviator' });
    monaco.languages.setMonarchTokensProvider('aviator', {
      tokenizer: {
        root: [
          [/#.*/, 'comment'],
          [/"(?:[^"\\]|\\.)*"/, 'string'],
          [/'(?:[^'\\]|\\.)*'/, 'string'],
          [/\b(?:let|if|else|for|while|fn|return|break|continue|true|false|nil)\b/, 'keyword'],
          [/\b(?:println|print|p|count|is_def|type|long|double|str|boolean|range|tuple)\b/, 'predefined'],
          [/[0-9]+/, 'number'],
        ]
      }
    });

    // Initial analysis
    analyzeCode(code, editor, monaco);
  };

  const analyzeCode = (value: string, editor: any, monaco: Monaco) => {
    try {
      const analyzer = new StaticAnalyzer();
      const diagnostics = analyzer.analyze(value);
      
      const markers = diagnostics.map(d => ({
        startLineNumber: d.line,
        startColumn: 1,
        endLineNumber: d.line,
        endColumn: 1000,
        message: d.message,
        severity: d.severity === 1 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      }));

      monaco.editor.setModelMarkers(editor.getModel(), 'aviator', markers);
    } catch (e) {
      console.error("Analysis failed", e);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (editorRef.current && monacoRef.current) {
        analyzeCode(value, editorRef.current, monacoRef.current);
      }
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput([]); // Clear previous output
    
    // Allow UI to update before running heavy script
    setTimeout(() => {
      try {
        const aviator = new AviatorScript();
        const currentOutput: string[] = [];
        
        // Custom context to capture output
        const context = {
          print: (msg: any) => currentOutput.push(String(msg)),
          println: (msg: any) => currentOutput.push(String(msg)),
          p: (msg: any) => currentOutput.push(String(msg)),
        };

        const result = aviator.execute(code, context);
        
        setOutput([...currentOutput, `\nResult: ${result}`]);
      } catch (e: any) {
        setOutput(prev => [...prev, `\nError: ${e.message}`]);
      } finally {
        setIsRunning(false);
      }
    }, 10);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>AviatorScript Web</h1>
          <span className="version-badge">v0.3.3</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#888' }}>
            JS Runtime for <a href="https://github.com/killme2008/aviatorscript" target="_blank">AviatorScript</a>
          </span>
          <a href="https://github.com/Drincann/aviator-parser" target="_blank">GitHub</a>
        </div>
      </header>

      <main className="main-container">
        <div className="editor-container">
          <div className="toolbar">
            <button onClick={runCode} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={16} /> Run
            </button>
            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: 'auto' }}>
              Changes are statically analyzed in real-time
            </span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="aviator"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fixedOverflowWidgets: true,
            }}
          />
        </div>

        <div className="output-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#888', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
            <Terminal size={16} />
            <span>Output</span>
          </div>
          <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {output.length === 0 ? (
              <span style={{ color: '#555' }}>Run the code to see output...</span>
            ) : (
              output.map((line, i) => (
                <div key={i} className="output-line">
                  {line.startsWith('Error:') ? (
                    <span className="output-error"><AlertCircle size={12} style={{display:'inline', marginRight: 4}}/>{line}</span>
                  ) : line.startsWith('\nResult:') ? (
                     <span className="output-result">{line.trim()}</span>
                  ) : (
                    line
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
