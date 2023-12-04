// ℹ️ Gets access to environment variables/settings
// https://www.npmjs.com/package/dotenv
require('dotenv').config()

// ℹ️ Connects to the database
require('./db')

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const express = require('express')

const app = express()

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require('./config')(app)
require('./config/session')(app)

app.use((req, res, next) => {
  res.locals.user = req.session.user // Define a variável user globalmente
  next()
})

// default value for title local
const capitalize = require('./utils/capitalize')
const projectName = 'gestão de urgências'

app.locals.appTitle = `${capitalize(projectName)} `

// 👇 Start handling routes here
const indexRoutes = require('./routes/index.routes')
app.use('/', indexRoutes)

const doctorRoutes = require('./routes/doctor.routes')
app.use('/doctors', doctorRoutes)
const escalaRoutes = require('./routes/escala.routes')
app.use('/escala', escalaRoutes)

const authRouter = require('./routes/auth.routes') // <== has to be added
app.use('/user', authRouter)

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require('./error-handling')(app)

module.exports = app
