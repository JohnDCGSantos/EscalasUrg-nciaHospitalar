const express = require('express')
const Doctor = require('../models/Doctor.model')
const router = express.Router()
const Escala = require('../models/Escala.model')
const { isLoggedIn } = require('../middlewares/route-guard.middleware')
const ObjectId = require('mongoose').Types.ObjectId
const User = require('../models/User')
const { isAdmin } = require('../middlewares/route-guard.middleware')

//Get todos os médicos
router.get('/', isLoggedIn, async (req, res, next) => {
  const allDocs = await Doctor.find()

  res.render('doctors/all', { allDocs })
})

//Get página add médico
router.get('/adicionar', isLoggedIn, (req, res, next) => {
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
//rota para processar o add do médico
router.post('/adicionar', async (req, res, next) => {
  try {
    const { nome, email } = req.body
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

    const novoMedico = new Doctor({ nome, email, historicoFerias })
    const diasDeFerias = await obterDiasFerias(novoMedico)
    novoMedico.diasDeFerias = diasDeFerias
    await novoMedico.save()
    req.session.user.associatedDoctor = novoMedico._id

    res.redirect('/doctors')
  } catch (error) {
    console.error(error)

    if (error.code === 11000) {
      // Erro de duplicate key
      const errorMessage =
        error.keyPattern && error.keyPattern.email
          ? 'O e-mail fornecido já está em uso.'
          : error.keyPattern && error.keyPattern.nome
          ? 'O nome fornecido já está em uso.'
          : 'Erro ao adicionar médico'

      return res.render('doctors/new', {
        errorMessage,
      })
    }
    res.status(500).json({ error: 'Erro ao adicionar médico' })
  }
})
async function obterDiasTrabalhoDoMedico(medico) {
  try {
    // Lógica para obter os dias de trabalho do médico a partir da escala
    const escala = await Escala.find({ medicos: { $elemMatch: { idMedico: medico._id } } })

    if (!escala || escala.length === 0) {
      return []
    }

    const diasDeTrabalho = escala.reduce((result, semana) => {
      const diasTrabalhoSemana = semana.medicos
        .filter(medicoEscala => medicoEscala.idMedico.equals(medico._id))
        .map(medicoEscala => medicoEscala.dia.toISOString().split('T')[0])

      return result.concat(diasTrabalhoSemana)
    }, [])

    return diasDeTrabalho
  } catch (error) {
    console.error('Erro ao obter dias de trabalho do médico:', error)
    return []
  }
}

//rota para aceder a um médico
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' })
    }

    const medico = await Doctor.findById(req.params.id)

    if (!medico) {
      return res.status(404).json({ error: 'Médico não encontrado.' })
    }

    if (req.session.user.role === 'admin' || req.session.user.email === medico.email) {
      const escalas = await Escala.find({ 'medicos.medico': medico._id })
      const medicoNaEscalaInfo = []

      escalas.forEach(escala => {
        escala.medicos.forEach(medicoNaEscala => {
          if (medicoNaEscala.medico.toString() === req.params.id) {
            medicoNaEscalaInfo.push({
              escalaId: escala._id,
              dia: medicoNaEscala.dia,
              turno: medicoNaEscala.turno,
            })
          }
        })
      })

      return res.render('doctors/one', { medico, escalas, medicoNaEscalaInfo })
    }

    if (req.session.user.role === 'admin') {
      // Se for um administrador, permita o acesso
      const escalas = await Escala.find({ 'medicos.medico': medico._id })
      const medicoNaEscalaInfo = []

      escalas.forEach(escala => {
        escala.medicos.forEach(medicoNaEscala => {
          if (medicoNaEscala.medico.toString() === req.params.id) {
            medicoNaEscalaInfo.push({
              escalaId: escala._id,
              dia: medicoNaEscala.dia,
              turno: medicoNaEscala.turno,
            })
          }
        })
      })

      return res.render('doctors/one', { medico, escalas, medicoNaEscalaInfo })
    }

    return res.status(403).json({
      error: 'Acesso não autorizado a este médico. Faça login com as credenciais corretas.',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao buscar detalhes do médico' })
  }
})

//rota para aceder a pagina de update
router.get('/:id/update', isLoggedIn, async (req, res) => {
  const medicoId = req.params.id

  try {
    const medicoToUpdate = await Doctor.findById(medicoId)

    if (
      !req.session.user ||
      (req.session.user.role !== 'admin' && req.session.user.email !== medicoToUpdate.email)
    ) {
      return res.status(403).json({
        error: 'Acesso não autorizado a este médico. Faça login com as credenciais corretas.',
      })
    }

    res.render('doctors/updateDoc', { medico: medicoToUpdate })
  } catch (error) {
    console.error('Erro ao encontrar médico:', error)
    res.status(500).send('Erro ao encontrar médico.')
  }
})

