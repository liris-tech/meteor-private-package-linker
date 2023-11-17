import { globalEvents } from '../index.js';
import {
    symLinkPackages,
    updatePrivatePackagesMetaData,
    getPackageNamesWith,
    symLinkPackageInto,
    unlinkPackageFrom
} from '../utils/meteor-packages.js';

import _ from 'lodash';
import { watch } from 'chokidar';

import fs from 'node:fs';

// =====================================================================================================================

export function relinkPrivatePackagesOnChange(privatePackagesMetaData, { dotMeteorPackagesPath,
    privatePackagesSrcPath, log } ) {
    const dotMeteorPackagesWatcher = watch(dotMeteorPackagesPath);

    const privatePackageSrcWatchers = {};
    for (const packageName of getPackageNamesWith(privatePackagesMetaData, {usedInProject: true})) {
        privatePackageSrcWatchers[packageName] = watch(privatePackagesMetaData[packageName].packageSrcPath, {
            ignoreInitial: true,
            ignored: '**/packages',
            followSymlinks: false
        });
    }

    const privatePackagesSrcDirWatcher = watch(privatePackagesSrcPath, {
        ignoreInitial: true,
        ignored: '**/packages',
        followSymlinks: false
    });


    dotMeteorPackagesWatcher.on('change', absPath => {
        const change = updatePrivatePackagesMetaData(privatePackagesMetaData, absPath, { dotMeteorPackagesPath });
        if (change.message === 'usedPackagesChanged') {
            const { addedUsedPackageNames, removedUsedPackageNames } = change;
            log(`change ${absPath}`, change);

            for (const packageName of addedUsedPackageNames) {
                addPackageToBuild(packageName, privatePackagesMetaData);
                addWatcher(packageName, privatePackagesMetaData[packageName].packageSrcPath, privatePackageSrcWatchers);
            }

            for (const packageName of removedUsedPackageNames) {
                stopWatcher(packageName, privatePackageSrcWatchers);
                removePackageFromBuild(privatePackagesMetaData[packageName].packageBuildPath);
            }
        }
    });

    for (const packageName of _.keys(privatePackageSrcWatchers)) {
        privatePackageSrcWatchers[packageName].on('change', absPath => {
           const change = updatePrivatePackagesMetaData(privatePackagesMetaData, absPath,
               { dotMeteorPackagesPath, privatePackagesSrcPath });

           if (change.message === 'packageNameChanged') {
               dotMeteorPackagesWatcher.close();
               for (const packageName in getPackageNamesWith({usedInProject: true})) {
                   stopWatcher(packageName, privatePackageSrcWatchers);
               }
               globalEvents.emit('reboot');
           }
           else if (change.message === 'packageDepsChanged') {
               const { packageName, addedDeps, removedDeps } = change;
               for (const depPackageName of addedDeps) {
                   symLinkPackageInto(depPackageName, packageName, privatePackagesMetaData);
               }
               for (const depPackageName of removedDeps) {
                    unlinkPackageFrom(depPackageName, packageName, privatePackagesMetaData);
               }
           }
           else if (change.message === 'fileContentChanged') {
               const { packageName } = change;
               const packageMetaData = privatePackagesMetaData[packageName];
               const relPath = absPath.split(packageMetaData.packageSrcPath)[1];
               fs.cpSync(absPath, path.join(packageMetaData.packageBuildPath, relPath));
           }
        });
    }

    privatePackagesSrcDirWatcher.on('add', absPath => {
       console.log('added file', absPath);
    });

    privatePackagesSrcDirWatcher.on('addDir', absPath => {
        console.log('added dir', absPath);
    });

    privatePackagesSrcDirWatcher.on('unlink', absPath => {
        console.log('unlinked file', absPath);
    });

    privatePackagesSrcDirWatcher.on('unlinkDir', absPath => {
        console.log('unlinked dir', absPath);
    });

}


function addWatcher(packageName, packagePath, watchers) {
    watchers[packageName] = watch(packagePath);
}


function stopWatcher(packageName, watchers) {
    watchers[packageName].close();
    _.unset(watchers, packageName);
}


function addPackageToBuild(packageName, privatePackagesMetaData) {
    const { packageSrcPath, packageBuildPath } = privatePackagesMetaData[packageName];
    fs.cpSync(packageSrcPath, packageBuildPath, {recursive: true});
    symLinkPackages([packageName], privatePackagesMetaData);
}


function removePackageFromBuild(packageBuildPath) {
    fs.rmSync(packageBuildPath, {recursive: true});
}