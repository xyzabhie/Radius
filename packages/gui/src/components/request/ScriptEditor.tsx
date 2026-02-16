import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import {
    DARK_EDITOR_THEME,
    LIGHT_EDITOR_THEME,
    DARK_FOCUSED_EDITOR_THEME,
    LIGHT_FOCUSED_EDITOR_THEME,
    DARK_HIGHLIGHT_STYLE,
    LIGHT_HIGHLIGHT_STYLE
} from "../../lib/editor-theme";
import { syntaxHighlighting } from "@codemirror/language";
import { useThemeStore } from "../../stores/useThemeStore";
import { useMemo } from 'react';

interface ScriptEditorProps {
    content: string;
    onChange: (content: string) => void;
}


export function ScriptEditor({ content, onChange }: ScriptEditorProps) {
    const theme = useThemeStore((state) => state.theme);

    const handleCodeChange = useCallback((value: string) => {
        onChange(value);
    }, [onChange]);

    const extensions = useMemo(() => [
        theme === 'dark' ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
        theme === 'dark' ? DARK_FOCUSED_EDITOR_THEME : LIGHT_FOCUSED_EDITOR_THEME,
        syntaxHighlighting(theme === 'dark' ? DARK_HIGHLIGHT_STYLE : LIGHT_HIGHLIGHT_STYLE),
        javascript({ jsx: false, typescript: false })
    ], [theme]);

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
