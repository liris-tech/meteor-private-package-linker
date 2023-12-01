import { mkdirIfNotExists } from '../utils/mkdirIfNotExists.js';
import { rmdirIfEmpty } from '../utils/rmdirIfEmpty.js';

import fs from 'node:fs';
import path from 'node:path';

// =====================================================================================================================

export function copyPackagesFromSrcToBuildAndLinkDeps({ packageNames, privatePackagesMetaData }) {
    copyPackagesFromSrcToBuild({ packageNames, privatePackagesMetaData });
    symLinkDepsIntoPackages({ packageNames, privatePackagesMetaData });
}


export function copyPackageFromSrcToBuildAndLinkDeps({ packageName, privatePackagesMetaData }) {
    copyPackageFromSrcToBuild({ packageName, privatePackagesMetaData });
    symLinkDepsIntoPackage({ depNames: privatePackagesMetaData[packageName].privatePackageDeps, packageName,
        privatePackagesMetaData });
}


function copyPackagesFromSrcToBuild({ packageNames, privatePackagesMetaData }) {
    for (const packageName of packageNames) {
        copyPackageFromSrcToBuild({ packageName, privatePackagesMetaData });
    }
}


function copyPackageFromSrcToBuild({ packageName, privatePackagesMetaData }) {
    const { packageSrcPath, packageBuildPath } = privatePackagesMetaData[packageName];

    if (packageSrcPath !== packageBuildPath) {
        fs.cpSync(packageSrcPath, packageBuildPath, {recursive: true});
    }
}


function symLinkDepsIntoPackages({ packageNames, privatePackagesMetaData }) {
    for (const packageName of packageNames) {
        const depNames = privatePackagesMetaData[packageName].privatePackageDeps;
        symLinkDepsIntoPackage({ depNames, packageName, privatePackagesMetaData });
    }
}


export function symLinkDepsIntoPackage({ depNames, packageName, privatePackagesMetaData }) {
    for (const depName of depNames) {
        symLinkDepIntoPackage({ depName, packageName, privatePackagesMetaData});
    }
}


function symLinkDepIntoPackage({ depName, packageName, privatePackagesMetaData }) {
    const depBuildPath = privatePackagesMetaData[depName].packageBuildPath;
    const depsSymLinkDirInPackage = path.join(privatePackagesMetaData[packageName].packageBuildPath, 'packages');
    mkdirIfNotExists(depsSymLinkDirInPackage);
    const symLinkPath = path.join(depsSymLinkDirInPackage, depName);
    if (!fs.existsSync(symLinkPath)) {
        fs.symlinkSync(depBuildPath, symLinkPath, 'dir');
    }
}


export function unlinkDepsFromPackages( { packageNames, privatePackagesMetaData }) {
    for (const packageName of packageNames) {
        fs.rmSync(path.join(privatePackagesMetaData[packageName].packageBuildPath), {recursive: true});
    }
}

export function unlinkDepsFromPackage({ depNames, packageName, privatePackagesMetaData }) {
    for (const depName of depNames) {
        unlinkDepFromPackage({ depName, packageName, privatePackagesMetaData});
    }
}


function unlinkDepFromPackage({ depName, packageName, privatePackagesMetaData }) {
    const depsSymlinkDirInPackage = path.join(privatePackagesMetaData[packageName].packageBuildPath, 'packages');
    const symLinkPath = path.join(depsSymlinkDirInPackage, depName);
    if (fs.existsSync(symLinkPath)) {
        fs.unlinkSync(symLinkPath);
    }
    rmdirIfEmpty(depsSymlinkDirInPackage);
}


export function getFileBuildAbsPath(fileSrcAbsPath, { packageName, privatePackagesMetaData }) {
    const relPath = fileSrcAbsPath.split(privatePackagesMetaData[packageName].packageSrcPath)[1];
    return path.join(privatePackagesMetaData[packageName].packageBuildPath, relPath);
}