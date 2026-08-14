// Firestore操作で発生するエラーをアプリ側で判定するためのユーティリティ。
// 判定ロジックを複数画面（cart / history 等）で共通利用するため切り出している。

// Firestore Rulesによる拒否（permission-denied）かを判定する。
// 優先してエラーコードを見て、古いSDKやラップされたエラー向けにメッセージでも補完する。
export function isPermissionDenied(e: unknown): boolean {
	if (typeof e === 'object' && e !== null && 'code' in e) {
		const code = (e as { code?: unknown }).code
		if (typeof code === 'string') {
			return code === 'permission-denied'
				|| code.endsWith('/permission-denied')
		}
	}
	if (e instanceof Error) {
		// 例: "PERMISSION_DENIED: Missing or insufficient permissions."
		// 無関係な文言（例: "Permission configuration is invalid"）を拾わないよう、
		// "permission" と "denied" が連続する形だけを対象にする
		return /permission[_\s-]*denied/i.test(e.message)
	}
	return false
}
