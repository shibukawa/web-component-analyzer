import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ThemeDecorations } from './components/ThemeDecorations';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemedMonacoEditor } from './components/ThemedMonacoEditor';
import { MermaidDiagram } from './components/MermaidDiagram';
import { Header } from './components/Header';
import { SplitPane } from './components/SplitPane';
import { EditorPane } from './components/EditorPane';
import { VisualizationPane } from './components/VisualizationPane';
import { SampleSelector } from './components/SampleSelector';
import { ShareButton } from './components/ShareButton';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useURLState } from './hooks/useURLState';
import { analyzeComponent, type Framework } from './services/analyzer';
import { transformToMermaid } from './services/mermaidTransformer';
import { ALL_SAMPLES, type SampleComponent } from './data/samples';

function AppContent() {
  const { theme, themeMode } = useTheme();
  
  // Task 10.1: Set up App state management
  const [code, setCode] = useState('');
  const [framework, setFramework] = useState<Framework>('react');
  const [language, setLanguage] = useState<'typescript' | 'vue' | 'svelte'>('typescript');
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSampleId, setCurrentSampleId] = useState<string | undefined>(undefined);

  // Task 10.2: Integrate URL state on mount
  const { initialState, error: urlError, isLoading: isLoadingURL } = useURLState();

  // Load initial state from URL or default sample
  useEffect(() => {
    if (isLoadingURL) {
      return;
    }

    if (urlError) {
      // Handle URL decoding errors
      setError(urlError);
      console.error('URL state error:', urlError);
      // Fall back to empty editor
      setCode('');
      return;
    }

    if (initialState) {
      // Populate editor with restored code from URL
      setCode(initialState.code);
      if (initialState.framework) {
        setFramework(initialState.framework);
        // Map framework to language
        const languageMap: Record<Framework, 'typescript' | 'vue' | 'svelte'> = {
          react: 'typescript',
          vue: 'vue',
          svelte: 'svelte'
        };
        setLanguage(languageMap[initialState.framework]);
      }
      setCurrentSampleId(undefined); // Clear sample selection when loading from URL
    } else {
      // Load first sample as default
      if (ALL_SAMPLES.length > 0) {
        const firstSample = ALL_SAMPLES[0];
        setCode(firstSample.code);
        setFramework(firstSample.framework);
        setLanguage(firstSample.framework === 'react' ? 'typescript' : firstSample.framework);
        setCurrentSampleId(firstSample.id);
      }
    }
  }, [initialState, urlError, isLoadingURL]);

  // Debounce code changes to avoid excessive analysis
  const debouncedCode = useDebouncedValue(code, 300);

  // Log when code or debouncedCode changes
  useEffect(() => {
    console.log('=== CODE STATE CHANGED ===');
    console.log('Code length:', code.length);
    console.log('Code preview (first 100 chars):', code.substring(0, 100));
  }, [code]);

  useEffect(() => {
    console.log('=== DEBOUNCED CODE CHANGED ===');
    console.log('Debounced code length:', debouncedCode.length);
    console.log('Debounced code preview (first 100 chars):', debouncedCode.substring(0, 100));
  }, [debouncedCode]);

  // Analyze component when code changes
  useEffect(() => {
    const analyze = async () => {
      console.log('=== STARTING ANALYSIS ===');
      console.log('Framework:', framework);
      console.log('Debounced code length:', debouncedCode.length);
      console.log('Full code being analyzed:');
      console.log(debouncedCode);
      console.log('=== END OF CODE ===');
      
      // Skip analysis for empty code
      if (!debouncedCode || debouncedCode.trim().length === 0) {
        console.log('Skipping analysis: empty code');
        setMermaidCode('');
        setError(null);
        return;
      }

      setIsAnalyzing(true);
      setError(null);

      try {
        // Analyze the component
        const result = await analyzeComponent(debouncedCode, framework);

        if (result.success && result.dfdData) {
          // Transform DFD data to Mermaid code with theme mode
          console.log('=== THEME MODE ===');
          console.log('Current theme mode:', themeMode);
          const mermaid = transformToMermaid(result.dfdData, themeMode);
          console.log('=== ANALYSIS SUCCESS ===');
          console.log('Mermaid code length:', mermaid.length);
          console.log('Full Mermaid code:');
          console.log(mermaid);
          console.log('=== END OF MERMAID CODE ===');
          setMermaidCode(mermaid);
          setError(null);
        } else {
          console.log('=== ANALYSIS FAILED ===');
          console.log('Error:', result.error);
          setMermaidCode('');
          setError(result.error || 'Analysis failed');
        }
      } catch (err) {
        console.error('=== ANALYSIS EXCEPTION ===');
        console.error('Error:', err);
        setMermaidCode('');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyze();
  }, [debouncedCode, framework, themeMode]);

  // Handle sample selection
  const handleSampleSelect = (sample: SampleComponent) => {
    console.log('=== SAMPLE SELECTED ===');
    console.log('Sample ID:', sample.id);
    console.log('Framework:', sample.framework);
    console.log('Code length:', sample.code.length);
    console.log('Code preview (first 100 chars):', sample.code.substring(0, 100));
    setCode(sample.code);
    setFramework(sample.framework);
    setLanguage(sample.framework === 'react' ? 'typescript' : sample.framework);
    setCurrentSampleId(sample.id);
  };

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setCurrentSampleId(undefined); // Clear sample selection when user edits code
  };

  // Task 10.3: Wire up all components
  return (
    <>
      <ThemeDecorations />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header>
          <ThemeToggle />
          <ShareButton code={code} framework={framework} />
        </Header>
        
        <div style={{ marginTop: '60px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SplitPane
          left={
            <EditorPane>
              <SampleSelector
                samples={ALL_SAMPLES}
                currentSampleId={currentSampleId}
                onSelect={handleSampleSelect}
              />
              <div style={{ flex: 1, marginTop: '16px', minHeight: 0 }}>
                <ThemedMonacoEditor
                  value={code}
                  onChange={handleCodeChange}
                  language={language}
                />
              </div>
            </EditorPane>
          }
          right={
            <VisualizationPane>
              <h2 style={{ margin: '0 0 20px 0' }}>Component DFD</h2>
              {isAnalyzing && <LoadingIndicator />}
              {!isAnalyzing && error && <ErrorDisplay error={error} type="parse" />}
              {!isAnalyzing && !error && mermaidCode && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <MermaidDiagram code={mermaidCode} theme={theme} />
                </div>
              )}
              {!isAnalyzing && !error && !mermaidCode && (
                <div style={{
                  padding: '40px',
                  color: 'var(--color-foreground)',
                  opacity: 0.7,
                  textAlign: 'center',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
                  <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Welcome to Component Analyzer</h3>
                  <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                    Select a sample component from the dropdown above, or paste your own React, Vue, or Svelte code into the editor.
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.8, lineHeight: '1.5' }}>
                    The diagram will show data flow between props, state, processes, and outputs in your component.
                  </p>
                </div>
              )}
            </VisualizationPane>
          }
          />
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
