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

export async function testSrcDirSameAsBuildDir(actions, paths) {
    const tests = [];

    // 1 ---------------------------------------------------------------------------------------------------------------

    const { stopLinker } = actions['1. building the sources'](paths);

    tests.push({
        description: `1. Building the sources. Packages built into subdirectories inside ${paths.privatePackagesBuildPath}:`,
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
                ['packages', {dir: true}, ...buildFileStructure]
        ], {strict: true})
    });

    // 2 ---------------------------------------------------------------------------------------------------------------

    actions['2. Commenting useless line in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `2. Commenting useless line in .meteor/packages (${paths.dotMeteorPackagesPath}). Build shouldn't change:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 3 ---------------------------------------------------------------------------------------------------------------

    actions['3. Commenting package A in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `3. Commenting package A in .meteor/packages. 'packages' sub-dirs (i.e. build) should disappear:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
                ['A', {dir: true}, ...packagesFileStructures.packageA],
                ['B', {dir: true}, ...packagesFileStructures.packageB],
                ['C', {dir: true}, ...packagesFileStructures.packageC],
                ['D', {dir: true}, ...packagesFileStructures.packageD]
        ], {strict: true})
    });

    // 4 ---------------------------------------------------------------------------------------------------------------

    actions['4. Restoring package A in .meteor/packages'](paths);

    await wait(waitInMs);

    tests.push({
        description: `4: Restoring package A in .meteor/packages. Build (i.e. 'packages' sub-dirs) should be restored: `,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 5 ---------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfA,
        pathToPackageDotJsOfA
    } = actions['5. Changing dependencies of package A. Removing package B'](paths);

    await wait(waitInMs);

    tests.push({
        description: `5. Changing dependencies of package A. Removing package B in ${pathToPackageDotJsOfA}:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
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
                ['B', {dir: true}, ...packagesFileStructures.packageB], // CHANGE: package B is not used in project anymore
                ['C', {dir: true},                                      // and therefore doesn't contain 'packages' sub-dir
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
        sourceFileInB,
        pathToSourceFileInB
    } = actions["6. Changing source file in package B"](paths);

    await wait(waitInMs);

    tests.push({
        description: `6. Changing source file in package B (${pathToSourceFileInB}). B not being used in project, it shouldn't have any 'packages' sub-dirs:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
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
                ['B', {dir: true},
                    ['entrypoint.js', {content: sourceFileInB}], // CHANGE: content of entrypoint.js
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'B', // some other comment",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('C');",
                            '});'
                        ].join('\n')
                    }]
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

    tests.push({
        description: `7. Changing source file in package C (${pathToSourceFileInC}). Package C (source and when present as dependency) should reflect that:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
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
                            ['src.js', {content: sourceFileInC}], // CHANGE: content of src.js
                            ['packages', {dir: true},
                                ['D', {dir: true},
                                    ...packagesFileStructures.packageD
                                ]
                            ]
                        ]
                    ]
                ],
                ['B', {dir: true},
                    ['entrypoint.js', {content: sourceFileInB}],
                    ['package.js', {
                        content: [
                            'Package.describe({',
                            "\tname: 'B', // some other comment",
                            '});',
                            '',
                            'Package.onUse(function(api) {',
                            "\tapi.use('C');",
                            '});'
                        ].join('\n')
                    }]
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
                    ['src.js', {content: sourceFileInC}], // CHANGE: content of src.js
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
            'packages', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 9 ---------------------------------------------------------------------------------------------------------------

    const {
        addedSourceFileInC,
        pathToAddedSourceFileInC
    } = actions['9. Adding a new source file to C'](paths);

    await wait(waitInMs);

    // original build file structure enriched with addedSourceFileInC
    tests.push({
        description: `9. Adding a new source file to C (${pathToAddedSourceFileInC}):`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
                ['A', {dir: true},
                    ...packagesFileStructures.packageA,
                    ['packages', {dir: true},
                        ['B', {dir: true},
                            ...packagesFileStructures.packageB,
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
                                    ['src.js', {
                                        content: [
                                            'const c=3;'
                                        ].join('\n')
                                    }],
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
                            ['src.js', {
                                content: [
                                    'const c=3;'
                                ].join('\n')
                            }],
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
                            ['src.js', {
                                content: [
                                    'const c=3;'
                                ].join('\n')
                            }],
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
                    ['src.js', {
                        content: [
                            'const c=3;'
                        ].join('\n')
                    }],
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

    await wait(waitInMs);

    tests.push({
        description: `10. Removing the new source file from C. Everything should be back to the original file structure:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true}, ...buildFileStructure
        ], {strict: true})
    });

    // 11 --------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfB,
        pathToPackageDotJsOfB
    } = actions['11. Renaming package B to Z'](paths);

    await wait(waitInMs);

    tests.push({
        description: `11. Renaming package B to Z (in ${pathToPackageDotJsOfB}). Source dir of B should stay but 'packages' build sub-dir disappear:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
                ['A', {dir: true},
                    ...packagesFileStructures.packageA,
                    ['packages', {dir: true}, // CHANGE: package B not in dependencies of A anymore
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
                ['B', {dir: true},
                    ['package.js', {content: packageDotJsOfB}],
                    ['entrypoint.js', {
                        content: [
                            'const b=2;'
                        ].join('\n')
                    }]
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

    // 12 --------------------------------------------------------------------------------------------------------------

    const {
        packageDotJsOfAWithZ,
    } = actions['12. Changing dependencies of package A. Adding package Z'](paths);

    await wait(waitInMs);

    tests.push({
        description: `12. Changing dependencies of package A. Adding package Z to ${pathToPackageDotJsOfA}. Source of B should be untouched but should appear with the name Z as dependencies:`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
                ['A', {dir: true},
                    ['package.js', {content: packageDotJsOfAWithZ}],
                    ['src', {dir: true},
                        ['index.js', {
                            content: [
                                'const a=1;'
                            ].join('\n')
                        }]],
                    ['packages', {dir: true},
                        ['Z', {dir: true}, // CHANGE: package Z appears as dependency
                            ['package.js', {content: packageDotJsOfB}],
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
                ['B', {dir: true},
                    ['package.js', {content: packageDotJsOfB}],
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

    tests.push({
        description: `13. Renaming directory B to Z (${pathToDirectoryOfB} -> ${pathToDirectoryOfZ}). No more package dir should be name B anymore.`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
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
                ['Z', {dir: true}, // CHANGE: renamed directory B -> Z
                    ['package.js', {content: packageDotJsOfB}],
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

    await wait(waitInMs);

    tests.push({
        description: `14. Renaming source file in C (${pathToSourceFileInC} -> ${pathToRenamedSourceFileInC}):`,
        passed: matchesFileStructure('playground', [
            'packages', {dir: true},
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

    // -----------------------------------------------------------------------------------------------------------------

    stopLinker();

    return tests;
}