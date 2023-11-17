import {isDirEmpty} from './isDirEmpty.js';

import fs from 'node:fs';

// =====================================================================================================================

export function rmdirIfEmpty(absPath, {ignorePatterns=[], symlink=true} = {}) {
   if (isDirEmpty(absPath, {ignorePatterns, symlink}))  {
       fs.rmSync(absPath, {recursive: true});
   }
}