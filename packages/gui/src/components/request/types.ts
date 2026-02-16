import { RadiusResponse } from "@radius/core";

export interface KeyValueItem {
    id: string;
    key: string;
    value: string;
    description?: string;
    enabled: boolean;
}

export interface Assertion {
    message: string;
    passed: boolean;
    error?: string;
}

export interface TestResult {
    name: string;
    passed: boolean;
    assertions: Assertion[];
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface AuthConfig {
    type: AuthType;
    token?: string;
    username?: string;
    password?: string;
    key?: string;
    value?: string;
    in?: 'header' | 'query';
}

export interface RequestData {
    id: string;
    method: string;
    url: string;
    auth: AuthConfig;
    headers: KeyValueItem[];
    params: KeyValueItem[];
    body: string;
    formData: KeyValueItem[];
    urlEncoded: KeyValueItem[];
    bodyType: 'none' | 'form-data' | 'urlencoded' | 'binary' | 'graphql' | 'json' | 'text' | 'xml' | 'html';

    // Scripts
    preRequestScript?: string;
    testScript?: string;
    binaryFilePath?: string;

    // Execution State
    response?: RadiusResponse | null;
    testResults?: TestResult[];
    isLoading?: boolean;
    error?: string | null;
}
