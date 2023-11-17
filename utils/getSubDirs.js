import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import _ from 'lodash';

import { isDir } from './isDir.js';
import { isSymbolicLink } from './isSymbolicLink.js';

// =====================================================================================================================

export function getSubDirs(absPath, {ignorePatterns=[/^\.+/], symlink=true} = {}) {
    return isDir(absPath) ?
        _(readdirSync(absPath))
            .filter(name => _.every(ignorePatterns, pat => !pat.test(name)))
            .map(name => join(absPath, name))
            .filter(isDir)
            .map(absName => absName)
            .filter(absPath => symlink || !isSymbolicLink(absPath))
            .value() :
        [];
}