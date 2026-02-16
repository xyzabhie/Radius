import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { xml } from '@codemirror/lang-xml';
import { useMemo } from "react";
import { highlightSelectionMatches } from "@codemirror/search";
import { EditorView } from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { RadiusResponse } from "@radius/core";
import { DARK_EDITOR_THEME, LIGHT_EDITOR_THEME, DARK_HIGHLIGHT_STYLE, LIGHT_HIGHLIGHT_STYLE } from "../../lib/editor-theme";
import { ViewMode } from "./ResponseToolbar";
import { useThemeStore } from "../../stores/useThemeStore";

interface ResponseBodyProps {
    response: RadiusResponse;
    viewMode: ViewMode;
    lineWrap: boolean;
}

export function ResponseBody({ response, viewMode, lineWrap }: ResponseBodyProps) {
    const theme = useThemeStore((state) => state.theme);

    const { formattedBody, extensions, contentType } = useMemo(() => {
        if (!response) return { formattedBody: '', extensions: [], contentType: '' };

        const cType = (response.headers['content-type'] || '').toLowerCase();
        let body = response.body || '';

        const exts: any[] = [
            theme === 'dark' ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME,
            syntaxHighlighting(theme === 'dark' ? DARK_HIGHLIGHT_STYLE : LIGHT_HIGHLIGHT_STYLE),
            highlightSelectionMatches(),
        ];

        if (lineWrap) {
            exts.push(EditorView.lineWrapping);
        }

        // Pretty Print Logic
        if (viewMode === 'pretty') {
            if (response.json) {
                try {
                    body = JSON.stringify(response.json, null, 2);
                    exts.push(json());
                } catch { }
            } else if (cType.includes('json')) {
                try {
                    body = JSON.stringify(JSON.parse(response.body), null, 2);
                    exts.push(json());
                } catch { exts.push(json()); }
            } else if (cType.includes('html')) {
                exts.push(html());
            } else if (cType.includes('xml')) {
                exts.push(xml());
            }
        } else if (viewMode === 'raw') {
            if (cType.includes('json')) exts.push(json());
        }

        return { formattedBody: body, extensions: exts, contentType: cType };
    }, [response, viewMode, lineWrap, theme]);

    // Image Preview
    if (contentType.startsWith('image/')) {
        const imgSrc = formattedBody.startsWith('data:')
            ? formattedBody
            : `data:${contentType};base64,${formattedBody}`;
        return (
            <div className="flex h-full items-center justify-center p-4 bg-muted/5">
                <img src={imgSrc} alt="Response Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-md border" />
            </div>
        );
    }

    // HTML Preview (Iframe)
    if (viewMode === 'preview') {
        return (
            <iframe srcDoc={response.body} className="w-full h-full bg-white border-none" sandbox="allow-scripts" />
        );
    }

    // Code Editor
    return (
        <div className="h-full bg-transparent p-1 border-t border-border/10">
            <CodeMirror
                value={formattedBody}
                height="100%"
                extensions={extensions}
                readOnly={true}
                className="h-full text-base input-editor-cm"
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                }}
            />
        </div>
    );
}
