import path from 'node:path';

// =====================================================================================================================

export function getAbsPath(...components) {
    return path.resolve(path.join(...components));
}