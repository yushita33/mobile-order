import { test, describe, before, after } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore'

const PROJECT_ID = 'demo-rules-test'
const HOST = '127.0.0.1'
const PORT = 8080
const RULES_FILE = 'firestore.rules'

const SHOP = 'shop-1'
const OWNER_UID = 'owner'
const CUSTOMER = 'cust-a'
const SESSION = 'sess-1'
const SESSION_2 = 'sess-2'

let testEnv

function shopPath(...segments) {
	return ['shops', SHOP, ...segments].join('/')
}

function orderData({ sessionId, orderNo, customerUid }) {
	return {
		tableId: 't1',
		sessionId,
		customerUid,
		orderNo,
		status: 'received',
		items: [{ menuId: 'm1', name: 'テストメニュー', price: 100, qty: 1, menuVersion: 1 }],
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	}
}

before(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: {
			host: HOST,
			port: PORT,
			rules: readFileSync(RULES_FILE, 'utf8'),
		},
	})
})

after(async () => {
	await testEnv.cleanup()
})

async function seed() {
	await testEnv.clearFirestore()
	const owner = testEnv.authenticatedContext(OWNER_UID)
	await setDoc(doc(owner.firestore(), 'shops', SHOP), {
		ownerUid: OWNER_UID,
		publicId: 'rules-test',
		name: 'テスト店',
		currentSessionId: SESSION,
		lastOrderNo: 0,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	})
}

// 注文作成（客）: order + counters/orders + counters/activeOrders(+1) を同一バッチで書き込む。
// アプリの createOrder() と同じ形で、現在のカウンタ値を読み取って set/update を選ぶ。
async function placeOrder(ctx, { orderId, sessionId, orderNo, customerUid }) {
	const db = ctx.firestore()
	const orderNoRef = doc(db, shopPath('counters', 'orders'))
	const activeRef = doc(db, shopPath('counters', 'activeOrders'))
	const noSnap = await getDoc(orderNoRef)
	const activeSnap = await getDoc(activeRef)
	const activeCount = activeSnap.exists() ? activeSnap.data().activeOrderCount : 0
	const batch = writeBatch(db)
	batch.set(doc(db, shopPath('orders', orderId)), orderData({ sessionId, orderNo, customerUid }))
	if (noSnap.exists()) {
		batch.update(orderNoRef, { lastOrderNo: orderNo, updatedAt: serverTimestamp() })
	}
	else {
		batch.set(orderNoRef, { lastOrderNo: orderNo, updatedAt: serverTimestamp() })
	}
	if (activeSnap.exists()) {
		batch.update(activeRef, { activeOrderCount: activeCount + 1, orderId, updatedAt: serverTimestamp() })
	}
	else {
		batch.set(activeRef, { activeOrderCount: activeCount + 1, orderId, updatedAt: serverTimestamp() })
	}
	return batch.commit()
}

describe('正常系', () => {
	test('1: 匿名客が注文作成 + カウンタ+1（同一バッチ）できる', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
	})

	test('2: オーナーが受付済み→提供済み + カウンタ-1（同一バッチ）できる', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const owner = testEnv.authenticatedContext(OWNER_UID)
		const db = owner.firestore()
		const batch = writeBatch(db)
		batch.update(doc(db, 'shops', SHOP, 'orders', 'o1'), {
			status: 'completed',
			updatedAt: serverTimestamp(),
		})
		batch.update(doc(db, 'shops', SHOP, 'counters', 'activeOrders'), {
			activeOrderCount: 0,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		})
		await assertSucceeds(batch.commit())
	})

	test('3: オーナーが受付済み→キャンセル + カウンタ-1（同一バッチ）できる', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const owner = testEnv.authenticatedContext(OWNER_UID)
		const db = owner.firestore()
		const batch = writeBatch(db)
		batch.update(doc(db, 'shops', SHOP, 'orders', 'o1'), {
			status: 'cancelled',
			cancelReason: 'other',
			updatedAt: serverTimestamp(),
		})
		batch.update(doc(db, 'shops', SHOP, 'counters', 'activeOrders'), {
			activeOrderCount: 0,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		})
		await assertSucceeds(batch.commit())
	})

	test('4: オーナーが強制終了（カウンタ削除 + セッション切替）できる', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const owner = testEnv.authenticatedContext(OWNER_UID)
		const db = owner.firestore()
		const batch = writeBatch(db)
		batch.delete(doc(db, shopPath('counters', 'activeOrders')))
		batch.update(doc(db, 'shops', SHOP), {
			currentSessionId: SESSION_2,
			updatedAt: serverTimestamp(),
		})
		await assertSucceeds(batch.commit())
	})

	test('5: カウンタ0（未作成）でオーナーが会計（セッション切替）できる', async () => {
		await seed()
		const owner = testEnv.authenticatedContext(OWNER_UID)
		await assertSucceeds(updateDoc(doc(owner.firestore(), 'shops', SHOP), {
			currentSessionId: SESSION_2,
			updatedAt: serverTimestamp(),
		}))
	})

	test('6: 旧セッション注文の完了はカウンタに触れずにできる', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const owner = testEnv.authenticatedContext(OWNER_UID)
		const db = owner.firestore()
		// 強制終了でセッション切替 + カウンタ削除。o1 は旧セッションの未提供注文として残る
		const force = writeBatch(db)
		force.delete(doc(db, shopPath('counters', 'activeOrders')))
		force.update(doc(db, 'shops', SHOP), {
			currentSessionId: SESSION_2,
			updatedAt: serverTimestamp(),
		})
		await assertSucceeds(force.commit())
		// 旧セッション注文は単一更新で完了できる
		await assertSucceeds(updateDoc(doc(db, 'shops', SHOP, 'orders', 'o1'), {
			status: 'completed',
			updatedAt: serverTimestamp(),
		}))
	})
})

