export const isAnyArrayBuffer = (value: any) => value instanceof ArrayBuffer || value instanceof SharedArrayBuffer;
export const isArrayBuffer = (value: any) => value instanceof ArrayBuffer;
export const isUint8Array = (value: any) => value instanceof Uint8Array;
export const isRegExp = (value: any) => value instanceof RegExp;
export const isDate = (value: any) => value instanceof Date;
