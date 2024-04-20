import { STATE } from './state.js';

import {
    syncFilesBetweenSrcAndBuild,
    removeSrcFileFromBuild,
    getPackageNames,
    getPackageNamesWith,
    getPrivatePackageNamesUsedInProject,
    getDependenciesDeep,
    readProjectPackageNames,
    readPackageName,
    readPackageDeps,
    log,
} from './utils.js';

import { diff } from '@liris-tech/hidash';
import _ from 'lodash';

import fs from 'node:fs';

// =====================================================================================================================

export function updateStateAndRelinkPackages([eventType, fileAbsPath, packageName], {
    privatePackagesMetaData,
    dotMeteorPackagesPath,
    privatePackagesSrcPath,
    privatePackagesBuildPath
}) {
    log(`${eventType} @ ${fileAbsPath}`);

    if (fileAbsPath === dotMeteorPackagesPath) {
        log(`|-- project's .meteor/packages changed (containing top-level meteor packages)`);

        return processChangeInDotMeteorPackages(fileAbsPath,
            privatePackagesMetaData);
    }

    else if (fileAbsPath.startsWith(privatePackagesSrcPath) && eventType === 'change') {
        log(`|-- source file changed inside a private package`);
        return processChangeInPrivatePackage(fileAbsPath, packageName, privatePackagesMetaData, {
            privatePackagesSrcPath, privatePackagesBuildPath
        });
    }

    else if (eventType === 'add' && fileAbsPath.endsWith('package.js')) {
        log(`|-- new package.js file added. Potentially new package.`);

        return processAdditionOfPrivatePackage();
    }

    else if (eventType === 'add' && !fileAbsPath.endsWith('package.js')) {
        log(`|-- source file inside existing private package added.`);

        return processAdditionOfSourceFileInPrivatePackage(fileAbsPath, privatePackagesMetaData);
    }

    else if (eventType === 'unlink' && fileAbsPath.endsWith('package.js')) {
        log(`|-- existing package.js file removed. Potentially deleted package.`);

        return processDeletionOfPrivatePackage();
    }

    else if (eventType === 'unlink' && !fileAbsPath.endsWith('package.js')) {
        log(`|-- source file inside existing private package deleted.`);

        return processDeletionOfSourceFileInPrivatePackage(fileAbsPath, privatePackagesMetaData);
    }
}


function processChangeInDotMeteorPackages(dotMeteorPackagesPath, privatePackagesMetaData) {
    const topLevelPrivatePackagesBefore = getPackageNamesWith(privatePackagesMetaData,
        {isTopLevelPrivatePackage: true});
    const topLevelPrivatePackagesAfter = _.intersection(readProjectPackageNames(dotMeteorPackagesPath),
        getPackageNames(privatePackagesMetaData));

    if (_.isEqual(topLevelPrivatePackagesBefore, topLevelPrivatePackagesAfter)) {
        log(`     |-- no change in top-level private meteor packages. No relinking to be done.`);
    }
    else {
        log(`    |-- top-level private meteor packages changed!`);

        const [addedTopLevelPackageNames, removedTopLevelPackageNames] = diff(topLevelPrivatePackagesAfter,
            topLevelPrivatePackagesBefore);

        log(`    |-- added: ${JSON.stringify(addedTopLevelPackageNames)}`);
        log(`    |-- removed: ${JSON.stringify(removedTopLevelPackageNames)}`);

        const usedPackagesNamesBefore = getPackageNamesWith(privatePackagesMetaData, {usedInProject: true});
        const usedPackagesNamesAfter = _(topLevelPrivatePackagesAfter)
            .map((packageName) => getDependenciesDeep(packageName, privatePackagesMetaData))
            .concat(topLevelPrivatePackagesAfter)
            .flatten()
            .uniq()
            .value()

        if (_.isEqual(usedPackagesNamesBefore, usedPackagesNamesAfter)) {
            log(`        |-- no change in used private packages (the top-level packages were not independent`);

            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: addedTopLevelPackageNames},
                transform: {isTopLevelPrivatePackage: true}
            });
            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: removedTopLevelPackageNames},
                transform: {isTopLevelPrivatePackage: false}
            });
        }
        else {
            log(`        |-- change in used private packages!`);

            const [addedUsedPackageNames, removedUsedPackageNames] = diff(usedPackagesNamesAfter,
                usedPackagesNamesBefore);

            log(`        |-- added: ${JSON.stringify(addedUsedPackageNames)}`);
            log(`        |-- removed: ${JSON.stringify(removedUsedPackageNames)}`);


            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: addedTopLevelPackageNames},
                transform: {isTopLevelPrivatePackage: true}
            });
            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: removedTopLevelPackageNames},
                transform: {isTopLevelPrivatePackage: false}
            });
            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: addedUsedPackageNames},
                transform: {usedInProject: true}
            });
            STATE.updatePrivatePackagesMetaData({
                op: 'set',
                selector: {packageNames: removedUsedPackageNames},
                transform: {usedInProject: false}
            });

            STATE.updateLinks({op: 'link', packageNames: addedUsedPackageNames});
            STATE.updateLinks({op: 'unlink', packageNames: removedUsedPackageNames});
        }
    }
}


