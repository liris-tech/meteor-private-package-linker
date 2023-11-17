import { getSubDirs } from './getSubDirs.js';

// =====================================================================================================================

export function isDirEmpty(absPath, {ignorePatterns=[], symlink=true} = {}) {
    return !getSubDirs(absPath, {ignorePatterns, symlink}).length
}