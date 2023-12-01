import { getAbsPath } from '../utils/getAbsPath.js';

import process from 'node:process';

// =====================================================================================================================

export function getEnvPaths( { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath } = {}) {
    return {
        dotMeteorPackagesPath: dotMeteorPackagesPath ??
            getAbsPath('.meteor', 'packages'),
        privatePackagesSrcPath: privatePackagesSrcPath ??
            getAbsPath(process.env['METEOR_PRIVATE_PACKAGE_DIRS'] || env['METEOR_PACKAGE_DIRS'] || 'packages'),
        privatePackagesBuildPath: privatePackagesBuildPath ??
            getAbsPath(process.env['METEOR_PACKAGE_DIRS'] || 'packages')
    }
}