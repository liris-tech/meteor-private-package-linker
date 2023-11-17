import {
	existsSync,
	mkdirSync
} from 'node:fs'

// =====================================================================================================================

export function mkdirIfNotExists(absPath) {
	if (!existsSync(absPath)) {
		mkdirSync(absPath);
	}
}