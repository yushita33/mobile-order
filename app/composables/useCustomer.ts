import { signInAnonymously } from 'firebase/auth'

export function useCustomer() {
	const auth = useFirebaseAuth()

	// 未ログインでも注文・履歴を利用できるよう、常にUIDを取得する
	// ログイン済み（オーナー等）の場合はそのUIDを使う
	async function ensureGuestUid(): Promise<string> {
		if (!auth) throw new Error('認証が利用できません')
		const user = await getCurrentUser()
		if (user) return user.uid
		const credential = await signInAnonymously(auth)
		return credential.user.uid
	}

	return { ensureGuestUid }
}
