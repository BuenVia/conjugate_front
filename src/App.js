import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function flattenConjugations(data) {
  const questions = [];
  for (const verbData of data) {
    for (const mood of verbData.moods) {
      for (const tense of mood.tenses) {
        for (const conj of tense.conjugations) {
          questions.push({
            infinitive: verbData.verb.infinitive,
            person: conj.person,
            mood: mood.name,
            tense: tense.name,
            answer: conj.value,
          });
        }
      }
    }
  }
  return shuffle(questions);
}

function App() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const [verbs, setVerbs] = useState([]);
  const [selectedVerbIds, setSelectedVerbIds] = useState(new Set());
  const [moods, setMoods] = useState([]);
  const [tenses, setTenses] = useState([]);
  const [selectedTenseIds, setSelectedTenseIds] = useState(new Set());
  const [updating, setUpdating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verbModalOpen, setVerbModalOpen] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [verbsRes, tensesRes, moodsRes] = await Promise.all([
          fetch(`${API_BASE}/verbs`),
          fetch(`${API_BASE}/tenses`),
          fetch(`${API_BASE}/moods`),
        ]);
        const verbsData = await verbsRes.json();
        const tensesData = await tensesRes.json();
        const moodsData = await moodsRes.json();

        const allVerbs = verbsData.data;
        const ids = allVerbs.map(v => v.id).join(',');
        const allTenses = tensesData.data;
        const allTenseIds = new Set(allTenses.map(t => t.id));
        const allVerbIds = new Set(allVerbs.map(v => v.id));

        setVerbs(allVerbs);
        setSelectedVerbIds(allVerbIds);
        setTenses(allTenses);
        setMoods(moodsData.data);
        setSelectedTenseIds(allTenseIds);

        const conjRes = await fetch(
          `${API_BASE}/conjugations?verb=${ids}&tense=${[...allTenseIds].join(',')}`
        );
        const conjData = await conjRes.json();
        setQuestions(flattenConjugations(conjData.data));
      } catch {
        setError('Failed to load data. Is the API running?');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!loading && !updating && inputRef.current) inputRef.current.focus();
  }, [loading, updating, currentIndex]);

  function toggleVerb(id) {
    setSelectedVerbIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTense(id) {
    setSelectedTenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleUpdate() {
    setSidebarOpen(false);
    setVerbModalOpen(false);
    setUpdating(true);
    try {
      const conjRes = await fetch(
        `${API_BASE}/conjugations?verb=${[...selectedVerbIds].join(',')}&tenses=${[...selectedTenseIds].join(',')}`
      );
      const conjData = await conjRes.json();
      setQuestions(flattenConjugations(conjData.data));
      setCurrentIndex(0);
      setUserInput('');
      setStatus('idle');
    } catch {
      setError('Failed to reload conjugations.');
    } finally {
      setUpdating(false);
    }
  }

  const tensesByMoodId = tenses.reduce((acc, tense) => {
    const key = tense.mood_id ?? 'other';
    (acc[key] ??= []).push(tense);
    return acc;
  }, {});

  const currentQuestion = questions[currentIndex];

  function handleNext() {
    if (status === 'correct') {
      setStatus('idle');
      setUserInput('');
      setCurrentIndex(i => i + 1);
      return;
    }
    if (!userInput.trim()) return;
    if (userInput === currentQuestion.answer) {
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

  const verbMenuButton = (
    <button
      className="btn btn-sm verb-menu-btn"
      onClick={() => setVerbModalOpen(true)}
      disabled={updating}
    >
      Verbs
      {selectedVerbIds.size < verbs.length && (
        <span className="verb-count-badge ms-1">{selectedVerbIds.size}/{verbs.length}</span>
      )}
    </button>
  );

  const verbModal = verbModalOpen && (
    <>
      <div className="modal-backdrop fade show" onClick={() => setVerbModalOpen(false)} />
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content verb-modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Verbs</h5>
              <button type="button" className="btn-close" onClick={() => setVerbModalOpen(false)} />
            </div>
            <div className="modal-body">
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
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setVerbModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUpdate}
                disabled={updating || selectedVerbIds.size === 0}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const appHeader = (
    <header className="navbar app-header px-3 py-2">
      <div className="header-left d-flex align-items-center">
        <button
          className="btn btn-outline-secondary btn-sm d-md-none me-2"
          onClick={() => setSidebarOpen(true)}
        >
          &#9776;
        </button>
        <span className="navbar-brand fw-bold mb-0 conjugate-title">CONJUGATE</span>
      </div>
      <div className="flex-grow-1 d-flex justify-content-center">
        {!loading && !error && verbMenuButton}
      </div>
      <div className="header-right" />
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

  const sidebar = (
    <nav className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-3 d-md-none">
        <span className="fw-semibold">Tenses</span>
        <button
          className="btn-close"
          aria-label="Close"
          onClick={() => setSidebarOpen(false)}
        />
      </div>
      <p className="sidebar-section-label d-none d-md-block">Tenses</p>

      {moods.map(mood => {
        const moodTenses = tensesByMoodId[mood.id] || [];
        if (moodTenses.length === 0) return null;
        return (
          <div key={mood.id} className="mb-3">
            <p className="sidebar-mood-label">{mood.name}</p>
            {moodTenses.map(tense => (
              <div key={tense.id} className="form-check ms-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`tense-${tense.id}`}
                  checked={selectedTenseIds.has(tense.id)}
                  onChange={() => toggleTense(tense.id)}
                  disabled={updating}
                />
                <label className="form-check-label" htmlFor={`tense-${tense.id}`}>
                  {tense.name}
                </label>
              </div>
            ))}
          </div>
        );
      })}

      {(tensesByMoodId['other'] || []).length > 0 && (
        <div className="mb-3">
          <p className="sidebar-mood-label">Other</p>
          {tensesByMoodId['other'].map(tense => (
            <div key={tense.id} className="form-check ms-1">
              <input
                className="form-check-input"
                type="checkbox"
                id={`tense-${tense.id}`}
                checked={selectedTenseIds.has(tense.id)}
                onChange={() => toggleTense(tense.id)}
                disabled={updating}
              />
              <label className="form-check-label" htmlFor={`tense-${tense.id}`}>
                {tense.name}
              </label>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-secondary btn-sm w-100 mt-2"
        onClick={handleUpdate}
        disabled={updating || selectedTenseIds.size === 0}
      >
        {updating ? 'Updating...' : 'Update'}
      </button>
    </nav>
  );

  const quizBody = currentIndex >= questions.length ? (
    <p>{questions.length === 0 ? 'No conjugations found.' : 'All done!'}</p>
  ) : (
    <>
      <div className="text-center">
        <p className="fs-2 fw-bold mb-0">{currentQuestion?.infinitive}</p>
        <p className="text-muted mt-2 mb-0">
          {currentQuestion?.mood} &middot; {currentQuestion?.tense} &middot; {currentQuestion?.person}
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
          disabled={status === 'correct' || updating}
          placeholder="Enter conjugation"
        />
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={(status !== 'correct' && !userInput.trim()) || updating}
        >
          Next
        </button>
      </div>

      {status === 'correct' && (
        <p className="fw-bold text-success mb-0">Correct!</p>
      )}
      {status === 'incorrect' && (
        <p className="fw-bold text-danger mb-0">Incorrect, try again.</p>
      )}

      <p className="small text-muted mb-0">{currentIndex + 1} / {questions.length}</p>
    </>
  );

  return (
    <div className="d-flex flex-column min-vh-100">
      {verbModal}
      {appHeader}

      <div className="app-layout flex-grow-1">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}
        {sidebar}
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
