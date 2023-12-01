import {
    STATE,
} from './src/state.js';

import {
    updateStateAndRelinkPackages,
} from './src/update-state-and-relink-packages.js';
import {
    onFileChange,
    log,
    startLogger
} from './src/utils.js';

import _ from 'lodash';

import process from 'node:process';

// =====================================================================================================================

main(process.argv.slice(2), {
    dotMeteorPackagesPath: '/home/giskard/projects/liris_tech/code/liris/liris_app/.meteor/packages',
    privatePackagesSrcPath: '/home/giskard/projects/liris_tech/code/liris/meteor_packages',
    privatePackagesBuildPath: '/home/giskard/projects/liris_tech/code/liris/liris_app/packages'
});


function main(commandLineArgs, paths={}) {
    startLogger(commandLineArgs.includes('--verbose') ? console.log : _.noop)
    const isWatching = commandLineArgs.includes('--watch');

    log(`meteor-private-package-linker started with ${commandLineArgs}`);

    STATE.init({paths});
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
        onFileChange(([eventType, fileAbsPath, packageName]) => {
            updateStateAndRelinkPackages([eventType, fileAbsPath, packageName], STATE);
        });
    }
}