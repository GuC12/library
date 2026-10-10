import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Send, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { findGuideTopic, guideCopy, type GuideTopic } from '@/data/library-guide';
import ghost from '@/assets/library-ghost.svg';
import './library-guide.css';

type Exchange = { question: string; topic?: GuideTopic };
function wasHidden() {
  try { return window.sessionStorage.getItem('library-guide-hidden') === 'true'; }
  catch { return false; }
}

export function LibraryGuide({ openRequest, blocked }: { openRequest: number; blocked: boolean }) {
  const { language } = useLanguage();
  const copy = guideCopy[language];
  const [hidden, setHidden] = useState(wasHidden);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openRequest) return;
    setHidden(false);
    setOpen(true);
    try { window.sessionStorage.removeItem('library-guide-hidden'); } catch { /* Storage is optional. */ }
  }, [openRequest]);

  useEffect(() => {
    if (open && !hidden && !blocked) inputRef.current?.focus();
  }, [open, hidden, blocked]);

  useEffect(() => {
    const log = conversationRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [exchanges, open]);

  function hide() {
    setHidden(true);
    setOpen(false);
    try { window.sessionStorage.setItem('library-guide-hidden', 'true'); } catch { /* Storage is optional. */ }
    document.querySelector<HTMLButtonElement>('[data-testid="button-library-guide"]')?.focus();
  }
  function collapse() { setOpen(false); launcherRef.current?.focus(); }
  function ask(text: string, topic = findGuideTopic(text)) {
    if (!text.trim()) return;
    setExchanges((current) => [...current, { question: text.trim(), topic }].slice(-12));
    setQuestion('');
    inputRef.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(question); }

  if (hidden || blocked) return null;
  return (
    <aside className="library-guide" aria-label={copy.role} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); collapse(); }
    }}>
      {open ? (
        <section className="library-guide-panel" id="library-guide-panel" aria-labelledby="library-guide-title">
          <header className="library-guide-heading">
            <img src={ghost} alt="" width="48" height="52" />
            <div><h2 id="library-guide-title">{copy.name}</h2><p>{copy.role}</p></div>
            <button type="button" onClick={collapse} aria-label={copy.minimize} title={copy.minimize}><ChevronDown size={19} /></button>
            <button type="button" onClick={hide} aria-label={copy.hide} title={copy.hide}><X size={19} /></button>
          </header>
          <div className="library-guide-conversation" ref={conversationRef} role="log" aria-live="polite" aria-relevant="additions">
            <p className="library-guide-answer">{copy.intro} {copy.invite}</p>
            {exchanges.map((exchange, index) => (
              <div key={index} className="library-guide-exchange">
                <p className="library-guide-question">{exchange.question}</p>
                <p className="library-guide-answer">{exchange.topic ? copy.topics[exchange.topic][1] : copy.fallback}</p>
              </div>
            ))}
          </div>
          <div className="library-guide-suggestions" aria-label={copy.popular}>
            <p>{copy.popular}</p>
            <div>{(Object.keys(copy.topics) as GuideTopic[]).map((topic) => (
              <button type="button" key={topic} onClick={() => ask(copy.topics[topic][0], topic)}>{copy.topics[topic][0]}</button>
            ))}</div>
          </div>
          <form className="library-guide-form" onSubmit={submit}>
            <input ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.placeholder} aria-label={copy.placeholder} maxLength={400} />
            <button type="submit" disabled={!question.trim()} aria-label={copy.send} title={copy.send}><Send size={18} /></button>
          </form>
        </section>
      ) : (
        <div className="library-guide-welcome">
          <button className="library-guide-dismiss" type="button" onClick={hide} aria-label={copy.hide} title={copy.hide}><X size={17} /></button>
          <button ref={launcherRef} className="library-guide-launcher" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="library-guide-panel">
            <span className="library-guide-bubble"><strong>{copy.role}</strong><span>{copy.intro}</span><b>{copy.open} <span aria-hidden="true">↗</span></b></span>
            <img className="library-guide-ghost" src={ghost} alt="" width="106" height="115" />
          </button>
        </div>
      )}
    </aside>
  );
}