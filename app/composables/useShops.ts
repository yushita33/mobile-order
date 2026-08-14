import {
	collection,
	doc,
	setDoc,
	updateDoc,
	getDoc,
	getDocs,
	query,
	where,
	onSnapshot,
	serverTimestamp,
} from 'firebase/firestore'
import type { DocumentSnapshot } from 'firebase/firestore'
import type { Shop, ShopSettings } from '~/types'
import { generatePublicId } from '~/utils/publicId'
import { generateSessionId } from '~/utils/sessionId'

export function useShops() {
	const db = useDb()

	// Firestoreの店舗ドキュメント → アプリのShop型への変換を1箇所に集約する。
	// 将来のフィールド正規化・型変換はここにだけ追加すればよい
	function toShop(snap: DocumentSnapshot): Shop {
		return { id: snap.id, ...snap.data() } as Shop
	}

	async function generateUniquePublicId(): Promise<string> {
		for (let attempt = 0; attempt < 10; attempt++) {
			const candidate = generatePublicId()
			const snap = await getDocs(
				query(collection(db, 'shops'), where('publicId', '==', candidate)),
			)
			if (snap.empty) return candidate
		}
		throw new Error('publicId の生成に失敗しました。もう一度お試しください。')
	}

	async function createShop(
		uid: string,
		name: string,
	): Promise<{ shopId: string, publicId: string }> {
		const publicId = await generateUniquePublicId()
		const shopRef = doc(collection(db, 'shops'))
		const now = serverTimestamp()
		await setDoc(shopRef, {
			ownerUid: uid,
			publicId,
			name,
			description: '',
			logoUrl: '',
			lastOrderNo: 0,
			currentSessionId: generateSessionId(),
			createdAt: now,
			updatedAt: now,
		})
		await setDoc(doc(shopRef, 'settings', 'general'), {
			isOpen: true,
			taxRate: 0,
			currency: 'JPY',
			receiptMessage: '',
		})
		return { shopId: shopRef.id, publicId }
	}

	async function getShopById(shopId: string): Promise<Shop | null> {
		const snap = await getDoc(doc(db, 'shops', shopId))
		if (!snap.exists()) return null
		return toShop(snap)
	}

	async function getShopByPublicId(publicId: string): Promise<Shop | null> {
		const snap = await getDocs(
			query(collection(db, 'shops'), where('publicId', '==', publicId)),
		)
		if (snap.empty) return null
		return toShop(snap.docs[0]!)
	}

	// 店舗文書のライブ購読。currentSessionId（会計・セッション切替）の変更を画面へ即時反映するための購読で、
	// unsubscribe 関数を返す（subscribeOrders と同じパターン）
	function subscribeShop(
		shopId: string,
		onShop: (shop: Shop | null) => void,
	): () => void {
		return onSnapshot(doc(db, 'shops', shopId), (snap) => {
			onShop(snap.exists() ? toShop(snap) : null)
		})
	}

	async function getShopsByOwner(uid: string): Promise<Shop[]> {
		const snap = await getDocs(
			query(collection(db, 'shops'), where('ownerUid', '==', uid)),
		)
		return snap.docs.map(d => toShop(d))
	}

	async function updateShop(shopId: string, data: Partial<Shop>) {
		await updateDoc(doc(db, 'shops', shopId), {
			...data,
			updatedAt: serverTimestamp(),
		})
	}

	async function getSettings(shopId: string): Promise<ShopSettings | null> {
		const snap = await getDoc(doc(db, 'shops', shopId, 'settings', 'general'))
		return snap.exists() ? (snap.data() as ShopSettings) : null
	}

	async function updateSettings(shopId: string, data: Partial<ShopSettings>) {
		await setDoc(doc(db, 'shops', shopId, 'settings', 'general'), data, {
			merge: true,
		})
	}

	return {
		createShop,
		getShopById,
		getShopByPublicId,
		getShopsByOwner,
		subscribeShop,
		updateShop,
		getSettings,
		updateSettings,
	}
}
