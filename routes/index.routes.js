const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { isLoggedIn } = require('../middlewares/route-guard.middleware')

/* GET home page */
router.get('/', isLoggedIn, (req, res, next) => {
  console.log(req.session)
  res.render('index', { user: req.session.user })
})
/*router.get('/profile', isLoggedIn, (req, res, next) => {
  console.log(req.session)

  res.render('user/profile', { user: req.session.user })
})*/
module.exports = router
