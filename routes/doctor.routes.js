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
function getDaysArray(startDate, endDate) {
  return new Promise((resolve, reject) => {
    try {
      const daysArray = []
      let currentDate = new Date(startDate)

      // Loop para cada dia entre startDate e endDate
      while (currentDate <= endDate) {
        daysArray.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      resolve(daysArray)
    } catch (error) {
      reject(error)
    }
  })
}

async function obterDiasFerias(medico) {
  const diasFerias = []

  for (const ferias of medico.historicoFerias) {
    const dataFeriasInicio = new Date(ferias.dataInicio)
    const dataFeriasFim = new Date(ferias.dataFim)

    const diasFeriasPeriodo = await getDaysArray(dataFeriasInicio, dataFeriasFim)
    diasFerias.push(...diasFeriasPeriodo)
  }

  return diasFerias
}

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
    const diasDeFerias = await obterDiasFerias(novoMedico)
    novoMedico.diasDeFerias = diasDeFerias
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
