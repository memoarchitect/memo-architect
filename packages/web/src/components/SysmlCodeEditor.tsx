import { useEffect, useRef } from 'react';
import Editor, { loader, type BeforeMount, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type { editor, languages, Position } from 'monaco-editor';

// Keep the editor fully local/offline. @monaco-editor/react otherwise loads
// Monaco from a CDN, which is unsuitable for local engineering projects.
loader.config({ monaco });
(globalThis as typeof globalThis & {
    MonacoEnvironment?: { getWorker(): Worker };
}).MonacoEnvironment = { getWorker: () => new EditorWorker() };

export interface SysmlCompletionSymbol {
    id: string;
    name: string;
    kind: string;
}

interface Props {
    value: string;
    sourceFile?: string;
    readOnly?: boolean;
    symbols: SysmlCompletionSymbol[];
    onChange: (value: string) => void;
    onSave: () => void;
}

const SYSML_KEYWORDS = [
    'about', 'abstract', 'accept', 'action', 'alias', 'allocation', 'analysis',
    'assert', 'assign', 'assume', 'attribute', 'bind', 'binding', 'calc', 'case',
    'comment', 'concern', 'connect', 'connection', 'constraint', 'crosses', 'decide',
    'def', 'dependency', 'doc', 'else', 'end', 'entry', 'enum', 'event', 'exhibit',
    'exit', 'expose', 'filter', 'first', 'flow', 'for', 'fork', 'frame', 'if',
    'import', 'include', 'individual', 'interface', 'item', 'join', 'language',
    'loop', 'merge', 'message', 'metadata', 'objective', 'occurrence', 'package',
    'parallel', 'part', 'perform', 'port', 'private', 'protected', 'public', 'redefines',
    'ref', 'render', 'require', 'requirement', 'return', 'satisfy', 'send', 'snapshot',
    'specializes', 'stakeholder', 'state', 'subject', 'subsets', 'succession', 'then',
    'timeslice', 'transition', 'use', 'variant', 'variation', 'verification', 'verify',
    'view', 'viewpoint', 'when', 'while',
];

let registered = false;
let currentSymbols: SysmlCompletionSymbol[] = [];

const registerSysml: BeforeMount = monaco => {
    if (registered) return;
    registered = true;
    monaco.languages.register({ id: 'sysml', extensions: ['.sysml', '.kerml'] });
    monaco.languages.setLanguageConfiguration('sysml', {
        comments: { lineComment: '//', blockComment: ['/*', '*/'] },
        brackets: [['{', '}'], ['[', ']'], ['(', ')']],
        autoClosingPairs: [
            { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
            { open: "'", close: "'" }, { open: '"', close: '"' }, { open: '/*', close: '*/' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
            { open: "'", close: "'" }, { open: '"', close: '"' },
        ],
        indentationRules: {
            increaseIndentPattern: /\{[^}]*$/,
            decreaseIndentPattern: /^\s*\}/,
        },
    });
    monaco.languages.setMonarchTokensProvider('sysml', {
        keywords: SYSML_KEYWORDS,
        tokenizer: {
            root: [
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment'],
                [/\b(?:true|false|null)\b/, 'constant.language'],
                [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                [/'(?:[^'\\]|\\.)*'/, 'string'],
                [/"(?:[^"\\]|\\.)*"/, 'string'],
                [/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
                [/:>|:>>|::>|::|:=|=>|->|\.\.|<=|>=|==|!=|&&|\|\|/, 'operator'],
                [/[{}[\]()]/, '@brackets'],
                [/[;,.]/, 'delimiter'],
            ],
            comment: [
                [/[^/*]+/, 'comment'],
                [/\/\*/, 'comment', '@push'],
                [/\*\//, 'comment', '@pop'],
                [/[/*]/, 'comment'],
            ],
        },
    });

    monaco.languages.registerCompletionItemProvider('sysml', {
        triggerCharacters: [':', '.', '>'],
        provideCompletionItems: (model: editor.ITextModel, position: Position) => {
            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
            const keywordSuggestions: languages.CompletionItem[] = SYSML_KEYWORDS.map(keyword => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range,
            }));
            const snippets: languages.CompletionItem[] = [
                ['package', "package '${1:PackageName}' {\n    ${0}\n}"],
                ['part def', 'part def ${1:TypeName} {\n    ${0}\n}'],
                ['part usage', 'part ${1:usageName} : ${2:TypeName};'],
                ['view def', 'view def ${1:ViewName} :> ${2:DiagramView} {\n    ${0}\n}'],
                ['connection', 'connection : ${1:Relationship} connect ${2:source} to ${3:target};'],
            ].map(([label, insertText]) => ({
                label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
            }));
            const modelSuggestions: languages.CompletionItem[] = currentSymbols.map(symbol => ({
                label: symbol.id,
                detail: `${symbol.name} — ${symbol.kind}`,
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: symbol.id,
                range,
            }));
            const kinds = [...new Set(currentSymbols.map(symbol => symbol.kind).filter(Boolean))];
            const kindSuggestions: languages.CompletionItem[] = kinds.map(kind => ({
                label: kind,
                detail: 'Model kind',
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: kind,
                range,
            }));
            return { suggestions: [...snippets, ...keywordSuggestions, ...kindSuggestions, ...modelSuggestions] };
        },
    });
};

export function SysmlCodeEditor({ value, sourceFile, readOnly, symbols, onChange, onSave }: Props) {
    const saveRef = useRef(onSave);
    useEffect(() => { saveRef.current = onSave; }, [onSave]);
    useEffect(() => {
        currentSymbols = symbols;
        return () => {
            if (currentSymbols === symbols) currentSymbols = [];
        };
    }, [symbols]);

    const handleMount: OnMount = (instance, monaco) => {
        instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
        instance.focus();
    };

    return (
        <Editor
            height="100%"
            path={sourceFile || 'diagram.sysml'}
            language="sysml"
            theme="vs-dark"
            value={value}
            beforeMount={registerSysml}
            onMount={handleMount}
            onChange={next => onChange(next ?? '')}
            options={{
                automaticLayout: true,
                readOnly,
                fontSize: 13,
                lineHeight: 21,
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                quickSuggestions: { other: true, comments: false, strings: false },
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: 'currentDocument',
                tabSize: 4,
                insertSpaces: true,
                padding: { top: 10, bottom: 10 },
            }}
        />
    );
}
