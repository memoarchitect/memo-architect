import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

// Path routing needs a server that can answer every path with the same
// document. A viewer opened off disk has no server: `file://` resolves a path
// against the filesystem, so the first navigation to `/catalog/...` leaves the
// app for a directory listing. The hash keeps every route inside the one
// document, which is what makes the standalone build usable at all.
//
// Chosen by protocol rather than by build flag so a served viewer keeps clean
// URLs and the same file still works when someone saves it and double-clicks it.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Router>
            <App />
        </Router>
    </StrictMode>
);
