const express = require('express')
const Doctor = require('../models/Doctor.model')
const router = express.Router()

router.get('/', async (req, res, next) => {
  const allDocs = await Doctor.find()

  res.render('doctors/all', { allDocs })
})

router.get('/adicionar', (req, res, next) => {
  res.render('doctors/new')
})
router.post('/adicionar', async (req, res, next) => {
  try {
    const { nome } = req.body
    let dataInicio = req.body['historicoFerias[dataInicio][]']
    let dataFim = req.body['historicoFerias[dataFim][]']
    const historicoFerias = []

    if (!Array.isArray(dataInicio)) {
      dataInicio = [dataInicio]
    }
    if (!Array.isArray(dataFim)) {
      dataFim = [dataFim]
    }

    const count = Math.min(dataInicio.length, dataFim.length)

    for (let i = 0; i < count; i++) {
      historicoFerias.push({
        dataInicio: dataInicio[i],
        dataFim: dataFim[i],
      })
    }

    const novoMedico = new Doctor({ nome, historicoFerias })

    await novoMedico.save()

    res.redirect('/doctors')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao adicionar médico' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const medico = await Doctor.findById(req.params.id)
    console.log(medico)
    res.render('doctors/one', { medico })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar detalhes do médico' })
  }
})
module.exports = router
