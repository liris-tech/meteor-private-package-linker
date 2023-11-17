import _ from 'lodash';

import { isDir } from './isDir.js';
import { getSubDirs } from './getSubDirs.js';

// =====================================================================================================================

export function walkDir(...args) {
    const [startPath, ...rest] = args;
    const defaultOptions = {isLeaf: (currentDirAbsPath) => !isDir(currentDirAbsPath)};
    const res = [];

    if (!rest.length) {
        throw new Error('walkDir: argument missing. Expects a callback as last argument')
    }
    else if (rest.length === 1) {
        let callback = rest[0];
        if (!_.isFunction(callback)) {
            throw new Error(`walkDir: second argument should be a function. Received: ${callback} instead.`);
        }
        else {
            _walkDir(startPath, defaultOptions, callback, res);
            return res;
        }
    }
    else if (rest.length > 1) {
        let options = rest[0];
        let callback = rest[1];

        if (!_.isPlainObject(options)) {
            throw new Error(`walkDir: options (second argument) should be an object. Received: ${options} instead.`);
        }
        else if (!_.isFunction(callback)) {
            throw new Error(`walkDir: last argument should be a function. Received: ${callback} instead.`);
        }
        else {
            _walkDir(startPath, _.merge({}, defaultOptions, options), callback, res);
            return res;
        }
    }
}


function _walkDir(startPath, options, callback, res) {
    res.push(callback(startPath));

    if (!options.isLeaf(startPath)) {
        for (const dirAbsPath of getSubDirs(startPath)) {
            _walkDir(dirAbsPath, options, callback, res);
        }
    }
}