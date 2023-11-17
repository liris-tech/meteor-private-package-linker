import { statSync } from 'node:fs';

// =====================================================================================================================

export function isDir(absPath) {
    try {
        return statSync(absPath).isDirectory();
    }
    catch (e) {
        return false;
    }
}