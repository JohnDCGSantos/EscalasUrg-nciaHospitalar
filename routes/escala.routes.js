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
  //shuffleArray(medicosDisponiveis)
  function getWeekNumber(date) {
    const d = new Date(date.getFullYear(), 0, 1)
    const dayNum = date.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(d.getUTCFullYear(), 0, 1)
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  }

  const distribuirMedicos = (medicos, dataAtual, turno) => {
    const medicosDisponiveisNoTurno = medicos.filter(
      medico => !medicosAtribuidos.has(medico.split(':')[0])
    )
    shuffleArray(medicosDisponiveisNoTurno)

    if (medicosDisponiveisNoTurno.length > 0) {
      let medicoAtribuido = null

      // Organizar médicos por disponibilidade de férias
      medicosDisponiveisNoTurno.sort((a, b) => {
        const [medicoIDA, medicoNomeA] = a.split(':')
        const [medicoIDB, medicoNomeB] = b.split(':')
        const diasDeFeriasA = diasDeFeriasPorMedico[medicoIDA] || []
        const diasDeFeriasB = diasDeFeriasPorMedico[medicoIDB] || []

        // Ajuste para ordenar pelos dias de férias da semana em questão
        const semanaAtual = getWeekNumber(dataAtual)
        const diasDeFeriasSemanaA = diasDeFeriasA.filter(
          feriasDate => getWeekNumber(new Date(feriasDate)) === semanaAtual
        )
        const diasDeFeriasSemanaB = diasDeFeriasB.filter(
          feriasDate => getWeekNumber(new Date(feriasDate)) === semanaAtual
        )

        return diasDeFeriasSemanaB.length - diasDeFeriasSemanaA.length
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
          // Verificar se o médico tem 3 ou mais dias de férias consecutivos na mesma semana
          if (temTresDiasConsecutivos(medicoID, dataAtual)) {
            console.log(
              `Médico com 3 ou mais dias de férias consecutivos na mesma semana - ID: ${medicoID}, Nome: ${medicoNome}`
            )

            // Excluir o médico da escala
            medicosAtribuidos.add(medicoID)
            continue // Pular para o próximo médico
          }
          // Verificar se o médico está de férias na sexta anterior ou na segunda seguinte
          const sextaAnterior = new Date(dataAtual)
          sextaAnterior.setDate(dataAtual.getDate() - ((dataAtual.getDay() + 2) % 7)) // Sexta é 5, então subtrai 2
          const segundaSeguinte = new Date(dataAtual)
          segundaSeguinte.setDate(dataAtual.getDate() + ((7 - dataAtual.getDay() + 1) % 7)) // Segunda é 1, então soma 1

          if (
            diasDeFerias.includes(sextaAnterior.toISOString()) &&
            diasDeFerias.includes(segundaSeguinte.toISOString())
          ) {
            console.log(
              `Médico de férias na sexta anterior e segunda seguinte - ID: ${medicoID}, Nome: ${medicoNome}`
            )

            // Excluir o médico da escala
            medicosAtribuidos.add(medicoID)
            console.log(`Médico excluído da escala por estar de férias na sexta e segunda.`)

            continue // Pular para o próximo médico
          }
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

  const getDiasFeriasSemana = (medicoID, semanaAtual) => {
    const diasFerias = diasDeFeriasPorMedico[medicoID] || []
    return diasFerias.filter(feriasDate => getWeekNumber(new Date(feriasDate)) === semanaAtual)
  }

  const temTresDiasConsecutivos = (medicoID, dataInicio) => {
    const semanaInicio = getWeekNumber(dataInicio)

    for (let semana = semanaInicio; semana <= semanaInicio + 1; semana++) {
      const diasFeriasSemana = getDiasFeriasSemana(medicoID, semana)

      // Ordenar os dias de férias na semana
      diasFeriasSemana.sort((a, b) => new Date(a) - new Date(b))

      // Verificar se há 3 ou mais dias consecutivos
      let diasConsecutivos = 1

      for (let i = 1; i < diasFeriasSemana.length; i++) {
        const current = new Date(diasFeriasSemana[i])
        const prev = new Date(diasFeriasSemana[i - 1])

        const diffTime = Math.abs(current - prev)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        diasConsecutivos = diffDays === 1 ? diasConsecutivos + 1 : 1

        if (diasConsecutivos >= 3) {
          return true
        }
      }
    }

    return false
  }

  // Distribuir médicos de férias no turno do dia
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'dia')) {
      throw new Error(`Não há médicos suficientes para os turnos obrigatórios.`)
    }
  }

  // Distribuir médicos de férias no turno da noite
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'noite')) {
      throw new Error(`Não há médicos suficientes para os turnos obrigatórios.`)
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

router.get('/:id/delete', async (req, res) => {
  const escalaId = req.params.id

  try {
    // Encontrar a escala pelo ID
    const escala = await Escala.findById(escalaId)

    if (!escala) {
      return res.status(404).send('Escala não encontrada')
    }

    // Renderizar a página de confirmação de exclusão
    res.render('escalas/delete', { escala })
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao obter informações da escala')
  }
})

// Rota para processar a exclusão da escala
router.post('/:id/delete', async (req, res) => {
  const escalaId = req.params.id

  try {
    // Excluir a escala pelo ID
    await Escala.findByIdAndDelete(escalaId)

    // Redirecionar para a lista de escalas ou qualquer outra página desejada
    res.redirect('/escala')
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao excluir a escala')
  }
})

module.exports = router