function processChangeInPrivatePackage(fileAbsPath, packageName, privatePackagesMetaData) {
    if (/package\.js$/.test(fileAbsPath)) {
        const packageDotJs = fs.readFileSync(fileAbsPath).toString();

        const packageNameBefore = _.find(privatePackagesMetaData, (data) => {
                return fileAbsPath.startsWith(data.packageSrcPath)
            }).packageName;

        const packageNameAfter = readPackageName(packageDotJs);

        log(`|-- package.js of ${packageNameAfter} touched`)

        if (packageNameBefore !== packageNameAfter) {
            log(`    |-- package name changed from  ${packageNameAfter} to ${packageNameAfter}!`);
            log(`    |-- fallback: recomputing everything from scratch for now...`);
            STATE.init();
        }
        else {
            const packageName = packageNameAfter;
            const packageDepsBefore = privatePackagesMetaData[packageName].privatePackageDeps;
            const packageDepsAfter = _.intersection(readPackageDeps(packageDotJs),
                getPackageNames(privatePackagesMetaData));

            if (_.isEqual(packageDepsBefore, packageDepsAfter)) {
                log(`    |-- no relevant structural change.`);
                const fileBuildAbsPath = syncFilesBetweenSrcAndBuild(fileAbsPath, packageName, privatePackagesMetaData);
                log(`        |-- Just syncing package.js from src (${fileAbsPath}) to build (${fileBuildAbsPath}).`);
            }
            else {
                log(`    |-- deps of package ${packageName} changed!`)
                const [addedDeps, removedDeps] = diff(packageDepsAfter, packageDepsBefore);

                log(`    |-- added: ${JSON.stringify(addedDeps)}`);
                log(`    |-- removed: ${JSON.stringify(removedDeps)}`);

                STATE.updatePrivatePackagesMetaData({
                    op: 'set',
                    selector: {packageNames: [packageName]},
                    transform: {privatePackageDeps: packageDepsAfter}
                });

                STATE.updateLinks({
                    op: 'linkDeps',
                    packageNames: [packageName],
                    depNames: addedDeps
                });
                STATE.updateLinks({
                    op: 'unlinkDeps',
                    packageNames: [packageName],
                    depNames: removedDeps
                });

                const packageNamesUsedInProjectBefore = getPackageNamesWith(privatePackagesMetaData,
                    {usedInProject: true});
                const packageNamesUsedInProjectAfter = getPrivatePackageNamesUsedInProject(privatePackagesMetaData);

                if (_.isEqual(packageNamesUsedInProjectBefore, packageNamesUsedInProjectAfter)) {
                    log(`        |-- no change in packages used in project`);
                }
                else {
                    log(`        |-- changes in packages used in project!`);
                    const [addedPackageNamesUsedInProject, removedPackageNamesUsedInProject] =
                        diff(packageNamesUsedInProjectAfter, packageNamesUsedInProjectBefore);

                    log(`        |-- added: ${JSON.stringify(addedPackageNamesUsedInProject)}`);
                    log(`        |-- removed: ${JSON.stringify(removedPackageNamesUsedInProject)}`);

                    STATE.updatePrivatePackagesMetaData({
                        op: 'set',
                        selector: {packageNames: addedPackageNamesUsedInProject},
                        transform: {usedInProject: true}
                    });
                    STATE.updatePrivatePackagesMetaData({
                        op: 'set',
                        selector: {packageNames: removedPackageNamesUsedInProject},
                        transform: {usedInProject: false}
                    });

                    STATE.updateLinks({
                        op: 'link',
                        packageNames: addedPackageNamesUsedInProject
                    });
                    STATE.updateLinks({
                        op: 'unlink',
                        packageNames: removedPackageNamesUsedInProject
                    });
                }
            }
            if (privatePackagesMetaData[packageName].usedInProject) {
                syncFilesBetweenSrcAndBuild(fileAbsPath, packageName, privatePackagesMetaData);
            }
        }
    }
    else if (privatePackagesMetaData[packageName].usedInProject) {
        syncFilesBetweenSrcAndBuild(fileAbsPath, packageName, privatePackagesMetaData);
    }
}


function processAdditionOfPrivatePackage() {
    log(`   |-- fallback: recomputing everything from scratch for now...`)
    STATE.init();
}


function processAdditionOfSourceFileInPrivatePackage(fileAbsPath, privatePackagesMetaData) {
    const { packageName } = _.find(privatePackagesMetaData, data => {
       return fileAbsPath.startsWith(data.packageSrcPath);
    }) ?? {};

    if (!packageName) {
        return log(`|-- Package dir must have been renamed as packageName for ${fileAbsPath} wasn't found. Will be recomputed from scratch as soon as package.js is processed. Skipping.`);
    }

    if (privatePackagesMetaData[packageName].usedInProject) {
        syncFilesBetweenSrcAndBuild(fileAbsPath, packageName, privatePackagesMetaData);
    }
}


function processDeletionOfPrivatePackage() {
    log(`   |-- fallback: recomputing everything from scratch for now...`);
    STATE.init();
}


function processDeletionOfSourceFileInPrivatePackage(fileAbsPath, privatePackagesMetaData) {
    const { packageName } = _.find(privatePackagesMetaData, data => {
        return fileAbsPath.startsWith(data.packageSrcPath);
    });

    if (privatePackagesMetaData[packageName].usedInProject) {
        removeSrcFileFromBuild(fileAbsPath, packageName, privatePackagesMetaData);
    }
}