import fs from 'node:fs';
import {
    readFileSync,
    existsSync,
    cpSync,
    symlinkSync
} from 'node:fs';
import { join } from 'node:path';

import _ from 'lodash';

import { selectLinesFromText } from './selectLinesFromText.js';
import { diff } from './diff.js';
import { isDir } from './isDir.js';
import { walkDir } from './walkDir.js';
import { mkdirIfNotExists } from './mkdirIfNotExists.js';
import { rmdirIfEmpty } from './rmdirIfEmpty.js';

// =====================================================================================================================

export function computePrivatePackagesMetaData(privatePackagesSrcPath, privatePackagesBuildPath,
                                               dotMeteorPackagesPath) {
    const topLevelPackageNames = getProjectPackageNames(dotMeteorPackagesPath);
    let privatePackagesMetaData = walkDir(privatePackagesSrcPath,
        {isLeaf: (absPath) => !isDir(absPath) || isMeteorPackage(absPath)},
        (absPath) => {
            if (isMeteorPackage(absPath)) {
                const packageDotJs = readFileSync(join(absPath, 'package.js')).toString();
                const packageName = getPackageName(packageDotJs);

                return {
                    packageName,
                    packageSrcPath: absPath,
                    packageBuildPath: (privatePackagesBuildPath === privatePackagesSrcPath)
                        ? absPath
                        : join(privatePackagesBuildPath, packageName),
                    packageDeps: getPackageDeps(packageDotJs),
                    isTopLevelPrivatePackage: topLevelPackageNames.includes(packageName),
                }
            }
        }).filter(_.identity);

    const privatePackageNames = _.map(privatePackagesMetaData, 'packageName');
    for (const data of privatePackagesMetaData) {
        data.privatePackageDeps = _.intersection(data.packageDeps, privatePackageNames);
    }
    privatePackagesMetaData = _.zipObject(privatePackageNames, privatePackagesMetaData);

    const privatePackageNamesUsedInProject = getPrivatePackageNamesUsedInProject(privatePackagesMetaData);
    for (const data of Object.values(privatePackagesMetaData)) {
        data.usedInProject = privatePackageNamesUsedInProject.includes(data.packageName);
    }

    return privatePackagesMetaData;
}


