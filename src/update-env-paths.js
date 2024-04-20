import process from 'node:process';
import path from 'node:path';

// =====================================================================================================================

export function getEnvPaths( { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath } = {}) {
    return {
        dotMeteorPackagesPath: dotMeteorPackagesPath
            ? path.resolve(dotMeteorPackagesPath)
            : path.resolve('.meteor', 'packages'),
        privatePackagesSrcPath: privatePackagesSrcPath
            ? path.resolve(privatePackagesSrcPath)
            : path.resolve(
                process.env['METEOR_PRIVATE_PACKAGE_DIRS'] ||
                process.env['METEOR_PACKAGE_DIRS'] ||
                'packages'
            ),
        privatePackagesBuildPath: privatePackagesBuildPath
            ? path.resolve(privatePackagesBuildPath)
            : path.resolve(process.env['METEOR_PACKAGE_DIRS'] || 'packages')
    }
}