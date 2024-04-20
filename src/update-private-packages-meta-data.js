import {
    getPrivatePackageNamesUsedInProject,
    readProjectPackageNames,
    readPackageName,
    readPackageDeps,
    isMeteorPackage
} from './utils.js';

import {
    walkDir,
    isDir
} from '@liris-tech/hidash';
import _ from 'lodash';

import fs from 'node:fs';
import path from 'node:path';

// =====================================================================================================================

export function computePrivatePackagesMetaData({ dotMeteorPackagesPath,
                                            privatePackagesSrcPath,
                                            privatePackagesBuildPath }) {
    const topLevelPackageNames = readProjectPackageNames(dotMeteorPackagesPath);
    let privatePackagesMetaData = walkDir({
        fromPath: privatePackagesSrcPath,
        options: {isLeaf: (absPath) => !isDir(absPath) || isMeteorPackage(absPath)},
        callback: (absPath) => {
            if (isMeteorPackage(absPath)) {
                const packageDotJs = fs.readFileSync(path.join(absPath, 'package.js')).toString();
                const packageName = readPackageName(packageDotJs);

                return {
                    packageName,
                    packageSrcPath: absPath,
                    packageBuildPath: (privatePackagesBuildPath === privatePackagesSrcPath)
                        ? absPath
                        : path.join(privatePackagesBuildPath, packageName),
                    packageDeps: readPackageDeps(packageDotJs),
                    isTopLevelPrivatePackage: topLevelPackageNames.includes(packageName),
                }
            }
        }}).filter(_.identity);

    const privatePackageNames = _.map(privatePackagesMetaData, 'packageName');
    for (const data of privatePackagesMetaData) {
        data.privatePackageDeps = _.intersection(data.packageDeps, privatePackageNames);
        delete data.packageDeps;
    }
    privatePackagesMetaData = _.zipObject(privatePackageNames, privatePackagesMetaData);

    const privatePackageNamesUsedInProject = getPrivatePackageNamesUsedInProject(privatePackagesMetaData);
    for (const data of Object.values(privatePackagesMetaData)) {
        data.usedInProject = privatePackageNamesUsedInProject.includes(data.packageName);
    }

    return privatePackagesMetaData;
}


export function setPrivatePackagesMetaDataByPackageName(privatePackagesMetaData, packageNames, transform) {
    let _transform = {};
    if (_.isPlainObject(transform)) {
        for (const [k, v] of Object.entries(transform)) {
            _transform[k] = _.isFunction(v) ? v : _.constant(v);
        }
    }
    else {
        throw new Error(`3rd argument of setPrivatePackagesMetaDataByPackageName should be a function or an object`);
    }

    for (const packageName of packageNames) {
        for (const [_k, _v] of Object.entries(_transform)) {
            privatePackagesMetaData[packageName][_k] = _v(privatePackagesMetaData[packageName]);
        }
    }
}
