function roleBasedRouteGuard(allowedRoles) {
  if (allowedRoles == null) {
    throw new Error('roleBasedRouteGuard: allowedRoles must be provided')
  }

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (rolesArray.length === 0) {
    throw new Error('roleBasedRouteGuard: allowedRoles must contain at least one role')
  }

  const normalizedAllowedRoles = rolesArray.map(role => {
    if (typeof role !== 'string' && typeof role !== 'number') {
      throw new TypeError(`roleBasedRouteGuard: role "${role}" must be a string or number`)
    }
    return String(role).toLowerCase()
  })

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized' })
    }

    const userRolesRaw = req.user.roles
    if (userRolesRaw == null) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' })
    }

    const userRolesArray = Array.isArray(userRolesRaw) ? userRolesRaw : [userRolesRaw]
    if (userRolesArray.length === 0) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' })
    }

    const normalizedUserRoles = userRolesArray
      .map(role => {
        if (typeof role !== 'string' && typeof role !== 'number') {
          return null
        }
        return String(role).toLowerCase()
      })
      .filter(r => r)

    const isAuthorized = normalizedUserRoles.some(r => normalizedAllowedRoles.includes(r))
    if (!isAuthorized) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' })
    }

    next()
  }
}

module.exports = roleBasedRouteGuard