// Rota para processar a atualização
router.post('/:id/update', async (req, res) => {
  const medicoId = req.params.id
  const { nome, email, feriasCount, ...historicoFerias } = req.body

  try {
    const medicoToUpdate = await Doctor.findById(medicoId)

    if (
      !req.session.user ||
      (req.session.user.role !== 'admin' && req.session.user.email !== medicoToUpdate.email)
    ) {
      return res.status(403).json({
        error: 'Acesso não autorizado a este médico. Faça login com as credenciais corretas.',
      })
    }

    // Parse dates and validate
    const formattedFerias = []
    for (let i = 0; i < feriasCount; i++) {
      const dataInicio = new Date(historicoFerias[`historicoFerias[${i}][dataInicio]`])
      const dataFim = new Date(historicoFerias[`historicoFerias[${i}][dataFim]`])

      // Perform additional validation
      if (isNaN(dataInicio) || isNaN(dataFim) || dataInicio > dataFim) {
        console.error('Invalid date range for vacation entry:', i)
        continue
      }

      formattedFerias.push({
        dataInicio,
        dataFim,
      })
    }

    // Update the document in the database
    const updatedDoc = await Doctor.findByIdAndUpdate(
      medicoId,
      {
        nome,
        email,
        historicoFerias: formattedFerias,
      },
      { new: true }
    )

    req.session.user.associatedDoctor = updatedDoc._id.toString()

    const diasDeFerias = await obterDiasFerias(updatedDoc)
    updatedDoc.diasDeFerias = diasDeFerias
    await updatedDoc.save()
    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao atualizar médico.')
  }
})

//rota para aceder a pagina de update
router.get('/:id/update', isLoggedIn, async (req, res) => {
  const medicoId = req.params.id

  try {
    const medicoToUpdate = await Doctor.findById(medicoId)

    if (
      !req.session.user ||
      (req.session.user.role !== 'admin' && req.session.user.email !== medicoToUpdate.email)
    ) {
      return res.status(403).json({
        error: 'Acesso não autorizado a este médico. Faça login com as credenciais corretas.',
      })
    }

    res.render('doctors/updateDoc', { medico: medicoToUpdate })
  } catch (error) {
    console.error('Erro ao encontrar médico:', error)
    res.status(500).send('Erro ao encontrar médico.')
  }
})

// Rota para processar a atualização
router.post('/:id/update', async (req, res) => {
  const medicoId = req.params.id
  const { nome, email, feriasCount, ...historicoFerias } = req.body

  try {
    const medicoToUpdate = await Doctor.findById(medicoId)

    if (
      !req.session.user ||
      (req.session.user.role !== 'admin' && req.session.user.email !== medicoToUpdate.email)
    ) {
      return res.status(403).json({
        error: 'Acesso não autorizado a este médico. Faça login com as credenciais corretas.',
      })
    }

    // Parse dates and validate
    const formattedFerias = []
    for (let i = 0; i < feriasCount; i++) {
      const dataInicio = new Date(historicoFerias[`historicoFerias[${i}][dataInicio]`])
      const dataFim = new Date(historicoFerias[`historicoFerias[${i}][dataFim]`])

      // Perform additional validation
      if (isNaN(dataInicio) || isNaN(dataFim) || dataInicio > dataFim) {
        console.error('Invalid date range for vacation entry:', i)
        continue
      }

      formattedFerias.push({
        dataInicio,
        dataFim,
      })
    }

    // Update the document in the database
    const updatedDoc = await Doctor.findByIdAndUpdate(
      medicoId,
      {
        nome,
        email,
        historicoFerias: formattedFerias,
      },
      { new: true }
    )

    req.session.user.associatedDoctor = updatedDoc._id.toString()

    const diasDeFerias = await obterDiasFerias(updatedDoc)
    updatedDoc.diasDeFerias = diasDeFerias
    await updatedDoc.save()
    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao atualizar médico.')
  }
})
//rota para eliminar médico
router.get('/:id/delete', isLoggedIn, async (req, res) => {
  try {
    const medico = await Doctor.findById(req.params.id)
    if (!medico) {
      return res.status(404).send('Médico não encontrado.')
    }
    res.render('doctors/delete', { medico })
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao buscar informações do médico para exclusão.')
  }
})

// Rota para processar a exclusão do médico
router.post('/:id/delete', async (req, res) => {
  try {
    const medicoId = req.params.id

    // Remova o médico pelo ID
    const deletedMedico = await Doctor.findByIdAndRemove(medicoId)

    // Se o médico foi excluído com sucesso
    if (deletedMedico) {
      res.redirect('/')
    } else {
      res.status(404).send('Médico não encontrado.')
    }
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao excluir médico.')
  }
})
/*router.post('/:id/delete', async (req, res) => {
  const medicoId = req.params.id

  try {
    // Find the doctor by ID
    const medico = await Doctor.findById(medicoId)

    if (!medico) {
      return res.status(404).send('Médico não encontrado.')
    }

    // If a specific vacation history entry ID is provided, delete it
    const historicoIdToDelete = req.body.historicoIdToDelete
    console.log(historicoIdToDelete)
    if (historicoIdToDelete) {
      // Remove the specific vacation history entry
      medico.historicoFerias = medico.historicoFerias.filter(
        entry => !entry._id.equals(historicoIdToDelete)
      )
    } else {
      // If no specific history ID provided, delete the entire doctor
      await Doctor.findByIdAndRemove(medicoId)
    }

    // Update diasDeFerias array
    const diasDeFerias = await obterDiasFerias(medico)
    medico.diasDeFerias = diasDeFerias
    await medico.save()

    res.redirect('/')
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao excluir médico.')
  }
})*/

module.exports = router
