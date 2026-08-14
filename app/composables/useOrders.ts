import {
	collection,
	doc,
	getDocs,
	runTransaction,
	onSnapshot,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
} from 'firebase/firestore'
import type { DocumentSnapshot } from 'firebase/firestore'
import type { Order, OrderItem, OrderStatus } from '~/types'
import { OrderStatus as Status } from '~/types'

export function useOrders() {
	const db = useDb()

	// Firestoreの注文文書 → アプリのOrder型への変換を1箇所に集約する。
	// 将来のフィールド正規化・型変換はここにだけ追加すればよい
	function toOrder(snap: DocumentSnapshot): Order {
		return { id: snap.id, ...snap.data() } as Order
	}

	async function createOrder(
		shopId: string,
		params: {
			tableId: string
			sessionId: string
			customerUid: string
			items: OrderItem[]
		},
	): Promise<{ orderId: string, orderNo: number }> {
		const { tableId, sessionId, customerUid, items } = params
		const orderItems = items.filter(i => i.qty > 0)
		if (orderItems.length === 0) {
			throw new Error('注文する商品がありません')
		}
		const orderRef = doc(collection(db, 'shops', shopId, 'orders'))
		const counterRef = doc(db, 'shops', shopId, 'counters', 'orders')
		const activeCounterRef = doc(db, 'shops', shopId, 'counters', 'activeOrders')
		const result = await runTransaction(db, async (tx) => {
			const counterSnap = await tx.get(counterRef)
			const orderNo = (counterSnap.exists() ? counterSnap.data().lastOrderNo : 0) + 1
			// 未提供（受付済み）注文としてアクティブ注文カウンタを +1 する。
			// ルールにより注文は現在セッションにのみ作成できるため、この加算は現在セッションの件数に対応する
			const actSnap = await tx.get(activeCounterRef)
			const activeCount = actSnap.exists() ? (actSnap.data().activeOrderCount ?? 0) : 0
			tx.set(orderRef, {
				tableId,
				sessionId,
				customerUid,
				orderNo,
				status: Status.RECEIVED,
				items: orderItems,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			})
			if (counterSnap.exists()) {
				tx.update(counterRef, {
					lastOrderNo: orderNo,
					updatedAt: serverTimestamp(),
				})
			}
			else {
				tx.set(counterRef, {
					lastOrderNo: orderNo,
					updatedAt: serverTimestamp(),
				})
			}
			if (actSnap.exists()) {
				tx.update(activeCounterRef, {
					activeOrderCount: activeCount + 1,
					// カウンタ更新の原因となった注文IDを記録する（ルールが同一バッチ内の注文と突合する）
					orderId: orderRef.id,
					updatedAt: serverTimestamp(),
				})
			}
			else {
				tx.set(activeCounterRef, {
					activeOrderCount: activeCount + 1,
					orderId: orderRef.id,
					updatedAt: serverTimestamp(),
				})
			}
			return { orderId: orderRef.id, orderNo }
		})
		return result
	}

	// 現在セッション（同じテーブルの全員）の注文を新しい順に取得する
	async function getOrdersBySession(
		shopId: string,
		tableId: string,
		sessionId: string,
	): Promise<Order[]> {
		const q = query(
			collection(db, 'shops', shopId, 'orders'),
			where('tableId', '==', tableId),
			where('sessionId', '==', sessionId),
			orderBy('createdAt', 'desc'),
		)
		const snap = await getDocs(q)
		return snap.docs.map(d => toOrder(d))
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
			const orders = snap.docs.map(d => toOrder(d))
			onOrders(orders)
		})
	}

	async function updateOrderStatus(
		shopId: string,
		orderId: string,
		status: OrderStatus,
		cancelReason?: string,
	) {
		const orderRef = doc(db, 'shops', shopId, 'orders', orderId)
		const shopRef = doc(db, 'shops', shopId)
		const activeCounterRef = doc(db, 'shops', shopId, 'counters', 'activeOrders')
		await runTransaction(db, async (tx) => {
			const orderSnap = await tx.get(orderRef)
			if (!orderSnap.exists()) throw new Error('注文が見つかりません')
			const order = orderSnap.data()
			const shopSnap = await tx.get(shopRef)
			const isActive = (s: OrderStatus) => s === Status.RECEIVED || s === Status.COOKING
			const prevActive = isActive(order.status as OrderStatus)
			const newActive = isActive(status)
			// 現在セッションの注文が「未提供 → 提供済み/キャンセル」になる場合のみカウンタを減算する。
			// 旧セッション（強制終了等の積み残し）や sessionId 不明の注文はカウンタ対象外。
			// トランザクション内では読み取りをすべて書き込みより先に行う必要があるため、先に取得しておく
			const shouldDecrement = prevActive && !newActive && order.sessionId === shopSnap.data()?.currentSessionId
			let actCount = 0
			let actExists = false
			if (shouldDecrement) {
				const actSnap = await tx.get(activeCounterRef)
				actExists = actSnap.exists()
				actCount = actExists ? (actSnap.data()?.activeOrderCount ?? 0) : 0
			}
			tx.update(orderRef, {
				status,
				...(cancelReason ? { cancelReason } : {}),
				updatedAt: serverTimestamp(),
			})
			// カウンタが0（または欠落）なのに減算しようとするとルール側で拒否され、
			// トランザクション全体が失敗して整合性の異常を黙って成功させない。
			// （旧セッション注文など shouldDecrement が false の場合はカウンタに触れない）
			if (shouldDecrement) {
				const newCount = actCount - 1
				if (actExists) {
					tx.update(activeCounterRef, {
						activeOrderCount: newCount,
						// カウンタ更新の原因となった注文IDを記録する（ルールが同一バッチ内の注文と突合する）
						orderId,
						updatedAt: serverTimestamp(),
					})
				}
				else {
					tx.set(activeCounterRef, {
						activeOrderCount: newCount,
						orderId,
						updatedAt: serverTimestamp(),
					})
				}
			}
		})
	}

	return { createOrder, getOrdersBySession, subscribeOrders, updateOrderStatus }
}
