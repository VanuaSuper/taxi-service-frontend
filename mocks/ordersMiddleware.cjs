const fs = require('fs')
const pathModule = require('path')

const dbPath = pathModule.join(__dirname, 'db.json')

function json(res, status, data) {
  res.status(status)
  res.json(data)
}

function normalizePath(path) {
  if (typeof path !== 'string') return ''
  return path.startsWith('/api/') ? path.slice('/api'.length) : path
}

function readDb() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(raw)
    if (!db.users) db.users = []
    if (!db.orders) db.orders = []
    if (!db.drivers) db.drivers = []
    if (!db.reviews) db.reviews = []
    return db
  } catch {
    return { users: [], orders: [], drivers: [], reviews: [] }
  }
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

function getOrCreateDriverRecord(db, driverUserId) {
  let record = db.drivers.find((d) => d.userId === driverUserId)
  if (!record) {
    record = {
      id: String(driverUserId),
      userId: driverUserId,
      isOnline: false,
      coords: null,
      updatedAt: new Date().toISOString(),
    }
    db.drivers.push(record)
  }
  return record
}

function isFinalStatus(status) {
  return status === 'finished' || status === 'canceled_by_customer'
}

function isFinalStatusForCustomer(status) {
  return status === 'canceled_by_customer' || status === 'finished'
}

function canDriverSetStatus(current, next) {
  if (current === 'accepted' && next === 'arrived') return true
  if (current === 'arrived' && next === 'in_progress') return true
  if (current === 'in_progress' && next === 'finished') return true
  return false
}

