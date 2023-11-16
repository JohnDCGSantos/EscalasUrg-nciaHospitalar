const express = require('express')
const Doctor = require('../models/Doctor.model')
const Escala = require('../models/Escala.model')
const router = express.Router()

// Rota para exibir o formulário de criação da escala
router.get('/criar', async (req, res) => {
  try {
    // Consultar banco de dados para obter a lista de médicos disponíveis
    const doctors = await Doctor.find()
    //console.log(doctors)
    res.render('escalas/nova', { doctors })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao carregar a página de criação de escala' })
  }
})

// Rota para criar uma nova escala
let medicosSelecionados = []

router.post('/criar', async (req, res) => {
  try {
    const dataInicioString = req.body.dataInicio
    const dataFimString = req.body.dataFim
    const dataInicio = new Date(dataInicioString)
    const dataFim = new Date(dataFimString)

    medicosSelecionados = req.body.medicos // Atualizar os médicos selecionados
    console.log('Medicos Selecionados:', medicosSelecionados) // Visualizar a estrutura dos médicos

    if (!medicosSelecionados || medicosSelecionados.length < 14) {
      return res.status(400).json({ error: 'Selecione pelo menos 14 médicos para criar a escala.' })
    }
    const medicoIds = medicosSelecionados.map(medico => medico.split(':')[0])

    const diasDeFeriasPorMedico = {}
    for (const medicoId of medicoIds) {
      const medico = await Doctor.findById(medicoId)
      diasDeFeriasPorMedico[medicoId] = medico.diasDeFerias || []
    }
    // Calcular as semanas com função calcularSemanas
    const semanas = calcularSemanas(dataInicio, dataFim)

    const escala = []

    semanas.forEach((semana, index) => {
      // Aqui você tem cada semana dentro do loop para processamento
      const dataInicioSemana = semana[0]
      const dataFimSemana = semana[semana.length - 1]

      // Restante da lógica para criar a escala usando medicosSelecionados
      const medicosSemana = distribuirMedicosParaSemana(medicosSelecionados)

      const numDiasSemana = semana.length

      console.log(
        `Semana ${
          index + 1
        }: De ${dataInicioSemana.toDateString()} a ${dataFimSemana.toDateString()}`
      )
      console.log(`Número de dias na semana: ${numDiasSemana}`)
      console.log(`Médicos disponíveis: ${medicosSemana.length}`)

      const escalaSemana = criarEscala(
        dataInicioSemana,
        numDiasSemana,
        medicosSemana,
        diasDeFeriasPorMedico
      )

      escala.push(...escalaSemana)
    })

    const novaEscala = new Escala({
      dataInicio: new Date(dataInicioString),
      dataFim: dataFim,
      medicos: escala,
    })

    // Salve a nova escala no banco de dados
    await novaEscala.save()

    // Redirecione para a página dos médicos
    res.redirect('/doctors')
  } catch (error) {
    console.error(error)
    if (error.message.includes('Não há médicos suficientes para os turnos obrigatórios.')) {
      res.status(400).json({
        error:
          'Não há médicos disponíveis para os turnos obrigatórios. Verifique as datas de férias dos médicos!! Certifique-se de que há mais médicos disponíveis para selecionar e tente novamente.',
      })
    } else {
      res.status(500).json({ error: 'Erro ao gerar a escala' })
    }
  }
})

function calcularSemanas(dataInicio, dataFim) {
  const semanas = []
  let dataAtual = new Date(dataInicio)

  while (dataAtual <= dataFim) {
    const semana = []

    // Lógica para preencher a semana...

    if (dataAtual <= dataFim) {
      semana.push(new Date(dataAtual))
      dataAtual.setDate(dataAtual.getDate() + 1)
    }

    // Iterar até o sábado da semana corrente
    while (dataAtual.getDay() !== 6 && dataAtual <= dataFim) {
      semana.push(new Date(dataAtual))
      dataAtual.setDate(dataAtual.getDate() + 1)
    }

    // Adicionar a semana ao array de semanas
    semanas.push(semana)

    // Incrementar para o próximo dia (domingo)
    if (dataAtual <= dataFim) {
      semana.push(new Date(dataAtual))
      dataAtual.setDate(dataAtual.getDate() + 1)
    }
  }
  return semanas
}

