import { useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { keymap } from '@codemirror/view';
import { syntaxHighlighting } from "@codemirror/language";
import {
    DARK_EDITOR_THEME,
    LIGHT_EDITOR_THEME,
    DARK_HIGHLIGHT_STYLE,
    LIGHT_HIGHLIGHT_STYLE
} from "../../../lib/editor-theme";
import { useThemeStore } from "../../../stores/useThemeStore";
import { useMemo } from 'react';

interface GraphQLEditorProps {
    content: string;
    onChange: (content: string) => void;
    onRun?: () => void;
}

export function GraphQLEditor({ content, onChange, onRun }: GraphQLEditorProps) {
    const theme = useThemeStore((state) => state.theme);
    // Internal state to avoid forcing JSON.stringify on every keystroke
    const [query, setQuery] = useState('');
    const [variables, setVariables] = useState('{}');

    // Parse incoming content only when it changes externally (e.g. tab switch or load)
    useEffect(() => {
        try {
            const parsed = JSON.parse(content || '{}');
            setQuery(parsed.query || '');
            setVariables(
                typeof parsed.variables === 'string'
                    ? parsed.variables
                    : JSON.stringify(parsed.variables || {}, null, 2)
            );
        } catch {
            setQuery(content);
        }
    }, [content]);

    const updateContent = useCallback((newQuery: string, newVars: string) => {
        try {
            const varsJson = JSON.parse(newVars || '{}');
            onChange(JSON.stringify({ query: newQuery, variables: varsJson }, null, 2));
        } catch {
            // Best effort sync if variables are invalid JSON
            onChange(JSON.stringify({ query: newQuery, variables: newVars }, null, 2));
        }
    }, [onChange]);

    const runKeymap = keymap.of([
        {
            key: 'Ctrl-Enter',
            run: () => {
                if (onRun) {
                    onRun();
                    return true; // Stop propagation
                }
                return false;
            }
        },
        {
            key: 'Cmd-Enter',
            run: () => {
                if (onRun) {
                    onRun();
                    return true;
                }
                return false;
            }
        }
    ]);

    const sharedExtensions = useMemo(() => [
        theme === 'dark' ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
        syntaxHighlighting(theme === 'dark' ? DARK_HIGHLIGHT_STYLE : LIGHT_HIGHLIGHT_STYLE),
        runKeymap
    ], [theme, runKeymap]);

    return (
        <div className="flex h-full font-sans">
            <div className="flex-1 flex flex-col border-r border-border/10">
                <div className="px-3 py-1 bg-muted/5 border-b border-border/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Query
                </div>
                <CodeMirror
                    value={query}
                    height="100%"
                    onChange={(val) => {
                        setQuery(val);
                        updateContent(val, variables);
                    }}
                    className="h-full text-base bg-transparent input-editor-cm"
                    basicSetup={{ lineNumbers: true, foldGutter: true }}
                    extensions={sharedExtensions}
                />
            </div>
            <div className="w-1/3 flex flex-col">
                <div className="px-3 py-1 bg-muted/5 border-b border-border/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Variables
                </div>
                <CodeMirror
                    value={variables}
                    height="100%"
                    extensions={[...sharedExtensions, json(), linter(jsonParseLinter())]}
                    onChange={(val) => {
                        setVariables(val);
                        updateContent(query, val);
                    }}
                    className="h-full text-base bg-transparent input-editor-cm"
                    basicSetup={{ lineNumbers: true }}
                />
            </div>
        </div>
    );
}
