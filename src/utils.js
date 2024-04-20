import {
    getSubDirs,
    selectLines
} from '@liris-tech/hidash';
import _ from 'lodash';

import EventsEmitter from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {getFileBuildAbsPath} from './update-links.js';

// =====================================================================================================================

// Writing to the file system ------------------------------------------------------------------------------------------

export function cleanupBuildDir(
    { privatePackagesMetaData, privatePackagesSrcPath, privatePackagesBuildPath }
) {
    if (privatePackagesSrcPath === privatePackagesBuildPath) {
        for (const packageName of getPackageNames(privatePackagesMetaData)) {
            const packageMetaData = privatePackagesMetaData[packageName];
            const buildPath = path.join(packageMetaData.packageSrcPath, 'packages');
            if (fs.existsSync(buildPath)) {
                fs.rmSync(path.join(packageMetaData.packageSrcPath, 'packages'), {recursive: true});
            }
        }
    }
    else {
        for (const subDir of getSubDirs(privatePackagesBuildPath)) {
            fs.rmSync(subDir, {recursive: true});
        }
    }
}


export function syncFilesBetweenSrcAndBuild(fileSrcAbsPath, packageName, privatePackagesMetaData) {
    const fileBuildAbsPath = getFileBuildAbsPath(fileSrcAbsPath, {
        packageName,
        privatePackagesMetaData
    });
    if (fileSrcAbsPath !== fileBuildAbsPath) {
        // fileAbsPath and fileBuildAbsPath can be the same for the case where
        // STATE.privatePackagesSrcPath and STATE.privatePackagesBuildPath are the same
        // in which case there is nothing to copy as the source and the build directories are one and the same.
        fs.cpSync(fileSrcAbsPath, fileBuildAbsPath, {recursive: true});
    }
    return fileBuildAbsPath;
}


export function removeSrcFileFromBuild(fileSrcAbsPath, packageName, privatePackagesMetaData) {
    const fileBuildAbsPath = getFileBuildAbsPath(fileSrcAbsPath, {
        packageName,
        privatePackagesMetaData
    });
    if (fileSrcAbsPath !== fileBuildAbsPath) {
        // fileAbsPath and fileBuildAbsPath can be the same for the case where
        // STATE.privatePackagesSrcPath and STATE.privatePackagesBuildPath are the same
        // in which case there is nothing to remove as the source and the build directories are one and the same.
        fs.rmSync(fileBuildAbsPath, {recursive: true});
    }
}


// Getting information out of privatePackagesMetaData ------------------------------------------------------------------

export function getPrivatePackageNamesUsedInProject(privatePackagesMetaData) {
    const topLevelPackageNames = _(privatePackagesMetaData)
        .filter(data => data.isTopLevelPrivatePackage)
        .map('packageName')
        .value();

    let res = [...topLevelPackageNames];
    for (const topLevelPackageName of topLevelPackageNames) {
        res = res.concat(getDependenciesDeep(topLevelPackageName, privatePackagesMetaData));
    }

    return _.uniq(res);
}


export function getDependenciesDeep(packageName, privatePackagesMetaData) {
    let res = [];
    _getDependenciesDeep(packageName, privatePackagesMetaData, res);

    return _.uniq(res);
}


function _getDependenciesDeep(packageName, privatePackagesMetaData, res) {
    for (const depPackageName of privatePackagesMetaData[packageName].privatePackageDeps) {
        res.push(depPackageName);
        _getDependenciesDeep(depPackageName, privatePackagesMetaData, res);
    }
}


export function getPackageNames(privatePackagesMetaData) {
    return _.keys(privatePackagesMetaData);
}


export function getPackageNamesWith(privatePackagesMetaData, condition) {
    const predicate = _.isFunction(condition)
        ? condition
        : (x) => _.isEqual(_.pick(x, _.keys(condition)), condition);

    return _(privatePackagesMetaData)
        .filter(predicate)
        .map('packageName')
        .value();
}


// Reading information out of source files -----------------------------------------------------------------------------

export function readProjectPackageNames(dotMeteorPackagesPath) {
    return selectLines(fs.readFileSync(dotMeteorPackagesPath).toString(), {
        matches: /^[a-zA-Z]/
    }).map(line => line.split(' ')[0]);
}


export function readPackageName(packageDotJs) {
    const linesWithPackageName = selectLines(packageDotJs, {
        from: 'Package.describe({',
        to: '})',
        matches: 'name: '
    });

    return _(linesWithPackageName)
        .filter(line => !/^\s*\/\//.test(line)) // line isn't a comment
        .first()
        .match(/name:\s+['|"](.+)['|"]/)[1];
}


export function readPackageDeps(packageDotJs) {
    const linesWithPackageDeps = selectLines(packageDotJs, {
        from: 'Package.onUse(',
        to: '});',
        matches: 'api.use('
    });

    return _(linesWithPackageDeps)
        .filter(line => !/^\s*\/\//.test(line)) // line isn't a comment
        .map(line => line.match(/api\.use\(['|"](.+)['|"]\)/)[1])
        .value();
}


export function isMeteorPackage(dirAbsPath) {
    return fs.existsSync(path.join(dirAbsPath, 'package.js'))
}


// event-based processes -----------------------------------------------------------------------------------------------

export const fileWatchingEmitter = new EventsEmitter();


export function onFileChange(callback) {
    fileWatchingEmitter.removeAllListeners('file-change');
    fileWatchingEmitter.on('file-change', (message) => {
        callback(message);
    });
}


export function fileChanged([eventType, fileAbsPath, packageName]) {
    fileWatchingEmitter.emit('file-change', [eventType, fileAbsPath, packageName]);
}


const logsEmitter = new EventsEmitter();


export function startLogger(callback) {
    logsEmitter.removeAllListeners('log');
    logsEmitter.on('log', (message) => {
        callback(message);
    });
}


export function log(message) {
    logsEmitter.emit('log', message);
}
