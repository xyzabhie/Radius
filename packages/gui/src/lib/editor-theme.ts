import { EditorView } from "@uiw/react-codemirror";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// VS Code Dark Syntax Highlighting (Colors only, no background)
export const DARK_HIGHLIGHT_STYLE = HighlightStyle.define([
    { tag: t.keyword, color: "#569cd6" },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#9cdcfe" },
    { tag: [t.variableName], color: "#9cdcfe" },
    { tag: [t.function(t.variableName)], color: "#dcdcaa" },
    { tag: [t.labelName], color: "#9cdcfe" },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#569cd6" },
    { tag: [t.definition(t.name), t.separator], color: "#d4d4d4" },
    { tag: [t.brace], color: "#d4d4d4" },
    { tag: [t.annotation], color: "#dcdcaa" },
    { tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#b5cea8" },
    { tag: [t.typeName, t.className], color: "#4ec9b0" },
    { tag: [t.operator, t.operatorKeyword], color: "#d4d4d4" },
    { tag: [t.tagName], color: "#569cd6" },
    { tag: [t.squareBracket], color: "#d4d4d4" },
    { tag: [t.angleBracket], color: "#d4d4d4" },
    { tag: [t.attributeName], color: "#9cdcfe" },
    { tag: [t.regexp], color: "#d16969" },
    { tag: [t.quote], color: "#6a9955" },
    { tag: [t.string], color: "#ce9178" },
    { tag: t.link, color: "#569cd6", textDecoration: "underline" },
    { tag: [t.url, t.escape, t.list], color: "#dcdcaa" },
    { tag: [t.comment], color: "#6a9955" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.heading, fontWeight: "bold", color: "#569cd6" },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#569cd6" },
    { tag: [t.processingInstruction, t.inserted], color: "#b5cea8" },
    { tag: t.content, color: "#d4d4d4" },
    { tag: t.invalid, color: "#ff0000" },
]);

// Enterprise Light Syntax Highlighting
export const LIGHT_HIGHLIGHT_STYLE = HighlightStyle.define([
    { tag: t.keyword, color: "#0000ff" },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#660e7a" },
    { tag: [t.variableName], color: "#000000" },
    { tag: [t.function(t.variableName)], color: "#00627a" },
    { tag: [t.labelName], color: "#000000" },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#0000ff" },
    { tag: [t.definition(t.name), t.separator], color: "#000000" },
    { tag: [t.brace], color: "#000000" },
    { tag: [t.annotation], color: "#000000" },
    { tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#0000ff" },
    { tag: [t.typeName, t.className], color: "#000000" },
    { tag: [t.operator, t.operatorKeyword], color: "#000000" },
    { tag: [t.tagName], color: "#000080" },
    { tag: [t.squareBracket], color: "#000000" },
    { tag: [t.angleBracket], color: "#000000" },
    { tag: [t.attributeName], color: "#0000ff" },
    { tag: [t.regexp], color: "#000000" },
    { tag: [t.quote], color: "#008000" },
    { tag: [t.string], color: "#008000" },
    { tag: t.link, color: "#0000ff", textDecoration: "underline" },
    { tag: [t.url, t.escape, t.list], color: "#000000" },
    { tag: [t.comment], color: "#808080" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.heading, fontWeight: "bold", color: "#000080" },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#0000ff" },
    { tag: [t.processingInstruction, t.inserted], color: "#0000ff" },
    { tag: t.content, color: "#000000" },
    { tag: t.invalid, color: "#ff0000" },
]);

// Dark Editor Layout
export const DARK_EDITOR_THEME = EditorView.theme({
    "&": {
        fontSize: "13px",
        backgroundColor: "#0b0e14 !important",
        height: "100%",
        color: "#d4d4d4"
    },
    ".cm-scroller": {
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: "1.5",
        backgroundColor: "#0b0e14 !important"
    },
    ".cm-gutters": {
        backgroundColor: "#11141b !important",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        color: "#5c6370",
        minWidth: "40px"
    },
    ".cm-content": {
        paddingBottom: "20px",
        caretColor: "#5c85ff"
    },
    ".cm-cursor": {
        borderLeftColor: "#5c85ff"
    },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
    ".cm-selectionBackground": { backgroundColor: "rgba(92, 133, 255, 0.3) !important" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.05)", color: "#ffffff" },
    ".cm-selectionMatch": { backgroundColor: "rgba(92, 133, 255, 0.15)" },
    ".cm-searchMatch": { backgroundColor: "rgba(255, 230, 0, 0.2)", outline: "1px solid rgba(255, 200, 0, 0.4)" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "rgba(255, 200, 0, 0.4)", outline: "1px solid rgba(255, 150, 0, 0.6)" },
});

// Light Editor Layout
export const LIGHT_EDITOR_THEME = EditorView.theme({
    "&": {
        fontSize: "14px",
        backgroundColor: "#ffffff !important",
        height: "100%",
        color: "hsl(var(--foreground))"
    },
    ".cm-scroller": {
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: "1.6",
        backgroundColor: "#ffffff !important"
    },
    ".cm-gutters": {
        backgroundColor: "#fcfcfc !important",
        borderRight: "1px solid #eeeeee",
        color: "#999999",
        minWidth: "40px"
    },
    ".cm-content": {
        paddingBottom: "20px",
        caretColor: "hsl(var(--primary))"
    },
    ".cm-cursor": {
        borderLeftColor: "hsl(var(--primary))"
    },
    ".cm-activeLine": { backgroundColor: "rgba(0, 122, 255, 0.04)" },
    ".cm-selectionBackground": { backgroundColor: "rgba(0, 120, 215, 0.35) !important" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(0, 122, 255, 0.06)", color: "#333333" },
    ".cm-selectionMatch": { backgroundColor: "rgba(0, 120, 215, 0.18)" },
    ".cm-searchMatch": { backgroundColor: "rgba(255, 230, 0, 0.35)", outline: "1px solid #e7c000" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#ffd300", outline: "1px solid #e7c000" },
});

// Cursor Focus Variants
export const getEditorFocusTheme = (theme: 'dark' | 'light', cursorWidth: string = "2px") => {
    return EditorView.theme({
        "&.cm-focused .cm-cursor": {
            borderLeftColor: "hsl(var(--primary))",
            borderLeftWidth: cursorWidth
        },
        ".cm-activeLine": {
            backgroundColor: theme === 'dark' ? "hsl(var(--muted) / 0.15)" : "hsl(var(--muted)/0.2)"
        }
    });
};

export const DARK_FOCUSED_EDITOR_THEME = getEditorFocusTheme('dark', "2px");
export const LIGHT_FOCUSED_EDITOR_THEME = getEditorFocusTheme('light', "2px");
export const DARK_THIN_FOCUSED_EDITOR_THEME = getEditorFocusTheme('dark', "1px");
export const LIGHT_THIN_FOCUSED_EDITOR_THEME = getEditorFocusTheme('light', "1px");
