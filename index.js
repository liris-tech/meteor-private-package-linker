import { cleanupPrivatePackages } from './core/cleanup-private-packages.js';
import { linkPrivatePackages } from './core/link-private-packages.js';
import { relinkPrivatePackagesOnChange } from './core/relink-private-packages-on-change.js';

import { computePrivatePackagesMetaData } from './utils/meteor-packages.js';

import { getAbsPath } from './utils/getAbsPath.js';

import process from 'node:process';
import events from 'node:events';

// =====================================================================================================================

export const globalEvents = new events.EventEmitter();


main(process.argv.slice(2), {
    dotMeteorPackagesPath: '/home/giskard/projects/liris_tech/code/liris/liris_app/.meteor/packages',
    privatePackagesSrcPath: '/home/giskard/projects/liris_tech/code/liris/meteor_packages',
    privatePackagesBuildPath: '/home/giskard/projects/liris_tech/code/liris/liris_app/packages'
});


function main(commandLineArgs, paths={}) {
    const dotMeteorPackagesPath = paths.dotMeteorPackagesPath ??
        getAbsPath('.meteor', 'packages');
    const privatePackagesSrcPath = paths.privatePackagesSrcPath ??
        getAbsPath(process.env['METEOR_PRIVATE_PACKAGE_DIRS'] || env['METEOR_PACKAGE_DIRS'] || 'packages');
    const privatePackagesBuildPath = paths.privatePackagesBuildPath ??
        getAbsPath(process.env['METEOR_PACKAGE_DIRS'] || 'packages');

    startLinker(commandLineArgs, { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath });

    globalEvents.on('reboot', () => {
        startLinker(commandLineArgs, { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath });
    });
}


function startLinker(commandLineArgs, { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath }) {
    const privatePackagesMetaData = computePrivatePackagesMetaData(privatePackagesSrcPath, privatePackagesBuildPath,
        dotMeteorPackagesPath);
    const log = commandLineArgs.includes('--verbose') ? console.log : x => undefined;
    cleanupPrivatePackages(privatePackagesMetaData, privatePackagesSrcPath, privatePackagesBuildPath);
    linkPrivatePackages(privatePackagesMetaData);

    if (commandLineArgs.includes('--watch')) {
        relinkPrivatePackagesOnChange(privatePackagesMetaData,
            { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath, log });
    }
}