module.exports = (req, res, next) => {
  const path = normalizePath(req.path)

  const user = req.user
  if (!user) {
    return json(res, 500, {
      message:
        'authGuard не установил req.user. Проверь порядок middleware: corsMiddleware -> authGuard -> остальные',
    })
  }

  // Never expose /users from json-server, because it contains passwordHash.
  // For UI data (name/phone) use dedicated endpoints with role checks.
  if (path === '/users' || path.startsWith('/users/')) {
    return json(res, 403, { message: 'Доступ запрещён' })
  }

  // CUSTOMER endpoints
  if (path.startsWith('/customers/')) {
    // GET /customers/drivers/:id/public
    if (req.method === 'GET' && /^\/customers\/drivers\/[^/]+\/public$/.test(path)) {
      const driverId = path.split('/')[3]
      const db = readDb()

      const hasOrderWithThisDriver = db.orders.some((o) => {
        if (String(o.customerId) !== String(user.id)) return false
        if (!o.driverId) return false
        if (String(o.driverId) !== String(driverId)) return false
        if (o.status === 'canceled_by_customer') return false
        return true
      })

      if (!hasOrderWithThisDriver) {
        return json(res, 403, { message: 'Доступ запрещён' })
      }

      const driverUser = db.users.find((u) => String(u.id) === String(driverId))
      if (!driverUser) {
        return json(res, 404, { message: 'Водитель не найден' })
      }

      return json(res, 200, {
        id: driverUser.id,
        name: driverUser.name,
        phone: driverUser.phone,
      })
    }

    // GET /customers/orders/current
    if (req.method === 'GET' && path === '/customers/orders/current') {
      const db = readDb()

      // last active order of this customer
      const activeOrders = db.orders.filter((o) => {
        if (String(o.customerId) !== String(user.id)) return false
        if (isFinalStatusForCustomer(o.status)) return false
        return true
      })

      const order = activeOrders.length ? activeOrders[activeOrders.length - 1] : null
      return json(res, 200, order)
    }

    // POST /customers/orders/:id/cancel
    if (req.method === 'POST' && /^\/customers\/orders\/[^/]+\/cancel$/.test(path)) {
      const orderId = path.split('/')[3]
      const db = readDb()

      const order = db.orders.find((o) => String(o.id) === String(orderId))
      if (!order) {
        return json(res, 404, { message: 'Заказ не найден' })
      }

      if (String(order.customerId) !== String(user.id)) {
        return json(res, 403, { message: 'Это не ваш заказ' })
      }

      if (order.status !== 'searching_driver') {
        return json(res, 409, { message: 'Нельзя отменить заказ на этом этапе' })
      }

      order.status = 'canceled_by_customer'
      writeDb(db)
      return json(res, 200, order)
    }

    return next()
  }

  // DRIVER endpoints
  if (!path.startsWith('/drivers/')) {
    return next()
  }

  // GET /drivers/customers/:id/public
  if (req.method === 'GET' && /^\/drivers\/customers\/[^/]+\/public$/.test(path)) {
    const customerId = path.split('/')[3]
    const db = readDb()

    const activeOrderForThisCustomer = db.orders.find((o) => {
      const driverId = o.driverId
      if (!driverId) return false
      if (String(driverId) !== String(user.id)) return false
      if (isFinalStatus(o.status)) return false
      if (String(o.customerId) !== String(customerId)) return false
      return true
    })

    if (!activeOrderForThisCustomer) {
      return json(res, 403, { message: 'Доступ запрещён' })
    }

    const customer = db.users.find((u) => String(u.id) === String(customerId))
    if (!customer) {
      return json(res, 404, { message: 'Клиент не найден' })
    }

    return json(res, 200, {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    })
  }

  // POST /drivers/me/online
  if (req.method === 'POST' && path === '/drivers/me/online') {
    const db = readDb()
    const record = getOrCreateDriverRecord(db, user.id)
    record.isOnline = true
    record.updatedAt = new Date().toISOString()
    writeDb(db)
    return json(res, 200, record)
  }

  // POST /drivers/me/offline
  if (req.method === 'POST' && path === '/drivers/me/offline') {
    const db = readDb()
    const record = getOrCreateDriverRecord(db, user.id)
    record.isOnline = false
    record.coords = null
    record.updatedAt = new Date().toISOString()
    writeDb(db)
    return json(res, 200, record)
  }

  // POST /drivers/me/location
  if (req.method === 'POST' && path === '/drivers/me/location') {
    const { lat, lon } = req.body ?? {}
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return json(res, 400, { message: 'Некорректные координаты' })
    }

    const db = readDb()
    const record = getOrCreateDriverRecord(db, user.id)
    record.coords = [lat, lon]
    record.updatedAt = new Date().toISOString()
    writeDb(db)

    return json(res, 200, record)
  }

  // GET /drivers/orders/current
  if (req.method === 'GET' && path === '/drivers/orders/current') {
    const db = readDb()

    const order = db.orders.find((o) => {
      const driverId = o.driverId
      if (!driverId) return false
      if (String(driverId) !== String(user.id)) return false
      if (isFinalStatus(o.status)) return false
      return true
    })

    return json(res, 200, order ?? null)
  }

  // GET /drivers/orders/available
  if (req.method === 'GET' && path === '/drivers/orders/available') {
    const db = readDb()

    const orders = db.orders.filter((o) => {
      if (o.status !== 'searching_driver') return false
      if (o.driverId) return false
      return true
    })

    return json(res, 200, orders)
  }

  // POST /drivers/orders/:id/accept
  if (req.method === 'POST' && /^\/drivers\/orders\/[^/]+\/accept$/.test(path)) {
    const orderId = path.split('/')[3]
    const db = readDb()

    const order = db.orders.find((o) => String(o.id) === String(orderId))
    if (!order) {
      return json(res, 404, { message: 'Заказ не найден' })
    }

    if (order.status !== 'searching_driver' || order.driverId) {
      return json(res, 409, { message: 'Заказ уже принят другим водителем' })
    }

    order.status = 'accepted'
    order.driverId = user.id
    order.acceptedAt = new Date().toISOString()

    writeDb(db)
    return json(res, 200, order)
  }

  // POST /drivers/orders/:id/status
  if (req.method === 'POST' && /^\/drivers\/orders\/[^/]+\/status$/.test(path)) {
    const orderId = path.split('/')[3]
    const { status } = req.body ?? {}

    const db = readDb()
    const order = db.orders.find((o) => String(o.id) === String(orderId))
    if (!order) {
      return json(res, 404, { message: 'Заказ не найден' })
    }

    if (String(order.driverId) !== String(user.id)) {
      return json(res, 403, { message: 'Это не ваш заказ' })
    }

    if (typeof status !== 'string') {
      return json(res, 400, { message: 'Некорректный статус' })
    }

    if (!canDriverSetStatus(order.status, status)) {
      return json(res, 409, { message: 'Нельзя перевести заказ в этот статус' })
    }

    order.status = status
    writeDb(db)
    return json(res, 200, order)
  }

  return next()
}
