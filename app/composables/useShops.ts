import {
	collection,
	doc,
	setDoc,
	updateDoc,
	getDoc,
	getDocs,
	query,
	where,
	serverTimestamp,
} from 'firebase/firestore'
import type { Shop, ShopSettings } from '~/types'
import { generatePublicId } from '~/utils/publicId'

export function useShops() {
	const db = useDb()

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
		return { id: snap.id, ...snap.data() } as Shop
	}

	async function getShopByPublicId(publicId: string): Promise<Shop | null> {
		const snap = await getDocs(
			query(collection(db, 'shops'), where('publicId', '==', publicId)),
		)
		if (snap.empty) return null
		const d = snap.docs[0]!
		return { id: d.id, ...d.data() } as Shop
	}

	async function getShopsByOwner(uid: string): Promise<Shop[]> {
		const snap = await getDocs(
			query(collection(db, 'shops'), where('ownerUid', '==', uid)),
		)
		return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Shop)
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
		updateShop,
		getSettings,
		updateSettings,
	}
}
