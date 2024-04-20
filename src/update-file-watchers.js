import { fileChanged } from './utils.js';

import chokidar from 'chokidar';
import _ from 'lodash';

// =====================================================================================================================

export function registerFileWatcher(fileWatchers, params) {
    const watcher = chokidar.watch(params.path, params.chokidarOptions ?? {})
    for (const eventType of params.eventTypes) {
        watcher.on(eventType, (absPath) => fileChanged([eventType, absPath, params.packageName]));
    }
    fileWatchers[params.path] = _.extend({ watcher }, params);
}


export function unregisterFileWatcher(fileWatchers, absPath) {
    fileWatchers[absPath].watcher.close();
    _.unset(fileWatchers, absPath);
}


export function unregisterAllFileWatchers(fileWatchers) {
    for (const absPath in fileWatchers) {
        fileWatchers[absPath].watcher.close();
        _.unset(fileWatchers, absPath);
    }
}