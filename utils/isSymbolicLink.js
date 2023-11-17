import { lstatSync } from 'node:fs';

// =====================================================================================================================

export const isSymbolicLink = (absPath) => {
    try {
        return lstatSync(absPath).isSymbolicLink();
    }
    catch (e) {
        return false;
    }
};