export function updatePrivatePackagesMetaData(privatePackagesMetaData, absPath, {dotMeteorPackagesPath,
    privatePackagesSrcPath, privatePackagesBuildPath}) {
    if (absPath === dotMeteorPackagesPath) {
        const topLevelPrivatePackagesBefore = getPackageNamesWith(privatePackagesMetaData,
            {isTopLevelPrivatePackage: true});
        const topLevelPrivatePackagesAfter = _.intersection(getProjectPackageNames(dotMeteorPackagesPath),
            getPackageNames(privatePackagesMetaData));

        if (_.isEqual(topLevelPrivatePackagesBefore, topLevelPrivatePackagesAfter)) {
            return {
                message: 'noRelevantChanges'
            };
        }
        else {
            const [addedTopLevelPackageNames, removedTopLevelPackageNames] = diff(topLevelPrivatePackagesAfter,
                topLevelPrivatePackagesBefore);
            setAttributeForPackageNames(addedTopLevelPackageNames, privatePackagesMetaData,
                'isTopLevelPrivatePackage', true);
            setAttributeForPackageNames(removedTopLevelPackageNames, privatePackagesMetaData,
                'isTopLevelPrivatePackage', false);

            const usedPackagesNamesBefore = getPackageNamesWith(privatePackagesMetaData, {usedInProject: true});
            const usedPackagesNamesAfter = getPrivatePackageNamesUsedInProject(privatePackagesMetaData);

            if (_.isEqual(usedPackagesNamesBefore, usedPackagesNamesAfter)) {
                return {
                    message: 'topLevelPackagesChanged',
                    addedTopLevelPackageNames,
                    removedTopLevelPackageNames
                }
            }
            else {
                const [addedUsedPackageNames, removedUsedPackageNames] = diff(usedPackagesNamesAfter,
                    usedPackagesNamesBefore);
                setAttributeForPackageNames(addedUsedPackageNames, privatePackagesMetaData, 'usedInProject', true);
                setAttributeForPackageNames(removedUsedPackageNames,  privatePackagesMetaData, 'usedInProject', false);

                return {
                    message: 'usedPackagesChanged',
                    addedUsedPackageNames,
                    removedUsedPackageNames
                };
            }
        }
    }

    else if (absPath.startsWith(privatePackagesSrcPath)) {
        if (/package\.js$/.test(absPath)) {
            const packageDotJs = readFileSync(absPath).toString();
            const packageNameBefore = _.find(privatePackagesMetaData, data => absPath.startsWith(data.packageSrcPath))
                .packageName;
            const packageNameAfter = getPrivatePackageName(packageDotJs);
            if (packageNameBefore !== packageNameAfter) {
                // Complex logic => change name, update dependencies recomputing what is used and not.
                // Instead: we just reboot
/*                privatePackagesMetaData[packageNameAfter] = _.cloneDeep(privatePackagesMetaData[packageNameBefore]);
                privatePackagesMetaData[packageNameAfter].packageName = packageNameAfter;

                const packageBuildPathBefore =  privatePackagesMetaData[packageNameAfter].packageBuildPath;
                const packageBuildPathAfter = (privatePackagesSrcPath === privatePackagesBuildPath)
                    ? packageBuildPathBefore
                    : packageBuildPathBefore.replace(new RegExp(packageNameBefore+'$'), packageNameAfter);
                privatePackagesMetaData[packageNameAfter].packageBuildPath = packageBuildPathAfter;
                _.unset(privatePackagesMetaData, packageNameBefore);
                setAttributeForPackageNames(getPackageNames(privatePackagesMetaData), privatePackagesMetaData,
                    'packageDeps', deps => _.map(deps, dep => dep === packageNameBefore ? packageNameAfter : dep));*/
                return {
                    message: 'packageNameChanged',
                    packageNameBefore,
                    packageNameAfter
                }
            }
            else {
                const packageName = packageNameAfter;
                const packageDepsBefore = privatePackagesMetaData[packageName].packageDeps;
                const packageDepsAfter = _.intersection(getPackageDeps(packageDotJs),
                    getPackageNames(privatePackagesMetaData));

                if (_.isEqual(packageDepsBefore, packageDepsAfter)) {
                    return {
                        message: 'noRelevantChanges'
                    };
                }
                else {
                    const [addedDeps, removedDeps] = diff(packageDepsAfter,  packageDepsBefore);
                    setAttributeForPackageNames([packageName], privatePackagesMetaData, 'packageDeps', packageDepsAfter);
                    return {
                        message: 'packageDepsChanged',
                        packageName,
                        addedDeps,
                        removedDeps
                    }
                }
            }
        }
        else {
            return {
                message: 'fileContentChanged',
                packageName
            }
        }

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


export function setAttributeForPackageNames(packageNames, privatePackagesMetaData, attribute, value) {
    const f = _.isFunction(value) ? value : _.constant(value);
    for (const packageName of packageNames) {
        const valueBefore = privatePackagesMetaData[packageName][attribute];
        privatePackagesMetaData[packageName][attribute] = f(valueBefore);
    }
}


export function getPackageName(packageDotJs) {
    const linesWithPackageName = selectLinesFromText(packageDotJs, {
        from: 'Package.describe({',
        to: '})',
        matches: 'name: '
    });

    return _(linesWithPackageName)
        .filter(line => !/\s*\/\//.test(line)) // line isn't a comment
        .first()
        .match(/name:\s+['|"](.+)['|"]/)[1];
}


export function getPackageDeps(packageDotJs) {
    const linesWithPackageDeps = selectLinesFromText(packageDotJs, {
        from: 'Package.onUse(',
        to: '});',
        matches: 'api.use('
    });

    return _(linesWithPackageDeps)
        .filter(line => !/\s*\/\//.test(line)) // line isn't a comment
        .map(line => line.match(/api\.use\(['|"](.+)['|"]\)/)[1])
        .value();
}


function getPrivatePackageNamesUsedInProject(privatePackagesMetaData) {
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


function getDependenciesDeep(packageName, privatePackagesMetaData) {
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


function isMeteorPackage(dirAbsPath) {
    return existsSync(join(dirAbsPath, 'package.js'))
}


export function getPrivatePackageName(packageDotJs) {
    const linesWithPackageName = selectLinesFromText(packageDotJs, {
        from: 'Package.describe({',
        to: '})',
        matches: 'name: '
    });

    return _(linesWithPackageName)
        .filter(line => !/\s*\/\//.test(line)) // line isn't a comment
        .first()
        .match(/name:\s+['|"](.+)['|"]/)[1];
}


export function getDepsOfPackage(packageDotJs) {
    const linesWithPackageDeps = selectLinesFromText(packageDotJs, {
        from: 'Package.onUse(',
        to: '});',
        matches: 'api.use('
    });

    return _(linesWithPackageDeps)
        .filter(line => !/\s*\/\//.test(line)) // line isn't a comment
        .map(line => line.match(/api\.use\(['|"](.+)['|"]\)/)[1])
        .value();
}

// ---------------------------------------------------------------------------------------------------------------------

export function computeTopLevelPrivatePackageNames(dotMeteorPackagesPath, privatePackagesVirtualFS) {
    const allTopLevelPackageNames = getProjectPackageNames(dotMeteorPackagesPath);
    const allPrivatePackageNames = _.keys(privatePackagesVirtualFS);

    return _.intersection(allTopLevelPackageNames, allPrivatePackageNames);
}


function getProjectPackageNames(dotMeteorPackagesPath) {
    return selectLinesFromText(readFileSync(dotMeteorPackagesPath).toString(), {
        matches: /^[a-zA-Z]/
    }).map(line => line.split(' ')[0]);
}

// ---------------------------------------------------------------------------------------------------------------------

export function getPrivatePackagesUsedInProject(privatePackagesUsedAtTopLevel, privatePackagesVirtualFS) {
    const privatePackagesUsedInProject = _.clone(privatePackagesUsedAtTopLevel);
    for (const packageName of privatePackagesUsedAtTopLevel) {
        _getPrivatePackagesUsedInProject(privatePackagesVirtualFS[packageName].dependsOn, privatePackagesVirtualFS,
            privatePackagesUsedInProject);
    }

    return _.uniq(privatePackagesUsedInProject);
}


function _getPrivatePackagesUsedInProject(dependencies, privatePackagesVirtualFS, res) {
    for (const dep of dependencies) {
        res.push(dep);
        const subDeps = privatePackagesVirtualFS[dep].dependsOn;
        if (subDeps.length) {
            _getPrivatePackagesUsedInProject(subDeps, privatePackagesVirtualFS, res);
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export function copyPackagesFromSrcToBuild(privatePackagesSrcPathByName, privatePackagesBuildPath) {
    mkdirIfNotExists(privatePackagesBuildPath);
    for (const [packageName, packageSrcPath] of Object.entries(privatePackagesSrcPathByName)) {
        const dest = join(privatePackagesBuildPath, packageName);
        mkdirIfNotExists(dest);
        cpSync(packageSrcPath, dest, {recursive: true});
    }
}

// ---------------------------------------------------------------------------------------------------------------------

export function symLinkPackages(privatePackageNamesToSymLink, privatePackagesMetaData) {
    for (const packageName of privatePackageNamesToSymLink) {
        for (const nestedPackageName of privatePackagesMetaData[packageName].privatePackageDeps) {
            symLinkPackageInto(nestedPackageName, packageName, privatePackagesMetaData);
        }
    }
}


export function symLinkPackageInto(nestedPackageName, packageName, privatePackagesMetaData) {
    const nestedPackageBuildPath = privatePackagesMetaData[nestedPackageName].packageBuildPath;
    const targetDirForSymLink = join(privatePackagesMetaData[packageName].packageBuildPath, 'packages');
    mkdirIfNotExists(targetDirForSymLink);
    const symlinkPath = join(targetDirForSymLink, nestedPackageName);
    if (!existsSync(symlinkPath)) {
        symlinkSync(nestedPackageBuildPath, symlinkPath, 'dir');
    }
}


export function unlinkPackageFrom(nestedPackageName, packageName, privatePackagesMetaData) {
    const targetDirForSymLink = join(privatePackagesMetaData[packageName].packageBuildPath, 'packages');
    const symlinkPath = join(targetDirForSymLink, nestedPackageName);
    if (existsSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
    }
    rmdirIfEmpty(targetDirForSymLink);
}