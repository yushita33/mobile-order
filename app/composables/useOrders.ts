import {
	collection,
	doc,
	getDoc,
	updateDoc,
	runTransaction,
	onSnapshot,
	query,
	orderBy,
	limit,
	serverTimestamp,
} from 'firebase/firestore'
import type { Order, OrderItem, OrderStatus } from '~/types'
import { DEFAULT_TABLE_ID, OrderStatus as Status } from '~/types'

export function useOrders() {
	const db = useDb()

	async function createOrder(
		shopId: string,
		items: OrderItem[],
	): Promise<{ orderId: string, orderNo: number }> {
		const shopRef = doc(db, 'shops', shopId)
		const orderRef = doc(collection(db, 'shops', shopId, 'orders'))
		const result = await runTransaction(db, async (tx) => {
			const shopSnap = await tx.get(shopRef)
			if (!shopSnap.exists()) {
				throw new Error('店舗が見つかりません')
			}
			const orderNo = (shopSnap.data().lastOrderNo ?? 0) + 1
			tx.set(orderRef, {
				tableId: DEFAULT_TABLE_ID,
				orderNo,
				status: Status.RECEIVED,
				items,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			})
			tx.update(shopRef, {
				lastOrderNo: orderNo,
				updatedAt: serverTimestamp(),
			})
			return { orderId: orderRef.id, orderNo }
		})
		return result
	}

	function subscribeOrders(
		shopId: string,
		onOrders: (orders: Order[]) => void,
	): () => void {
		const q = query(
			collection(db, 'shops', shopId, 'orders'),
			orderBy('createdAt', 'desc'),
			limit(100),
		)
		return onSnapshot(q, (snap) => {
			const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Order)
			onOrders(orders)
		})
	}

	async function updateOrderStatus(
		shopId: string,
		orderId: string,
		status: OrderStatus,
	) {
		await updateDoc(doc(db, 'shops', shopId, 'orders', orderId), {
			status,
			updatedAt: serverTimestamp(),
		})
	}

	async function getOrder(
		shopId: string,
		orderId: string,
	): Promise<Order | null> {
		const snap = await getDoc(doc(db, 'shops', shopId, 'orders', orderId))
		if (!snap.exists()) return null
		return { id: snap.id, ...snap.data() } as Order
	}

	return { createOrder, subscribeOrders, updateOrderStatus, getOrder }
}
