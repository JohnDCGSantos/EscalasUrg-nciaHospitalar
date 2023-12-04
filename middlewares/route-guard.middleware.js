const isLoggedIn = (req, res, next) => {
  console.log('User Object:', req.session.user)

  if (!req.session.user) {
    return res.redirect('/user/login')
  }
  next()
}
const isAdmin = async (req, res, next) => {
  try {
    // Obter a lista de todas as escalas
    if (req.session.user.role !== 'admin') {
      const errorMessage = 'Action just for admins'
      return res.render('escalas/all', { errorMessage })
    }
    next()
  } catch (err) {
    console.error(err)
  }
}

const isLoggedOut = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/')
  }
  next()
}

module.exports = {
  isLoggedIn,
  isLoggedOut,
  isAdmin,
}