describe('拒否系', () => {
	test('7: 注文を伴わないカウンタ+1は拒否される', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		// 新規IDを指定しても注文は作成されていない → 拒否
		await assertFails(updateDoc(doc(customer.firestore(), shopPath('counters', 'activeOrders')), {
			activeOrderCount: 2,
			orderId: 'o-new',
			updatedAt: serverTimestamp(),
		}))
	})

	test('8: 匿名ユーザーが注文を伴わずカウンタだけ+1しようとする → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const anon = testEnv.unauthenticatedContext()
		await assertFails(updateDoc(doc(anon.firestore(), shopPath('counters', 'activeOrders')), {
			activeOrderCount: 2,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		}))
	})

	test('9: 匿名ユーザーがカウンタ-1しようとする → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const anon = testEnv.unauthenticatedContext()
		await assertFails(updateDoc(doc(anon.firestore(), shopPath('counters', 'activeOrders')), {
			activeOrderCount: 0,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		}))
	})

	test('10: 注文だけ作成してカウンタを更新しない → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		const db = customer.firestore()
		const batch = writeBatch(db)
		batch.set(doc(db, 'shops', SHOP, 'orders', 'oA'), orderData({
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		// アクティブ注文カウンタは同一バッチに含めない
		await assertFails(batch.commit())
	})

	test('11: カウンタだけ更新して注文を作らない → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		const db = customer.firestore()
		const batch = writeBatch(db)
		batch.set(doc(db, shopPath('counters', 'activeOrders')), {
			activeOrderCount: 1,
			orderId: 'oX',
			updatedAt: serverTimestamp(),
		})
		// 対応する注文は同一バッチに含まれない
		await assertFails(batch.commit())
	})

	test('12: 既存の受付済み注文を参照してカウンタを+1する（使い回し）→ 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		// o1 は既に存在するため「新規作成」の条件を満たせず、同一注文への繰り返し参照は拒否される
		await assertFails(updateDoc(doc(customer.firestore(), shopPath('counters', 'activeOrders')), {
			activeOrderCount: 2,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		}))
	})

	test('13: 未認証でカウンタを作成しようとする → 拒否', async () => {
		await seed()
		const anon = testEnv.unauthenticatedContext()
		await assertFails(setDoc(doc(anon.firestore(), shopPath('counters', 'activeOrders')), {
			activeOrderCount: 1,
			orderId: 'oX',
			updatedAt: serverTimestamp(),
		}))
	})

	test('14: カウンタが0（消失）なのに現在セッション注文を完了 → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		await assertSucceeds(placeOrder(customer, {
			orderId: 'o1',
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		const owner = testEnv.authenticatedContext(OWNER_UID)
		const db = owner.firestore()
		// 異常状態の再現: 注文は存在するのにカウンタだけ消失している
		await assertSucceeds(deleteDoc(doc(db, shopPath('counters', 'activeOrders'))))
		// カウンタの減算を伴わない単一更新では、未提供→提供済みの遷移が拒否される（整合性を黙認しない）
		await assertFails(updateDoc(doc(db, 'shops', SHOP, 'orders', 'o1'), {
			status: 'completed',
			updatedAt: serverTimestamp(),
		}))
		// アプリ実装と同じ「-1 を試行」でも、負の値はルールで拒否される
		const batch = writeBatch(db)
		batch.update(doc(db, 'shops', SHOP, 'orders', 'o1'), { status: 'completed', updatedAt: serverTimestamp() })
		batch.set(doc(db, shopPath('counters', 'activeOrders')), {
			activeOrderCount: -1,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		})
		await assertFails(batch.commit())
	})

	test('15: 同一バッチで2件の注文と1回のカウンタ+1 → 拒否', async () => {
		await seed()
		const customer = testEnv.authenticatedContext(CUSTOMER)
		const db = customer.firestore()
		const batch = writeBatch(db)
		batch.set(doc(db, 'shops', SHOP, 'orders', 'o1'), orderData({
			sessionId: SESSION,
			orderNo: 1,
			customerUid: CUSTOMER,
		}))
		batch.set(doc(db, 'shops', SHOP, 'orders', 'o2'), orderData({
			sessionId: SESSION,
			orderNo: 2,
			customerUid: CUSTOMER,
		}))
		batch.set(doc(db, shopPath('counters', 'orders')), { lastOrderNo: 2, updatedAt: serverTimestamp() })
		// カウンタは1件分しか記録できない（単一 orderId フィールド）ため、どちらかの注文の
		// ペアリング条件が満たせず、ツリー全体が拒否される（カウンタ過小計上を防ぐ）
		batch.set(doc(db, shopPath('counters', 'activeOrders')), {
			activeOrderCount: 1,
			orderId: 'o1',
			updatedAt: serverTimestamp(),
		})
		await assertFails(batch.commit())
	})
})
