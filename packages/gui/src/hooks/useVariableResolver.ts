import { useEnvironmentStore } from '../stores/environmentStore';

export function useVariableResolver() {
    const { activeVariables } = useEnvironmentStore();

    const resolve = (text: string): string => {
        if (!text) return text;

        // Regex to match {{variable}}
        return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
            const trimmedName = variableName.trim();
            const value = activeVariables[trimmedName];

            // If variable exists, return it, otherwise return original match
            return value !== undefined ? String(value) : match;
        });
    };

    const hasVariables = (text: string): boolean => {
        return /\{\{([^}]+)\}\}/.test(text);
    }

    return {
        resolve,
        hasVariables,
        activeVariables
    };
}
