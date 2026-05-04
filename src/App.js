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

  const [tenses, setTenses] = useState([]);
  const [selectedTenseIds, setSelectedTenseIds] = useState(new Set());
  const [verbIds, setVerbIds] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [verbsRes, tensesRes] = await Promise.all([
          fetch(`${API_BASE}/verbs`),
          fetch(`${API_BASE}/tenses`),
        ]);
        const verbsData = await verbsRes.json();
        const tensesData = await tensesRes.json();

        const ids = verbsData.data.map(v => v.id).join(',');
        const allTenses = tensesData.data;
        const allTenseIds = new Set(allTenses.map(t => t.id));

        setVerbIds(ids);
        setTenses(allTenses);
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

  function toggleTense(id) {
    setSelectedTenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleUpdate() {
    setUpdating(true);
    try {
      const conjRes = await fetch(
        `${API_BASE}/conjugations?verb=${verbIds}&tenses=${[...selectedTenseIds].join(',')}`
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

  if (loading) {
    return (
      <div className="app">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const tenseFilter = (
    <div className="mb-2">
      <div className="d-flex flex-wrap gap-3 justify-content-center mb-3">
        {tenses.map(tense => (
          <div key={tense.id} className="form-check">
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
      <button
        className="btn btn-secondary btn-sm"
        onClick={handleUpdate}
        disabled={updating || selectedTenseIds.size === 0}
      >
        {updating ? 'Updating...' : 'Update'}
      </button>
    </div>
  );

  if (currentIndex >= questions.length) {
    return (
      <div className="app">
        <header className="mb-4">
          <h1 className="fs-4">Conjugate!</h1>
        </header>
        <main className="d-flex flex-column align-items-center gap-4">
          {tenseFilter}
          <p>{questions.length === 0 ? 'No conjugations found.' : 'All done!'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="mb-4">
        <h1 className="fs-4">Conjugate!</h1>
      </header>
      <main className="d-flex flex-column align-items-center gap-4">
        {tenseFilter}

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
      </main>
    </div>
  );
}

export default App;