// Função para distribuir médicos para uma semana
function distribuirMedicosParaSemana(medicosSelecionados) {
  // Embaralhe os médicos para esta semana (ou implemente sua lógica de distribuição)
  return shuffleArray([...medicosSelecionados])
}
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

function criarEscala(dataInicio, numDiasSemana, medicosDisponiveis, diasDeFeriasPorMedico) {
  const escala = []
  const medicosAtribuidos = new Set()
  shuffleArray(medicosDisponiveis)

  const distribuirMedicos = (medicos, dataAtual, turno) => {
    const medicosDisponiveisNoTurno = medicos.filter(
      medico => !medicosAtribuidos.has(medico.split(':')[0])
    )

    if (medicosDisponiveisNoTurno.length > 0) {
      let medicoAtribuido = null

      // Organizar médicos por disponibilidade de férias
      medicosDisponiveisNoTurno.sort((a, b) => {
        const [medicoIDA, medicoNomeA] = a.split(':')
        const [medicoIDB, medicoNomeB] = b.split(':')
        const diasDeFeriasA = diasDeFeriasPorMedico[medicoIDA] || []
        const diasDeFeriasB = diasDeFeriasPorMedico[medicoIDB] || []

        return diasDeFeriasB.length - diasDeFeriasA.length
      })

      for (const medico of medicosDisponiveisNoTurno) {
        const [medicoID, medicoNome] = medico.split(':')
        const diasDeFerias = diasDeFeriasPorMedico[medicoID] || []

        // Verificar se o médico está de férias nesta data
        if (
          diasDeFerias.some(
            feriasDate => new Date(feriasDate).toDateString() === dataAtual.toDateString()
          )
        ) {
          console.log(`Médico em férias - ID: ${medicoID}, Nome: ${medicoNome}`)
          continue // Pular para o próximo médico se estiver de férias
        }

        medicoAtribuido = {
          turno: turno,
          medico: medicoID,
          dia: dataAtual,
          nomeMedico: medicoNome,
          diasDeFerias,
        }

        console.log(`Médico atribuído com sucesso.`)
        break // Atribuir o médico e sair do loop
      }

      if (medicoAtribuido) {
        medicosAtribuidos.add(medicoAtribuido.medico)
        escala.push(medicoAtribuido)
      }
    } else {
      console.log(
        `Não há médicos disponíveis para cobrir o turno ${turno} na data ${dataAtual.toDateString()}.`
      )
      return false // Não há médicos disponíveis, não atribuir e interromper a distribuição
    }

    return true // Médico atribuído com sucesso
  }

  // Distribuir médicos de férias no turno do dia
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'dia')) {
      throw new Error(
        `Não há médicos suficientes para cobrir o turno do dia na data ${dataAtual.toDateString()}.`
      )
    }
  }

  // Distribuir médicos de férias no turno da noite
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'noite')) {
      throw new Error(
        `Não há médicos suficientes para cobrir o turno da noite na data ${dataAtual.toDateString()}.`
      )
    }
  }

  // Verificar se os turnos obrigatórios foram preenchidos
  const diasTurnoDia = escala.filter(item => item.turno === 'dia')
  const diasTurnoNoite = escala.filter(item => item.turno === 'noite')

  if (diasTurnoDia.length < numDiasSemana || diasTurnoNoite.length < numDiasSemana) {
    throw new Error('Não há médicos suficientes para os turnos obrigatórios.')
  }

  // Distribuir médicos de férias no turno extra (j===2)
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'dia')) {
      console.log(
        'Não há médicos suficientes para o turno extra na data ${dataAtual.toDateString()}.'
      )
      break // Não há médicos para o turno extra, interromper a distribuição
    }
  }

  return escala
}

// Função para embaralhar um array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
router.get('/', async (req, res, next) => {
  const allEscalas = await Escala.find()

  res.render('escalas/all', { allEscalas })
})

router.get('/:escalaId', async (req, res) => {
  try {
    const escala = await Escala.findById(req.params.escalaId)

    if (!escala) {
      return res.status(404).json({ error: 'Escala não encontrada' })
    }
    res.render('escalas/visualizar', { escala })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao buscar detalhes da escala' })
  }
})

module.exports = router
