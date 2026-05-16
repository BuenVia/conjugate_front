import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DEFAULT_TENSE_NAMES = ['Presente', 'Pretérito Indefinido', 'Pretérito Imperfecto', 'Futuro Simple'];
const DEFAULT_MOOD_NAME = 'Indicativo';

function App() {
  const [verbs, setVerbs] = useState([]);
  const [tenses, setTenses] = useState([]);
  const [allPronounIds, setAllPronounIds] = useState([]);
  const [selectedVerbIds, setSelectedVerbIds] = useState(new Set());
  const [selectedTenseIds, setSelectedTenseIds] = useState(new Set());

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'quiz'
  const [submitting, setSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const [verbsRes, tensesRes, pronounsRes] = await Promise.all([
          fetch(`${API_BASE}/verbs`),
          fetch(`${API_BASE}/tenses`),
          fetch(`${API_BASE}/pronouns`),
        ]);
        const verbsData = await verbsRes.json();
        const tensesData = await tensesRes.json();
        const pronounsData = await pronounsRes.json();

        const allVerbs = verbsData.data;
        const allTenses = tensesData.data;
        const allPronouns = pronounsData.data;

        setVerbs(allVerbs);
        setTenses(allTenses);
        setAllPronounIds(allPronouns.map(p => p.id));
        setSelectedVerbIds(new Set(allVerbs.map(v => v.id)));
        setSelectedTenseIds(new Set(
          allTenses
            .filter(t => t.mood_name === DEFAULT_MOOD_NAME && DEFAULT_TENSE_NAMES.includes(t.name))
            .map(t => t.id)
        ));
      } catch {
        setError('Failed to load data. Is the API running?');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (phase === 'quiz' && !submitting && inputRef.current) inputRef.current.focus();
  }, [phase, submitting, currentIndex]);

  function toggleVerb(id) {
    setSelectedVerbIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVerbs() {
    setSelectedVerbIds(prev => prev.size > 0 ? new Set() : new Set(verbs.map(v => v.id)));
  }

  function toggleTense(id) {
    setSelectedTenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllTenses() {
    setSelectedTenseIds(prev => prev.size > 0 ? new Set() : new Set(tenses.map(t => t.id)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const params = new URLSearchParams({
        verbs: [...selectedVerbIds].join(','),
        tenses: [...selectedTenseIds].join(','),
        pronouns: allPronounIds.join(','),
      });
      const res = await fetch(`${API_BASE}/practice?${params}`);
      const data = await res.json();
      setQuestions(data.data);
      setCurrentIndex(0);
      setUserInput('');
      setStatus('idle');
      setPhase('quiz');
      setSettingsOpen(false);
    } catch {
      setError('Failed to load practice questions.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (status === 'correct') {
      setStatus('idle');
      setUserInput('');
      setCurrentIndex(i => i + 1);
      return;
    }
    if (!userInput.trim()) return;
    const currentQuestion = questions[currentIndex];
    if (userInput === currentQuestion.conjugation) {
      setStatus('correct');
    } else {
      setStatus('incorrect');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleNext();
  }

  function handleInputChange(e) {
    setUserInput(e.target.value);
    if (status === 'incorrect') setStatus('idle');
  }

  const tensesByMood = tenses.reduce((acc, tense) => {
    const key = tense.mood_id ?? 'other';
    if (!acc[key]) acc[key] = { moodName: tense.mood_name || 'Other', tenses: [] };
    acc[key].tenses.push(tense);
    return acc;
  }, {});

  const selectionContent = (
    <div className="row g-4">
      <div className="col-6">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold">Verbs</h6>
          <button className="btn btn-sm verb-menu-btn" onClick={toggleAllVerbs}>
            {selectedVerbIds.size > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="selection-list">
          {verbs.map(verb => (
            <div key={verb.id} className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id={`verb-${verb.id}`}
                checked={selectedVerbIds.has(verb.id)}
                onChange={() => toggleVerb(verb.id)}
              />
              <label className="form-check-label" htmlFor={`verb-${verb.id}`}>
                {verb.infinitive}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="col-6">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold">Tenses</h6>
          <button className="btn btn-sm verb-menu-btn" onClick={toggleAllTenses}>
            {selectedTenseIds.size > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="selection-list">
          {Object.entries(tensesByMood).map(([moodId, { moodName, tenses: moodTenses }]) => (
            <div key={moodId} className="mb-3">
              <p className="small fw-semibold mb-2 mood-heading">{moodName}</p>
              {moodTenses.map(tense => (
                <div key={tense.id} className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`tense-${tense.id}`}
                    checked={selectedTenseIds.has(tense.id)}
                    onChange={() => toggleTense(tense.id)}
                  />
                  <label className="form-check-label" htmlFor={`tense-${tense.id}`}>
                    {tense.name}
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const appHeader = (
    <header className="navbar app-header px-3 py-2">
      <span className="navbar-brand fw-bold mb-0 conjugate-title">CONJUGATE</span>
      <div className="flex-grow-1" />
      {phase === 'quiz' && (
        <button className="btn btn-sm verb-menu-btn" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      )}
    </header>
  );

  if (loading) {
    return (
      <div className="d-flex flex-column min-vh-100">
        {appHeader}
        <div className="d-flex flex-grow-1 align-items-center justify-content-center">
          <p className="text-body-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column min-vh-100">
        {appHeader}
        <div className="d-flex flex-grow-1 align-items-center justify-content-center">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="d-flex flex-column min-vh-100">
        {appHeader}
        <div className="app-layout flex-grow-1">
          <div className="main-content">
            <div className="card setup-card">
              <div className="card-body p-4">
                <h5 className="fw-semibold mb-4">Choose what to practice</h5>
                {selectionContent}
                <div className="mt-4 d-flex justify-content-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting || selectedVerbIds.size === 0 || selectedTenseIds.size === 0}
                  >
                    {submitting ? 'Loading...' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const settingsModal = settingsOpen && (
    <>
      <div className="modal-backdrop fade show" onClick={() => setSettingsOpen(false)} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered modal-lg">
          <div className="modal-content verb-modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Settings</h5>
              <button type="button" className="btn-close" onClick={() => setSettingsOpen(false)} />
            </div>
            <div className="modal-body">
              {selectionContent}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={submitting || selectedVerbIds.size === 0 || selectedTenseIds.size === 0}
              >
                {submitting ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const quizBody = currentIndex >= questions.length ? (
    <p>{questions.length === 0 ? 'No questions found.' : 'All done!'}</p>
  ) : (
    <>
      <div className="text-center">
        <p className="fs-2 fw-bold mb-0">{currentQuestion?.infinitive ?? currentQuestion?.infinite}</p>
        <p className="text-muted mt-2 mb-0">
          {currentQuestion?.mood} &middot; {currentQuestion?.tense} &middot; {currentQuestion?.pronoun}
        </p>
      </div>

      <div className="d-flex gap-2">
        <input
          ref={inputRef}
          className="form-control"
          type="text"
          value={userInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={status === 'correct' || submitting}
          placeholder="Enter conjugation"
        />
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={(status !== 'correct' && !userInput.trim()) || submitting}
        >
          Next
        </button>
      </div>

      {status === 'correct' && <p className="fw-bold text-success mb-0">Correct!</p>}
      {status === 'incorrect' && <p className="fw-bold text-danger mb-0">Incorrect, try again.</p>}

      <p className="small text-muted mb-0">{currentIndex + 1} / {questions.length}</p>
    </>
  );

  return (
    <div className="d-flex flex-column min-vh-100">
      {settingsModal}
      {appHeader}
      <div className="app-layout flex-grow-1">
        <div className="main-content">
          <div className="card quiz-card" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="card-body d-flex flex-column align-items-center gap-4 p-4">
              {quizBody}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
