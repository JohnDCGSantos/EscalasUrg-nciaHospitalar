const express = require('express')
const Doctor = require('../models/Doctor.model')
const Escala = require('../models/Escala.model')
const router = express.Router()
const { isLoggedIn } = require('../middlewares/route-guard.middleware')
const { isAdmin } = require('../middlewares/route-guard.middleware')

const pdf = require('html-pdf')
const path = require('path')
const ejs = require('ejs')
const cheerio = require('cheerio')
// Rota para exibir o formulário de criação da escala
router.get('/criar', isLoggedIn, async (req, res) => {
  try {
    // Consultar base de dados para obter a lista de médicos disponíveis
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
const renderError = async (res, errorMessage) => {
  const doctors = await Doctor.find()
  res.status(404).render('escalas/nova', { errorMessage, doctors })
}
router.post('/criar', async (req, res) => {
  try {
    const dataInicioString = req.body.dataInicio
    const dataFimString = req.body.dataFim
    const dataInicio = new Date(dataInicioString)
    const dataFim = new Date(dataFimString)

    medicosSelecionados = req.body.medicos // Atualizar os médicos selecionados
    console.log('Medicos Selecionados:', medicosSelecionados) // Visualizar a estrutura dos médicos

    if (!medicosSelecionados || medicosSelecionados.length < 14) {
      const errorMessage = 'Selecione pelo menos 14 médicos para criar a escala.'
      const doctors = await Doctor.find()

      return res.render('escalas/nova', {
        errorMessage,
        doctors,
      })
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
      const dataInicioSemana = semana[0]
      const dataFimSemana = semana[semana.length - 1]
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
        diasDeFeriasPorMedico,
        res
      )

      escala.push(...escalaSemana)
    })

    const novaEscala = new Escala({
      dataInicio: new Date(dataInicioString),
      dataFim: dataFim,
      medicos: escala,
    })
    await novaEscala.save()
    res.redirect('/escala')
  } catch (error) {
    console.error(error)
    return res.status(500).render('escalas/nova', {
      errorMessage: 'Médicos insuficientes por motivos de férias.',
    })
  }
})

function calcularSemanas(dataInicio, dataFim) {
  const semanas = []
  let dataAtual = new Date(dataInicio)

  while (dataAtual <= dataFim) {
    const semana = []

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
  // Embaralhar os médicos para esta semana
  return shuffleArray([...medicosSelecionados])
}
let medicosSabado = []
function criarEscala(dataInicio, numDiasSemana, medicosDisponiveis, diasDeFeriasPorMedico, res) {
  const medicosAtribuidos = new Set()

  const escala = []
  //shuffleArray(medicosDisponiveis)
  function getWeekNumber(date) {
    const d = new Date(date.getFullYear(), 0, 1)
    const dayNum = date.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(d.getUTCFullYear(), 0, 1)
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  }

  const distribuirMedicos = (medicos, dataAtual, turno) => {
    let medicosDisponiveisNoTurno = medicos.filter(
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

        //ordenar pelos dias de férias da semana em questão
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
        const sabadoAnterior = new Date(dataAtual)
        sabadoAnterior.setDate(dataAtual.getDate() - 1) // Dia anterior

        const medicoNoSabadoAnterior = medicosSabado.find(
          medico =>
            medico.medico === medicoID &&
            medico.dia.toDateString() === sabadoAnterior.toDateString()
        )
        console.log('Médico do sábado anterior:', medicoNoSabadoAnterior)

        if (medicoNoSabadoAnterior) {
          console.log(
            `Médico de sábado não atribuído no domingo seguinte - ID: ${medicoID}, Nome: ${medicoNome}`
          )
          continue // Próximo médico
        }
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
            continue //  próximo médico
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

            continue //  próximo médico
          }
          console.log(`Médico em férias - ID: ${medicoID}, Nome: ${medicoNome}`)
          continue //  próximo médico, se estiver de férias
        }
        medicoAtribuido = {
          turno: turno,
          medico: medicoID,
          dia: dataAtual,
          nomeMedico: medicoNome,
          diasDeFerias,
        }
        medicosSabado.push(medicoAtribuido)

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

  // Distribuir médicos  no turno do dia
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'dia')) {
      return renderError(
        res,
        'Médicos insuficientes para os turnos obrigatórios: turno dia. Tenha em atenção as datas de férias dos médicos.'
      )
    }
  }

  // Distribuir médicos  no turno da noite
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'noite')) {
      return renderError(
        res,
        'Médicos insuficientes para os turnos obrigatórios: turno dia. Tenha em atenção as datas de férias dos médicos.'
      )
    }
  }

  // Verificar se os turnos obrigatórios foram preenchidos
  const diasTurnoDia = escala.filter(item => item.turno === 'dia')
  const diasTurnoNoite = escala.filter(item => item.turno === 'noite')

  if (diasTurnoDia.length < numDiasSemana || diasTurnoNoite.length < numDiasSemana) {
    return renderError(
      res,
      'Médicos insuficientes para os turnos obrigatórios: turno dia. Tenha em atenção as datas de férias dos médicos.'
    )
  }

  // Distribuir médicos  no turno extra dia hosp b (j===2)
  for (let i = 0; i < numDiasSemana; i++) {
    const dataAtual = new Date(dataInicio)
    dataAtual.setDate(dataAtual.getDate() + i)
    if (!distribuirMedicos(medicosDisponiveis, dataAtual, 'diaHospB')) {
      console.log(
        'Não há médicos suficientes para o turno extra na data ${dataAtual.toDateString()}.'
      )
      break // Não há médicos para o turno extra, interromper a distribuição
    }
  }
  // Distribuir médicos  no turno extra dia(j===2)
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
router.get('/', isLoggedIn, async (req, res, next) => {
  const allEscalas = await Escala.find()

  res.render('escalas/all', { allEscalas })
})

//rota para aceder a escala
router.get('/:escalaId', isLoggedIn, async (req, res) => {
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

//download pdf
router.get('/:escalaId/pdf', isLoggedIn, async (req, res) => {
  try {
    const escala = await Escala.findById(req.params.escalaId)

    if (!escala) {
      return res.status(404).json({ error: 'Escala não encontrada' })
    }

    // Gerar o HTML da tabela com o template EJS
    const html = await ejs.renderFile(path.join(__dirname, '../views/escalas/visualizar.ejs'), {
      escala,
    })

    // Extrair apenas a tabela do HTML com o Cheerio
    const $ = cheerio.load(html)
    const tableHtml = $('#tabelaMedicos').parent().html()

    // Configurações do PDF
    const pdfOptions = {
      format: 'Letter',
      border: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    }
    // Gerar  PDF
    pdf.create(tableHtml, pdfOptions).toBuffer((err, buffer) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Erro ao gerar o PDF' })
      }

      // Enviar  PDF como resposta
      res.setHeader('Content-Disposition', 'attachment; filename=escala.pdf')
      res.setHeader('Content-Type', 'application/pdf')
      res.send(buffer)
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao buscar detalhes da escala' })
  }
})

//rota para pagina delete da escala
router.get('/:id/delete', isAdmin, async (req, res) => {
  const escalaId = req.params.id

  try {
    const escala = await Escala.findById(escalaId)

    if (!escala) {
      return res.status(404).send('Escala não encontrada')
    }

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

    res.redirect('/escala')
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao excluir a escala')
  }
})

module.exports = router
