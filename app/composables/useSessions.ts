import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { generateSessionId } from '~/utils/sessionId'

export function useSessions() {
	const db = useDb()

	async function getCurrentSessionId(shopId: string): Promise<string | null> {
		const snap = await getDoc(doc(db, 'shops', shopId))
		if (!snap.exists()) return null
		const current = snap.data().currentSessionId
		return typeof current === 'string' && current.length > 0 ? current : null
	}

	// 会計処理：現在のセッションに未提供の注文（受付済み/調理中）が残っていないことを
	// アクティブ注文カウンタで確認したうえで、新しいセッションIDで原子的に更新する。
	// 未提供が残っている場合は会計できず、例外を投げる（トランザクションはロールバックされる）。
	async function startNewSession(shopId: string): Promise<string> {
		const shopRef = doc(db, 'shops', shopId)
		const activeCounterRef = doc(db, 'shops', shopId, 'counters', 'activeOrders')
		const newSessionId = await runTransaction(db, async (tx) => {
			const snap = await tx.get(shopRef)
			if (!snap.exists()) throw new Error('店舗が見つかりません')
			const actSnap = await tx.get(activeCounterRef)
			const activeCount = actSnap.exists() ? (actSnap.data().activeOrderCount ?? 0) : 0
			if (activeCount > 0) {
				throw new Error(`会計できません。未提供の注文が${activeCount}件あります。すべて提供済みにするか、キャンセルしてから会計してください。`)
			}
			const id = generateSessionId()
			tx.update(shopRef, {
				currentSessionId: id,
				updatedAt: serverTimestamp(),
			})
			return id
		})
		return newSessionId
	}

	// 例外処理：未提供の注文が残っていても強制的にセッションを終了する。
	// アクティブ注文カウンタを削除（0扱い）し、旧セッションの未提供注文は「要確認」として管理画面に残る。
	async function forceEndSession(shopId: string): Promise<string> {
		const shopRef = doc(db, 'shops', shopId)
		const activeCounterRef = doc(db, 'shops', shopId, 'counters', 'activeOrders')
		const newSessionId = await runTransaction(db, async (tx) => {
			const snap = await tx.get(shopRef)
			if (!snap.exists()) throw new Error('店舗が見つかりません')
			// Firestore のトランザクションは読み取りをすべて書き込みより先に行う必要があるため、
			// カウンタの読み取りを shopRef の更新より先に取得しておく
			const actSnap = await tx.get(activeCounterRef)
			const id = generateSessionId()
			tx.update(shopRef, {
				currentSessionId: id,
				updatedAt: serverTimestamp(),
			})
			if (actSnap.exists()) {
				tx.delete(activeCounterRef)
			}
			return id
		})
		return newSessionId
	}

	// セッション未初期化（旧データ等）の店舗にセッションを発行する（オーナー操作）
	async function ensureSession(shopId: string): Promise<string> {
		const current = await getCurrentSessionId(shopId)
		if (current) return current
		return startNewSession(shopId)
	}

	return { getCurrentSessionId, startNewSession, forceEndSession, ensureSession }
}
