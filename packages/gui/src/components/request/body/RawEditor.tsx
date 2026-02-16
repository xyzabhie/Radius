import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { xml } from '@codemirror/lang-xml';
import { linter } from '@codemirror/lint';
import { keymap } from '@codemirror/view';
import { syntaxHighlighting } from "@codemirror/language";
import {
    DARK_EDITOR_THEME,
    LIGHT_EDITOR_THEME,
    DARK_THIN_FOCUSED_EDITOR_THEME,
    LIGHT_THIN_FOCUSED_EDITOR_THEME,
    DARK_HIGHLIGHT_STYLE,
    LIGHT_HIGHLIGHT_STYLE
} from "../../../lib/editor-theme";
import { useThemeStore } from "../../../stores/useThemeStore";
import { useMemo } from 'react';

interface RawEditorProps {
    content: string;
    onChange: (content: string) => void;
    mode: 'json' | 'text' | 'xml' | 'html';
    onRun?: () => void;
}

export function RawEditor({ content, onChange, mode, onRun }: RawEditorProps) {
    const theme = useThemeStore((state) => state.theme);

    const handleCodeChange = useCallback((value: string) => {
        onChange(value);
    }, [onChange]);

    // Custom JSON linter that ignores empty content
    const customJsonLinter = useCallback((view: any) => {
        const source = jsonParseLinter();
        if (!view.state.doc.toString().trim()) return [];
        return source(view);
    }, []);

    const extensions = useMemo(() => {
        const exts = [
            theme === 'dark' ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
            theme === 'dark' ? DARK_THIN_FOCUSED_EDITOR_THEME : LIGHT_THIN_FOCUSED_EDITOR_THEME,
            syntaxHighlighting(theme === 'dark' ? DARK_HIGHLIGHT_STYLE : LIGHT_HIGHLIGHT_STYLE),
            keymap.of([
                {
                    key: 'Ctrl-Enter',
                    run: () => {
                        if (onRun) {
                            onRun();
                            return true;
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
            ])
        ];

        if (mode === 'json') {
            exts.push(json());
            exts.push(linter(customJsonLinter));
        } else if (mode === 'html') {
            exts.push(html());
        } else if (mode === 'xml') {
            exts.push(xml());
        }

        return exts;
    }, [theme, mode, onRun, customJsonLinter]);

    return (
        <CodeMirror
            value={content}
            height="100%"
            extensions={extensions}
            onChange={handleCodeChange}
            className="h-full text-base bg-muted/5 input-editor-cm border border-border/20 rounded-md overflow-hidden"
            basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
            }}
        />
    );
}
