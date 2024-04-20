import path from 'node:path';
import fs from 'node:fs';

// =====================================================================================================================

export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export function getPathOfPackage(packageName, paths) {
    const { privatePackagesSrcPath, privatePackagesBuildPath } = paths;
    const intermediaryPath = (['A', 'B'].includes(packageName))
        ? 'domain-A-B'
        : 'domain-C-D';
    return (privatePackagesSrcPath === privatePackagesBuildPath)
        ? path.join(privatePackagesSrcPath, packageName)
        : path.join(privatePackagesSrcPath, intermediaryPath, packageName);
}


export function nukeDir(dirName) {
    if (fs.existsSync(dirName)) {
        fs.rmSync(dirName, {recursive: true});
    }
}