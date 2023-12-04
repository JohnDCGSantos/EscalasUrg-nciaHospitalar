const { Router } = require('express')
const router = new Router()
const bcrypt = require('bcryptjs')
//const saltRounds = 10
const User = require('../models/User')
const mongoose = require('mongoose') // <== has to be added
const { isLoggedOut } = require('../middlewares/route-guard.middleware')
const Doctor = require('../models/Doctor.model')

router.get('/signup', isLoggedOut, (req, res) => res.render('auth/sign'))

router.post('/signup', async (req, res, next) => {
  console.log(req.body)
  const payload = { ...req.body }
  delete payload.password
  const salt = bcrypt.genSaltSync(13)

  //add property passwordHash to payload
  payload.passwordHash = bcrypt.hashSync(req.body.password, salt)

  try {
    // Verifica se o email e o username já estão em uso
    const existingUser = await User.findOne({
      $or: [{ email: payload.email.toLowerCase() }, { username: payload.username }],
    })

    if (existingUser) {
      // Renderiza a página de signup com a mensagem de erro apropriada
      return res.render('auth/sign', {
        errorMessage:
          existingUser.email === payload.email.toLowerCase()
            ? 'O email fornecido já está em uso.'
            : 'O nome de usuário fornecido já está em uso.',
        payload,
      })
    }
    const newUser = await User.create(payload)
    console.log('here is your new user', newUser)
    res.redirect('/user/login')
  } catch (error) {
    console.log(error)
  }
})

router.get('/login', (req, res) => res.render('auth/log'))

router.post('/login', async (req, res, next) => {
  console.log(req.body)
  try {
    const currentUser = req.body
    const checkedUser = await User.findOne({ email: currentUser.email.toLowerCase() })
    //console.log(checkedUser)
    if (checkedUser) {
      if (bcrypt.compareSync(currentUser.password, checkedUser.passwordHash)) {
        const loggedUser = { ...checkedUser._doc } //quando fazemos uma copia da base de dados temos que colocar ._doc para os dados nao se apresentarem de forma estranha
        delete loggedUser.passwordHash
        console.log(loggedUser)
        const associatedDoctor = await Doctor.findOne({ email: currentUser.email.toLowerCase() })

        if (associatedDoctor) {
          // Atualiza o campo associatedDoctor no objeto do usuário usando findOneAndUpdate
          await User.findOneAndUpdate(
            { _id: checkedUser._id },
            { $set: { associatedDoctor: associatedDoctor._id } },
            { new: true }
          )
        }
        req.session.user = loggedUser
        res.redirect('/')
      } else {
        console.log('pass is incorrect')
        res.render('auth/log', {
          errorMessage: 'wrong credentials',
          payload: { email: currentUser.email },
        })
      }
    } else {
      console.log('mail incorrect')
      res.render('auth/login', {
        errorMessage: 'wrong credentials',
        payload: { email: currentUser.email },
      })
    }
  } catch (error) {
    console.log(error)
  }
})
router.get('/logout', (req, res, next) => {
  res.render('auth/logout')
})
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) next(err)
    res.redirect('/')
  })
})

module.exports = router
