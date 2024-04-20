import {
    packagesFileStructures,
    buildFileStructure,
    waitInMs
} from './constants.js';
import { wait } from './utils.js';

import {
    matchesFileStructure
} from '@liris-tech/hidash';

// =====================================================================================================================

export async function testSrcDirDifferentFromBuildDir(actions, paths) {
    const tests = [];

    // 1 ---------------------------------------------------------------------------------------------------------------

    const { stopLinker } = actions['1. building the sources'](paths);

    tests.push({
        description: `1. Building the sources. ${paths.privatePackagesSrcPath} -> ${paths.privatePackagesBuildPath}:`,
        passed: matchesFileStructure('.', [
            'playground', {dir: true},
                ['.meteor', {dir: true},
                    ['packages', {
                        content: [
                            '# B this should not be taken into account because it is a comment',
                            'B neither should this',
                            'A # this should'
                        ].join('\n')
                    }]
                ],
                ['meteor-packages', {dir: true},
                    ['domain-A-B', {dir: true},
                        ['A', {dir: true}, ...packagesFileStructures.packageA],
                        ['B', {dir: true}, ...packagesFileStructures.packageB],
                    ],
                    ['domain-C-D', {dir: true},
                        ['C', {dir: true}, ...packagesFileStructures.packageC],
                        ['D', {dir: true}, ...packagesFileStructures.packageD],
                    ]
                ],
                ['build', {dir: true}, ...buildFileStructure]
        ], {strict: true})
    });

    // 2 ---------------------------------------------------------------------------------------------------------------

    actions['2. Commenting useless line in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `2. Commenting useless line in .meteor/packages (${paths.dotMeteorPackagesPath}). Build shouldn't change:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 3 ---------------------------------------------------------------------------------------------------------------

    actions['3. Commenting package A in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `3: Commenting package A in .meteor/packages. Build should become empty:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
        ], {strict: true})
    });

    // 4 ---------------------------------------------------------------------------------------------------------------

    actions['4. Restoring package A in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `4: Restoring package A in .meteor/packages. Build should be restored: `,
        passed: matchesFileStructure('playground', [
            'build', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 5 ---------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfA,
        pathToPackageDotJsOfA
    } = actions['5. Changing dependencies of package A. Removing package B'](paths);

    await wait(waitInMs);

    tests.push({
        description: `5: changing ${pathToPackageDotJsOfA}. Removing dependency on B. Build should reflect that:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfA}], // CHANGE: content has api.use("B") commented
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]
                    ],
                    ['packages', {dir: true}, // CHANGE: packages doesn't contain B anymore
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ...packagesFileStructures.packageC,
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 6 ---------------------------------------------------------------------------------------------------------------

    const {
        pathToSourceFileInB
    } = actions["6. Changing source file in package B"](paths);

    await wait(waitInMs);

    tests.push({
        description: `6: Changing source file in package B (${pathToSourceFileInB}). B not being used in the project, the source file should not appear at all in the build file structure: `,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfA}],
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]
                    ],
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ...packagesFileStructures.packageC,
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 7 ---------------------------------------------------------------------------------------------------------------

    const {
        sourceFileInC,
        pathToSourceFileInC
    } = actions['7. Changing source file in package C'](paths);

    await wait(waitInMs);

    // build should still be exactly the same as in previous step except for the change in the source file in C.
    tests.push({
        description: `7. Changing source file in package C (${pathToSourceFileInC}). Package C (source and when present as dependency) should reflect that:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfA}],
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]
                    ],
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ['package.js', {
                                content: [
                                    'Package.describe({',
                                    "\tname: 'C'",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('D');",
                                    '});'
                                ].join('\n')
                            }],
                            ['src.js', {content: sourceFileInC}],
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'C'",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('D');",
                            '});'
                        ].join('\n')
                    }],
                    ['src.js', {content: sourceFileInC}],
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 8 ---------------------------------------------------------------------------------------------------------------

    actions['8. Changing dependencies of package A. Restoring package B'](paths);

    await wait(waitInMs);

    tests.push({
        description: `8. Changing dependencies of package A. Restoring package B (and source files ${pathToSourceFileInB}, ${pathToSourceFileInC}):`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 9 ---------------------------------------------------------------------------------------------------------------

    const {
        addedSourceFileInC,
        pathToAddedSourceFileInC
    } = actions['9. Adding a new source file to C'](paths);

    await wait(waitInMs);

    tests.push({
        description: `9. Adding a new source file to C (${pathToAddedSourceFileInC}):`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ...packagesFileStructures.packageA,
                    ['packages', {dir: true},
                        ['B', {dir: true},
                            ...packagesFileStructures.packageB,
                            ['packages', {dir: true},
                                ['C', {dir: true},
                                    ['package.js', {content: [
                                            'Package.describe({',
                                            "\tname: 'C'",
                                            '});',
                                            '',
                                            'Package.onUse(function(api) {',
                                            "\tapi.use('D');",
                                            '});'
                                        ].join('\n')}],
                                    ['src.js', {content: [
                                            'const c=3;'
                                        ].join('\n')}],
                                    ['new-src.js', {content: addedSourceFileInC}], // CHANGE: new source file
                                    ['packages', {dir: true},
                                        ['D', {dir: true},
                                            ...packagesFileStructures.packageD
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        ['C', {dir: true},
                            ['package.js', {content: [
                                    'Package.describe({',
                                    "\tname: 'C'",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('D');",
                                    '});'
                                ].join('\n')}],
                            ['src.js', {content: [
                                    'const c=3;'
                                ].join('\n')}],
                            ['new-src.js', {content: addedSourceFileInC}], // CHANGE: new source file
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['B', {dir: true},
                    ...packagesFileStructures.packageB,
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ['package.js', {content: [
                                    'Package.describe({',
                                    "\tname: 'C'",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('D');",
                                    '});'
                                ].join('\n')}],
                            ['src.js', {content: [
                                    'const c=3;'
                                ].join('\n')}],
                            ['new-src.js', {content: addedSourceFileInC}], // CHANGE: new source file
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ['package.js', {content: [
                            'Package.describe({',
                            "\tname: 'C'",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('D');",
                            '});'
                        ].join('\n')}],
                    ['src.js', {content: [
                            'const c=3;'
                        ].join('\n')}],
                    ['new-src.js', {content: addedSourceFileInC}], // CHANGE: new source file
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 10 --------------------------------------------------------------------------------------------------------------

    actions['10. Removing the new source file from C'](paths);

    await wait(10 * waitInMs); // for some reason, the detection of file removal via chokidar has a much larger delay

    tests.push({
        description: `10. Removing the new source file from C. Everything should be back to the original file structure:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 11 --------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfB,
        pathToPackageDotJsOfB
    } = actions['11. Renaming package B to Z'](paths);

    await wait(waitInMs);

    tests.push({
        description: `11. Renaming package B to Z (in ${pathToPackageDotJsOfB}). Package B completely disappears from build as it is not used in the project:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ...packagesFileStructures.packageA,
                    ['packages', {dir: true}, // CHANGE: package B no longer dependency of package A.
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ], // CHANGE: package B completely disappeared from build.
                ['C', {dir: true},
                    ...packagesFileStructures.packageC,
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 12 --------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfAWithZ,
    } = actions['12. Changing dependencies of package A. Adding package Z'](paths);

    await wait(waitInMs);

    tests.push({
        description: `12. Changing dependencies of package A. Adding package Z to ${pathToPackageDotJsOfA}. Original build file structure but with Z replacing B everywhere:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfAWithZ}], // CHANGE: package.js contains dependency on Z
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]],
                    ['packages', {dir: true},
                        ['Z', {dir: true}, // CHANGE: package Z
                            ['package.js', {
                                content: [
                                    'Package.describe({',
                                    "\tname: 'Z', // some other comment", // CHANGE (from before): package name B -> Z
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('C');",
                                    '});'
                                ].join('\n')
                            }],
                            ['entrypoint.js', {
                                content: [
                                    'const b=2;'
                                ].join('\n')
                            }],
                            ['packages', {dir: true},
                                ['C', {dir: true},
                                    ...packagesFileStructures.packageC,
                                    ['packages', {dir: true},
                                        ['D', {dir: true},
                                            ...packagesFileStructures.packageD
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['Z', {dir: true}, // CHANGE: package Z
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'Z', // some other comment", // CHANGE (from before): package name B -> Z
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('C');",
                            '});'
                        ].join('\n')
                    }],
                    ['entrypoint.js', {
                        content: [
                            'const b=2;'
                        ].join('\n')
                    }],
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ...packagesFileStructures.packageC,
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 13 --------------------------------------------------------------------------------------------------------------

    const {
        pathToDirectoryOfB,
        pathToDirectoryOfZ
    } = actions['13. Renaming directory B to Z'](paths);

    await wait(waitInMs);

    // exactly the same as in the previous step
    tests.push({
        description: `13. Renaming directory B to Z (${pathToDirectoryOfB} -> ${pathToDirectoryOfZ}). Build should not be affected at all:`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfAWithZ}],
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]],
                    ['packages', {dir: true},
                        ['Z', {dir: true},
                            ['package.js', {
                                content: [
                                    'Package.describe({',
                                    "\tname: 'Z', // some other comment",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('C');",
                                    '});'
                                ].join('\n')
                            }],
                            ['entrypoint.js', {
                                content: [
                                    'const b=2;'
                                ].join('\n')
                            }],
                            ['packages', {dir: true},
                                ['C', {dir: true},
                                    ...packagesFileStructures.packageC,
                                    ['packages', {dir: true},
                                        ['D', {dir: true},
                                            ...packagesFileStructures.packageD
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['Z', {dir: true},
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'Z', // some other comment",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('C');",
                            '});'
                        ].join('\n')
                    }],
                    ['entrypoint.js', {
                        content: [
                            'const b=2;'
                        ].join('\n')
                    }],
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ...packagesFileStructures.packageC,
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ...packagesFileStructures.packageC,
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    // 14 --------------------------------------------------------------------------------------------------------------

    const {
        pathToRenamedSourceFileInC
    } = actions['14. Renaming source file in C'](paths);

    // renaming a file, adds a file with the new name and deletes the file with the old name.
    // as in step 10, we need to wait longer for chokidar to pickup the file deletion.
    await wait(10 * waitInMs);

    tests.push({
        description: `14. Renaming source file in C (${pathToSourceFileInC} -> ${pathToRenamedSourceFileInC}):`,
        passed: matchesFileStructure('playground', [
            'build', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfAWithZ}],
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]],
                    ['packages', {dir: true},
                        ['Z', {dir: true},
                            ['package.js', {content: packageDotJsOfB}],
                            ['entrypoint.js', {
                                content: [
                                    'const b=2;'
                                ].join('\n')
                            }],
                            ['packages', {dir: true},
                                ['C', {dir: true},
                                    ['package.js', {
                                        content: [
                                            'Package.describe({',
                                            "\tname: 'C'",
                                            '});',
                                            '',
                                            'Package.onUse(function(api) {',
                                            "\tapi.use('D');",
                                            '});'
                                        ].join('\n')
                                    }],
                                    ['src-renamed.js', {
                                        content: [ // CHANGE: name of source file: src.js -> src-renamed.js
                                            'const c=3;'
                                        ].join('\n')
                                    }],
                                    ['packages', {dir: true},
                                        ['D', {dir: true},
                                            ...packagesFileStructures.packageD
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        ['C', {dir: true},
                            ['package.js', {
                                content: [
                                    'Package.describe({',
                                    "\tname: 'C'",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('D');",
                                    '});'
                                ].join('\n')
                            }],
                            ['src-renamed.js', {
                                content: [ // CHANGE: name of source file: src.js -> src-renamed.js
                                    'const c=3;'
                                ].join('\n')
                            }],
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['Z', {dir: true},
                    ['package.js', {content: packageDotJsOfB}],
                    ['entrypoint.js', {
                        content: [
                            'const b=2;'
                        ].join('\n')
                    }],
                    ['packages', {dir: true},
                        ['C', {dir: true},
                            ['package.js', {
                                content: [
                                    'Package.describe({',
                                    "\tname: 'C'",
                                    '});',
                                    '',
                                    'Package.onUse(function(api) {',
                                    "\tapi.use('D');",
                                    '});'
                                ].join('\n')
                            }],
                            ['src-renamed.js', {
                                content: [ // CHANGE: name of source file: src.js -> src-renamed.js
                                    'const c=3;'
                                ].join('\n')
                            }],
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['C', {dir: true},
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'C'",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('D');",
                            '});'
                        ].join('\n')
                    }],
                    ['src-renamed.js', {
                        content: [ // CHANGE: name of source file: src.js -> src-renamed.js
                            'const c=3;'
                        ].join('\n')
                    }],
                    ['packages', {dir: true},
                        ['D', {dir: true},
                            ...packagesFileStructures.packageD
                        ]
                    ]
                ],
                ['D', {dir: true},
                    ...packagesFileStructures.packageD
                ]
        ], {strict: true})
    });

    //  --------------------------------------------------------------------------------------------------------------

    stopLinker();

    return tests;
}
