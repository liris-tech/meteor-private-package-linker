import { STATE } from './state.js';

import { updateStateAndRelinkPackages } from './update-state-and-relink-packages.js';
import { unregisterAllFileWatchers } from './update-file-watchers.js';
import { onFileChange, log, startLogger } from './utils.js';

import _ from 'lodash';

// =====================================================================================================================

export function main(commandLineArgs, paths={}) {
    const isVerbose = commandLineArgs.includes('--verbose');
    const isWatching = commandLineArgs.includes('--watch');

    startLogger(isVerbose ? console.log : () => {});

    STATE.init({paths});

    if (isWatching) {
        onFileChange(([eventType, fileAbsPath, packageName]) => {
            updateStateAndRelinkPackages([eventType, fileAbsPath, packageName], STATE);
        });
    }

    // Logging ---------------------------------------------------------------------------------------------------------

    log(`meteor-private-package-linker started with ${commandLineArgs}`);

    log(`Path of .meteor/packages: ${STATE.dotMeteorPackagesPath}`);
    log(`Path of private packages ${STATE.privatePackagesSrcPath}`);
    if (STATE.privatePackagesSrcPath !== STATE.privatePackagesBuildPath) {
        log(`Path of private packages build: ${STATE.privatePackagesBuildPath}`);
    }

    log(`List of all private packages:`);
    _.forEach(STATE.privatePackagesMetaData, (pkg) => {
        log(`- ${pkg.packageName} ${pkg.usedInProject ? "[used]" : "[x]"}`);
    });

    if (isWatching) {
        log(`List of watched paths:`);
        _.forEach(STATE.fileWatchers, (watcher) => {
            log(`- ${watcher.path} [${watcher.eventTypes}]`);
        });
    }

    // -----------------------------------------------------------------------------------------------------------------

    return {
        stopLinker() {
            unregisterAllFileWatchers(STATE.fileWatchers);
            STATE.dotMeteorPackagesPath = '';
            STATE.privatePackagesSrcPath = '';
            STATE.privatePackagesBuildPath = '';
        }
    }
}